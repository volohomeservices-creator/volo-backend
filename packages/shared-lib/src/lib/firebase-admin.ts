import 'server-only';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { validateEnv } from './env';

// Ensure standard validation is triggered
validateEnv();

// Lazy initialization helper for Firebase Admin
export function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Avoid noisy initialization during Next.js production build phase
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  // Support full JSON service account credentials if provided
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson && (!projectId || !clientEmail || !privateKey)) {
    try {
      const parsed = JSON.parse(serviceAccountJson);
      const app = initializeApp({
        credential: cert(parsed),
      });
      console.log('[Firebase Admin] Initialized via FIREBASE_SERVICE_ACCOUNT JSON for project:', parsed.project_id);
      return app;
    } catch (e: any) {
      console.error('[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e?.message || e);
    }
  }

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase Admin] Initialization skipped: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY must be configured.');
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
  const apps = getApps();
  const initialized = apps.length > 0;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || (initialized ? (apps[0].options as any)?.projectId : null);
  const hasClientEmail = !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const hasPrivateKey = !!process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const privateKeyLength = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.length || 0;

  return {
    initialized,
    projectId: projectId || null,
    hasClientEmail,
    hasPrivateKey,
    privateKeyLength,
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
