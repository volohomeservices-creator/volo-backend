import {
  getAuth,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  Auth,
  initializeRecaptchaConfig,
} from 'firebase/auth';
import { firebaseApp } from './firebase-app';

// ---------------------------------------------------------------------------
// 1. Firebase App + Auth initialization
// ---------------------------------------------------------------------------
const firebaseAuth = getAuth(firebaseApp);

// ---------------------------------------------------------------------------
// 2. Initialize reCAPTCHA Enterprise config (lazy with timeout guard)
//    Firebase Console has reCAPTCHA Enterprise with web site key "volohome-phone-auth".
//    This is called lazily on-demand with a strict timeout guard to prevent
//    unhandled "reCAPTCHA Timeout (b)" exceptions or hanging chunk loads.
// ---------------------------------------------------------------------------
let recaptchaConfigReady: Promise<void> | null = null;

export async function ensureRecaptchaConfig(): Promise<void> {
  if (typeof window === 'undefined') return;

  const isBypass =
    process.env.NEXT_PUBLIC_ALLOW_RECAPTCHA_BYPASS === 'true' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isBypass) {
    return;
  }

  if (!recaptchaConfigReady) {
    recaptchaConfigReady = new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('[Firebase] reCAPTCHA Enterprise config timed out; proceeding with standard verifier');
        resolve();
      }, 3500);

      try {
        initializeRecaptchaConfig(firebaseAuth)
          .then(() => {
            clearTimeout(timeoutId);
            console.log('[Firebase] reCAPTCHA Enterprise config loaded successfully');
            resolve();
          })
          .catch((err) => {
            clearTimeout(timeoutId);
            console.warn('[Firebase] reCAPTCHA Enterprise config failed:', err);
            resolve();
          });
      } catch (err) {
        clearTimeout(timeoutId);
        console.warn('[Firebase] initializeRecaptchaConfig invocation error:', err);
        resolve();
      }
    });
  }

  return recaptchaConfigReady;
}

export { firebaseApp, firebaseAuth };

// ---------------------------------------------------------------------------
// 3. RecaptchaManager — MINIMAL wrapper
//    CRITICAL: Do NOT purge window.grecaptcha, scripts, or iframes.
//    Firebase manages its own reCAPTCHA Enterprise lifecycle internally.
// ---------------------------------------------------------------------------
class RecaptchaManager {
  private static instance: RecaptchaVerifier | null = null;
  private static containerId = 'firebase-recaptcha-container';
  private static isSending = false;

  static async getOrCreate(auth: Auth): Promise<RecaptchaVerifier> {
    if (typeof window === 'undefined') {
      throw new Error('Client only');
    }

    // Wait for Enterprise config (lazy with timeout safety) before creating verifier
    await ensureRecaptchaConfig();

    // If we already have a valid instance, return it
    if (this.instance) {
      return this.instance;
    }

    // Ensure a fresh container exists
    let container = document.getElementById(this.containerId);
    if (container) {
      container.remove();
    }
    container = document.createElement('div');
    container.id = this.containerId;
    document.body.appendChild(container);

    console.log('[Phone Auth] Creating RecaptchaVerifier (Enterprise mode)');
    this.instance = new RecaptchaVerifier(auth, container, {
      size: 'invisible',
      callback: () => {
        console.log('[Phone Auth] reCAPTCHA solved');
      },
      'expired-callback': () => {
        console.log('[Phone Auth] reCAPTCHA expired');
        this.reset();
      },
    });

    return this.instance;
  }

  static reset(): void {
    if (this.instance) {
      try {
        this.instance.clear();
      } catch (_) {
        // ignore
      }
      this.instance = null;
    }
    const container = document.getElementById(this.containerId);
    if (container) container.remove();
    console.log('[Phone Auth] RecaptchaVerifier reset');
  }

  static get sending() { return this.isSending; }
  static set sending(v: boolean) { this.isSending = v; }
}

// ---------------------------------------------------------------------------
// 4. Phone OTP API
// ---------------------------------------------------------------------------

export async function initializePhoneAuth(): Promise<void> {
  await ensureRecaptchaConfig();
}

export async function cleanupPhoneAuth(): Promise<void> {
  RecaptchaManager.reset();
}

export async function sendOtp(phone: string): Promise<ConfirmationResult> {
  if (typeof window === 'undefined') {
    throw new Error('Client only');
  }
  if (RecaptchaManager.sending) {
    throw new Error('OTP_IN_PROGRESS');
  }

  RecaptchaManager.sending = true;
  console.log('[Phone Auth] Sending OTP to:', phone);

  try {
    const verifier = await RecaptchaManager.getOrCreate(firebaseAuth);
    const confirmationResult = await signInWithPhoneNumber(firebaseAuth, phone, verifier);
    console.log('[Phone Auth] OTP sent successfully');
    return confirmationResult;
  } catch (error: any) {
    console.error('[Phone Auth] OTP Error during send:', error?.code, error?.message);
    RecaptchaManager.reset();
    throw error;
  } finally {
    RecaptchaManager.sending = false;
  }
}

export async function verifyOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<string> {
  if (!confirmationResult || typeof confirmationResult.confirm !== 'function') {
    throw new Error('Invalid ConfirmationResult. Request a new OTP.');
  }

  console.log('[Phone Auth] Verifying OTP...');
  const result = await confirmationResult.confirm(otp);
  if (!result.user) throw new Error('OTP verification failed');

  console.log('[Phone Auth] OTP Verified');
  RecaptchaManager.reset();
  return result.user.getIdToken();
}

// ---------------------------------------------------------------------------
// 5. Legacy exports
// ---------------------------------------------------------------------------
export function getOrCreateRecaptchaVerifier(): RecaptchaVerifier {
  return RecaptchaManager.getOrCreate(firebaseAuth) as any;
}

export function cleanupRecaptchaVerifier(): void {
  RecaptchaManager.reset();
}
