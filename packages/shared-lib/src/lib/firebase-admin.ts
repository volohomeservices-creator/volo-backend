import 'server-only';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { validateEnv } from './env';

// Ensure standard validation is triggered
validateEnv();

import fs from 'fs';
import path from 'path';

// Helper to resolve environment variables case-insensitively and across alias names
export function resolveEnvVar(...keys: string[]): string | undefined {
  for (const k of keys) {
    const val = process.env[k];
    if (val && typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }
  const envKeys = Object.keys(process.env);
  for (const k of keys) {
    const found = envKeys.find(ek => ek.toLowerCase() === k.toLowerCase());
    if (found) {
      const val = process.env[found];
      if (val && typeof val === 'string' && val.trim() !== '') {
        return val.trim();
      }
    }
  }
  return undefined;
}

// Fallback loader for .env files on hosting providers (like Hostinger Node.js standalone)
export function loadEnvFromFileSystem() {
  if (typeof window !== 'undefined') return;

  const candidateDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
    path.resolve(__dirname, '../../../..'),
    path.resolve(__dirname, '../../../../..'),
    '/home/u583926561/domains/api.voloapp.in/public_html',
    '/home/u583926561/domains/api.voloapp.in/hbuilds/source/repository',
  ];

  const envFilenames = ['.env.production.local', '.env.local', '.env.production', '.env'];

  for (const dir of candidateDirs) {
    for (const filename of envFilenames) {
      try {
        const filePath = path.join(dir, filename);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i].trim();
            if (!rawLine || rawLine.startsWith('#')) continue;
            const eqIndex = rawLine.indexOf('=');
            if (eqIndex > 0) {
              const key = rawLine.slice(0, eqIndex).trim().replace(/^export\s+/, '');
              let val = rawLine.slice(eqIndex + 1).trim();

              // Handle multiline quoted strings (e.g., multiline RSA private keys)
              if ((val.startsWith('"') && !val.endsWith('"')) || (val.startsWith("'") && !val.endsWith("'"))) {
                const quoteChar = val[0];
                let multilineVal = val.slice(1);
                while (++i < lines.length) {
                  const nextLine = lines[i];
                  if (nextLine.trim().endsWith(quoteChar)) {
                    multilineVal += '\n' + nextLine.trim().slice(0, -1);
                    break;
                  } else {
                    multilineVal += '\n' + nextLine;
                  }
                }
                val = multilineVal;
              } else if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }

              if (!process.env[key] || process.env[key]?.trim() === '') {
                process.env[key] = val;
              }
            }
          }
        }
      } catch (err) {
        // Ignore file read error and continue
      }
    }
  }
}

// Lazy initialization helper for Firebase Admin
export function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Avoid noisy initialization during Next.js production build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  // Attempt to load from disk if runtime environment is missing variables
  loadEnvFromFileSystem();

  let projectId = resolveEnvVar(
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  );
  let clientEmail = resolveEnvVar(
    'FIREBASE_ADMIN_CLIENT_EMAIL',
    'FIREBASE_CLIENT_EMAIL'
  );
  let privateKey = resolveEnvVar(
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_PRIVATE_KEY'
  );

  // Support full JSON service account credentials if provided
  const serviceAccountJson = resolveEnvVar(
    'FIREBASE_SERVICE_ACCOUNT',
    'FIREBASE_CREDENTIALS',
    'GOOGLE_APPLICATION_CREDENTIALS_JSON'
  );
  if (serviceAccountJson && (!projectId || !clientEmail || !privateKey)) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      const app = initializeApp({
        credential: cert(parsed),
      });
      console.log('[Firebase Admin] Initialized via JSON credentials for project:', parsed.project_id);
      return app;
    } catch (e: any) {
      console.error('[Firebase Admin] Failed to parse service account JSON:', e?.message || e);
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase Admin] Initialization skipped: Missing credentials. Project:', projectId, 'Email:', !!clientEmail, 'Key:', !!privateKey);
    return null;
  }

  try {
    // Robustly clean and normalize private key formatting
    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    const formattedPrivateKey = privateKey
      .replace(/\\n/g, '\n')
      .replace(/\r\n/g, '\n')
      .trim();

    const app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
    console.log('[Firebase Admin] Initialization successful via service account certificate for project:', projectId);
    return app;
  } catch (error: any) {
    console.error('[Firebase Admin] Fatal error initializing SDK:', error?.message || error);
    throw error;
  }
}

// Attempt initial startup load (non-blocking)
try {
  initFirebaseAdmin();
} catch (e) {
  // Ignored on module evaluation; will retry lazily on first API request
}

export function getFirebaseAdminStatus() {
  if (!getApps().length) {
    try {
      initFirebaseAdmin();
    } catch {}
  }

  const apps = getApps();
  const initialized = apps.length > 0;
  const projectId = resolveEnvVar('FIREBASE_ADMIN_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID') || (initialized ? (apps[0].options as any)?.projectId : null);
  const hasClientEmail = !!resolveEnvVar('FIREBASE_ADMIN_CLIENT_EMAIL', 'FIREBASE_CLIENT_EMAIL');
  const privateKey = resolveEnvVar('FIREBASE_ADMIN_PRIVATE_KEY', 'FIREBASE_PRIVATE_KEY');
  const hasPrivateKey = !!privateKey;
  const privateKeyLength = privateKey?.length || 0;

  const detectedMatchingEnvKeys = Object.keys(process.env).filter(k => 
    k.toUpperCase().includes('FIREBASE') || 
    k.toUpperCase().includes('SUPABASE') ||
    k.toUpperCase().includes('SECRET')
  );

  return {
    initialized,
    projectId: projectId || null,
    hasClientEmail,
    hasPrivateKey,
    privateKeyLength,
    detectedMatchingEnvKeys,
  };
}

export const getAdminAuth = () => {
  if (!getApps().length) {
    initFirebaseAdmin();
  }
  if (!getApps().length) {
    throw new Error('Firebase Admin app is not initialized. Check FIREBASE_ADMIN_* env vars on server.');
  }
  return getAuth();
};

export const getAdminMessaging = () => {
  if (!getApps().length) {
    initFirebaseAdmin();
  }
  if (!getApps().length) {
    throw new Error('Firebase Admin app is not initialized. Check FIREBASE_ADMIN_* env vars on server.');
  }
  return getMessaging();
};

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    const auth = getAdminAuth();
    const val = (auth as any)[prop];
    return typeof val === 'function' ? val.bind(auth) : val;
  }
});

export const adminMessaging = new Proxy({} as ReturnType<typeof getMessaging>, {
  get(_target, prop) {
    const messaging = getAdminMessaging();
    const val = (messaging as any)[prop];
    return typeof val === 'function' ? val.bind(messaging) : val;
  }
});

export async function verifyFirebaseToken(idToken: string) {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      phone_number: decodedToken.phone_number || '',
    };
  } catch (error: any) {
    console.error('[Firebase Admin] Token verification failed:', error?.code || error?.message || error);
    const err = new Error(error?.message || 'FIREBASE_TOKEN_INVALID');
    (err as any).code = error?.code || 'auth/invalid-token';
    throw err;
  }
}
