import Razorpay from 'razorpay';

export function createRazorpayClient() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret) {
    throw new Error('Razorpay keys are not configured');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
