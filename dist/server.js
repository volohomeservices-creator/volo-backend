"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_path3 = __toESM(require("path"));
var import_dotenv2 = __toESM(require("dotenv"));
var import_express2 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_helmet = __toESM(require("helmet"));
var import_express_rate_limit = __toESM(require("express-rate-limit"));
var import_cookie_parser = __toESM(require("cookie-parser"));

// src/lib/route-loader.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_url = require("url");
var import_express = require("express");

// src/shims/next-server.ts
var NextRequest = class extends Request {
  constructor(input, init) {
    super(input, init);
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    this.nextUrl = new URL(urlStr);
    const cookieHeader = this.headers.get("cookie") || "";
    const parsedCookies = parseCookieHeader(cookieHeader);
    this.cookies = {
      get: (name) => {
        const val = parsedCookies[name];
        return val !== void 0 ? { name, value: val } : void 0;
      },
      getAll: () => Object.entries(parsedCookies).map(([name, value]) => ({ name, value })),
      has: (name) => name in parsedCookies
    };
  }
};
function parseCookieHeader(cookieHeader) {
  const result = {};
  if (!cookieHeader) return result;
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch (e) {
        result[key] = val;
      }
    }
  }
  return result;
}

// src/lib/express-adapter.ts
function createWebRequest(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:5000";
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== void 0) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }
  const method = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(method);
  let body = void 0;
  if (hasBody) {
    if (req.rawBody) {
      body = req.rawBody;
    } else if (req.body) {
      if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
        body = req.body;
      } else if (Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
      }
    }
  }
  const init = {
    method,
    headers,
    body,
    duplex: "half"
  };
  return new NextRequest(fullUrl, init);
}
async function sendWebResponse(webRes, res) {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== "content-length" && lower !== "set-cookie") {
      res.setHeader(key, value);
    }
  });
  const getSetCookie = webRes.headers.getSetCookie;
  if (typeof getSetCookie === "function") {
    const cookies = getSetCookie.call(webRes.headers);
    if (Array.isArray(cookies) && cookies.length > 0) {
      res.setHeader("Set-Cookie", cookies);
    }
  } else {
    const singleCookie = webRes.headers.get("set-cookie");
    if (singleCookie) {
      res.setHeader("Set-Cookie", singleCookie);
    }
  }
  const arrayBuffer = await webRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  res.setHeader("Content-Length", buffer.length);
  res.end(buffer);
}
function adaptRoute(routeModule) {
  return async (req, res, next) => {
    const method = req.method.toUpperCase();
    const handler = routeModule[method];
    if (!handler || typeof handler !== "function") {
      if (method === "OPTIONS") {
        const supported = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"].filter(
          (m) => typeof routeModule[m] === "function"
        );
        res.setHeader("Allow", supported.join(", "));
        return res.status(204).end();
      }
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
    try {
      const webReq = createWebRequest(req);
      const context = {
        params: Object.assign(Promise.resolve(__spreadValues({}, req.params)), __spreadValues({}, req.params))
      };
      const webRes = await handler(webReq, context);
      await sendWebResponse(webRes, res);
    } catch (err) {
      console.error(`[API Error] ${method} ${req.originalUrl}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: (err == null ? void 0 : err.message) || "Internal Server Error" });
      } else {
        next(err);
      }
    }
  };
}

// src/lib/route-loader.ts
function toExpressPath(relativePath) {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  let isCatchAll = false;
  let isDynamic = false;
  const convertedSegments = segments.map((seg) => {
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      isCatchAll = true;
      const paramName = seg.slice(4, -1) || "slug";
      return `{*${paramName}}`;
    }
    if (seg.startsWith("[") && seg.endsWith("]")) {
      isDynamic = true;
      const paramName = seg.slice(1, -1);
      return `:${paramName}`;
    }
    return seg;
  });
  const expressPath = "/api/" + convertedSegments.join("/");
  return { expressPath, isCatchAll, isDynamic };
}
function discoverRoutes(dir, baseDir) {
  const entries = [];
  if (!import_fs.default.existsSync(dir)) return entries;
  const items = import_fs.default.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = import_path.default.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === "__tests__" || item.name.startsWith(".")) continue;
      entries.push(...discoverRoutes(fullPath, baseDir));
    } else if (item.isFile() && (item.name === "route.ts" || item.name === "route.js")) {
      const relDir = import_path.default.relative(baseDir, dir);
      const { expressPath, isCatchAll, isDynamic } = toExpressPath(relDir);
      const depth = expressPath.split("/").filter(Boolean).length;
      entries.push({
        filePath: fullPath,
        expressPath,
        depth,
        isCatchAll,
        isDynamic
      });
    }
  }
  return entries;
}
function sortRoutes(routes) {
  return routes.sort((a, b) => {
    if (a.isCatchAll && !b.isCatchAll) return 1;
    if (!a.isCatchAll && b.isCatchAll) return -1;
    if (!a.isDynamic && b.isDynamic) return -1;
    if (a.isDynamic && !b.isDynamic) return 1;
    if (a.depth !== b.depth) {
      return b.depth - a.depth;
    }
    return a.expressPath.localeCompare(b.expressPath);
  });
}
async function loadApiRoutes(apiDir) {
  const router = (0, import_express.Router)();
  const rawRoutes = discoverRoutes(apiDir, apiDir);
  const sortedRoutes = sortRoutes(rawRoutes);
  let registeredCount = 0;
  for (const route of sortedRoutes) {
    try {
      const fileUrl = (0, import_url.pathToFileURL)(route.filePath).href;
      const routeModule = await import(fileUrl);
      router.all(route.expressPath, adaptRoute(routeModule));
      registeredCount++;
    } catch (err) {
      console.error(`\u274C Failed to register route ${route.expressPath} (${route.filePath}):`, err);
    }
  }
  return { router, count: registeredCount };
}

// src/env.ts
var import_path2 = __toESM(require("path"));
var import_dotenv = __toESM(require("dotenv"));
var import_zod = require("zod");
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../.env.local") });
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../.env") });
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../../../.env.local") });
import_dotenv.default.config({ path: import_path2.default.resolve(__dirname, "../../../.env") });
var envSchema = import_zod.z.object({
  NEXT_PUBLIC_SUPABASE_URL: import_zod.z.string().min(1, "Missing NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: import_zod.z.string().min(1, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: import_zod.z.string().min(1, "Missing SUPABASE_SERVICE_ROLE_KEY"),
  NEXT_PUBLIC_FIREBASE_API_KEY: import_zod.z.string().min(1, "Missing NEXT_PUBLIC_FIREBASE_API_KEY"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: import_zod.z.string().min(1, "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: import_zod.z.string().min(1, "Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY")
});
var parsedEnv = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
});
if (!parsedEnv.success) {
  console.error("\u274C Invalid environment variables:", parsedEnv.error.format());
  if (process.env.NODE_ENV !== "test" && !process.env.CI && !process.env.NEXT_PHASE) {
    throw new Error("Invalid environment variables");
  }
}
var env = parsedEnv.success ? parsedEnv.data : process.env;

// src/server.ts
import_dotenv2.default.config({ path: import_path3.default.resolve(__dirname, "../.env.local") });
import_dotenv2.default.config({ path: import_path3.default.resolve(__dirname, "../.env") });
import_dotenv2.default.config({ path: import_path3.default.resolve(__dirname, "../../../.env.local") });
import_dotenv2.default.config({ path: import_path3.default.resolve(__dirname, "../../../.env") });
var app = (0, import_express2.default)();
var PORT = parseInt(process.env.PORT || "5000", 10);
var HOST = process.env.HOST || "0.0.0.0";
app.set("trust proxy", 1);
app.use(
  (0, import_helmet.default)({
    contentSecurityPolicy: false,
    // Prevents breaking cross-origin API calls & WebSockets
    crossOriginEmbedderPolicy: false
  })
);
var defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:8081",
  "http://localhost:19006",
  "https://voloapp.in",
  "https://www.voloapp.in",
  "https://admin.voloapp.in"
];
var envAllowed = (process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
var allowedOrigins = [.../* @__PURE__ */ new Set([...defaultOrigins, ...envAllowed])];
app.use(
  (0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== "production" && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:") || origin.startsWith("http://192.168.") || origin.startsWith("http://10."))) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "X-CSRF-Token",
      "X-Requested-With",
      "Accept",
      "Accept-Version",
      "Content-Length",
      "Content-MD5",
      "Content-Type",
      "Date",
      "X-Api-Version",
      "Authorization",
      "x-razorpay-signature"
    ]
  })
);
app.use(
  import_express2.default.json({
    limit: "15mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(import_express2.default.urlencoded({ extended: true, limit: "15mb" }));
app.use((0, import_cookie_parser.default)());
var apiLimiter = (0, import_express_rate_limit.default)({
  windowMs: 1 * 60 * 1e3,
  // 1 minute
  max: 200,
  // 200 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too Many Requests, please try again later." }
});
var authLimiter = (0, import_express_rate_limit.default)({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 50,
  // 50 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." }
});
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "test") {
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});
async function bootstrap() {
  const candidateDirs = [
    import_path3.default.resolve(__dirname, "app/api"),
    import_path3.default.resolve(__dirname, "src/app/api"),
    import_path3.default.resolve(process.cwd(), "dist/app/api"),
    import_path3.default.resolve(process.cwd(), "src/app/api")
  ];
  const apiDir = candidateDirs.find((d) => fs.existsSync(d)) || candidateDirs[0];
  console.log(`[Init] Scanning API routes in: ${apiDir}`);
  const { router, count } = await loadApiRoutes(apiDir);
  app.use(router);
  console.log(`[Init] Successfully loaded ${count} API routes.`);
  app.use("/api", (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
  });
  app.get("/", (_req, res) => {
    res.json({
      name: "Volo Backend API",
      status: "UP",
      port: PORT,
      loadedRoutes: count,
      apiDir,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.use((err, _req, res, _next) => {
    console.error("[Unhandled Server Error]:", err);
    res.status(500).json({ error: (err == null ? void 0 : err.message) || "Internal Server Error" });
  });
  const server = app.listen(PORT, HOST, () => {
    console.log(`=========================================`);
    console.log(`\u{1F680} Volo Node.js Backend Server Active!`);
    console.log(`\u{1F4E1} URL: http://${HOST}:${PORT}`);
    console.log(`\u23F1\uFE0F Mode: ${process.env.NODE_ENV || "development"}`);
    console.log(`=========================================`);
  });
  return server;
}
if (process.env.NODE_ENV !== "test") {
  bootstrap().catch((err) => {
    console.error("\u274C Fatal error bootstrapping backend server:", err);
    process.exit(1);
  });
}
var server_default = app;
