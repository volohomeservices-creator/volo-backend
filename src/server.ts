import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Module from 'module';

// Intercept server-only in pure Node.js so shared-lib imports succeed unconditionally
const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return originalRequire.apply(this, [id, ...args]);
};

// Load local and workspace environment variables before importing anything else
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { loadApiRoutes } from './lib/route-loader';

// Validate core environment
import './env';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// 1. Trust proxy (Crucial for Hostinger reverse proxies, Nginx, Cloudflare, accurate client IP)
app.set('trust proxy', 1);

// 2. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Prevents breaking cross-origin API calls & WebSockets
    crossOriginEmbedderPolicy: false,
  })
);

// 3. CORS Configuration
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:8081',
  'http://localhost:19006',
  'https://voloapp.in',
  'https://www.voloapp.in',
  'https://admin.voloapp.in',
];

const envAllowed = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envAllowed])];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // In development or local network, allow localhost and private IPs
      if (
        process.env.NODE_ENV !== 'production' &&
        (origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.'))
      ) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'X-CSRF-Token',
      'X-Requested-With',
      'Accept',
      'Accept-Version',
      'Content-Length',
      'Content-MD5',
      'Content-Type',
      'Date',
      'X-Api-Version',
      'Authorization',
      'x-razorpay-signature',
    ],
  })
);

// 4. Body Parsers with Raw Body Preservation (Mandatory for Razorpay HMAC signature verification)
app.use(
  express.json({
    limit: '15mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// 5. Rate Limiting (Fast In-Memory Protection)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// 6. Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// 7. Mount API Routes dynamically from src/app/api
async function bootstrap() {
  const candidateDirs = [
    path.resolve(__dirname, 'app/api'),
    path.resolve(__dirname, 'src/app/api'),
    path.resolve(process.cwd(), 'dist/app/api'),
    path.resolve(process.cwd(), 'src/app/api'),
  ];
  const apiDir = candidateDirs.find((d) => fs.existsSync(d)) || candidateDirs[0];
  console.log(`[Init] Scanning API routes in: ${apiDir}`);

  const { router, count, discovered, errors } = await loadApiRoutes(apiDir);
  app.use(router);
  console.log(`[Init] Successfully loaded ${count}/${discovered} API routes.`);

  // 404 handler for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });

  // Root health probe
  app.get('/', (_req, res) => {
    res.json({
      name: 'Volo Backend API',
      status: 'UP',
      port: PORT,
      loadedRoutes: count,
      discoveredRoutes: discovered,
      failedRoutesCount: errors.length,
      routeErrors: errors.slice(0, 10),
      apiDir,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Unhandled Server Error]:', err);
    res.status(500).json({ error: err?.message || 'Internal Server Error' });
  });

  // Start Server
  const server = app.listen(PORT, HOST, () => {
    console.log(`=========================================`);
    console.log(`🚀 Volo Node.js Backend Server Active!`);
    console.log(`📡 URL: http://${HOST}:${PORT}`);
    console.log(`⏱️ Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=========================================`);
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('❌ Fatal error bootstrapping backend server:', err);
    process.exit(1);
  });
}

export default app;
