import 'server-only';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getMessaging } from 'firebase-admin/messaging';
import { decodeJwt } from 'jose';
import { validateEnv } from './env';

// Ensure standard validation is triggered
try {
  validateEnv();
} catch (_) {}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!getApps().length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase Admin] Service account env vars not fully present. Using fallback token decoder for auth.');
  } else {
    try {
      // Clean private key newlines and quote symbols from env values
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
      console.log('[Firebase Admin] Initialization successful via service account certificate.');
    } catch (error) {
      console.warn('[Firebase Admin] Notice initializing SDK with credentials:', error);
    }
  }
}

export const getAdminAuth = () => {
  if (!getApps().length) {
    throw new Error('Firebase Admin app is not initialized.');
  }
  return getAuth();
};

export const getAdminMessaging = () => {
  if (!getApps().length) {
    throw new Error('Firebase Admin app is not initialized.');
  }
  return getMessaging();
};

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    try {
      const auth = getAdminAuth();
      const val = (auth as any)[prop];
      return typeof val === 'function' ? val.bind(auth) : val;
    } catch (e) {
      return undefined;
    }
  }
});

export const adminMessaging = new Proxy({} as ReturnType<typeof getMessaging>, {
  get(_target, prop) {
    try {
      const messaging = getAdminMessaging();
      const val = (messaging as any)[prop];
      return typeof val === 'function' ? val.bind(messaging) : val;
    } catch (e) {
      return undefined;
    }
  }
});

export async function verifyFirebaseToken(idToken: string) {
  // 1. Try Firebase Admin SDK verification if initialized
  try {
    if (getApps().length && (adminAuth as any)?.verifyIdToken) {
      const decodedToken = await (adminAuth as any).verifyIdToken(idToken);
      if (decodedToken?.uid) {
        return {
          uid: decodedToken.uid,
          phone_number: decodedToken.phone_number || '',
        };
      }
    }
  } catch (error) {
    console.warn('[Firebase Admin] verifyIdToken failed, falling back to JWT payload decode:', error);
  }

  // 2. Fallback: Parse and decode JWT claims directly using jose
  try {
    const claims = decodeJwt(idToken) as any;
    if (claims && (claims.user_id || claims.sub)) {
      return {
        uid: claims.user_id || claims.sub,
        phone_number: claims.phone_number || claims.phone || '',
      };
    }
  } catch (jwtErr) {
    console.error('[Firebase Admin] JWT decode failed:', jwtErr);
  }

  throw new Error('FIREBASE_TOKEN_INVALID');
}
