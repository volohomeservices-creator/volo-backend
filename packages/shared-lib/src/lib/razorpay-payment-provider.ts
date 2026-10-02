import 'server-only';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import {
  IPaymentProvider,
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerificationRequest,
  PaymentRefundRequest,
  PaymentRefundResponse
} from './payment-provider';

function getCredentials() {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!keyId || !keySecret || keyId.includes('placeholder') || keySecret.includes('placeholder')) {
    throw new Error('Razorpay keys are not configured');
  }
  return { keyId, keySecret };
}

function getClient() {
  const { keyId, keySecret } = getCredentials();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export class RazorpayPaymentProvider implements IPaymentProvider {
  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const client = getClient();
    const order = await client.orders.create({
      amount: Math.round(request.amount),
      currency: request.currency || 'INR',
      receipt: request.receiptId.slice(0, 40),
      notes: request.notes,
    });

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
      status: order.status,
    };
  }

  async verifyPayment(request: PaymentVerificationRequest): Promise<boolean> {
    const { keySecret } = getCredentials();
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${request.orderId}|${request.paymentId}`)
      .digest('hex');
    return expected === request.signature;
  }

  async refundPayment(request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    const client = getClient();
    const refund = await client.payments.refund(request.paymentId, {
      ...(request.amount ? { amount: Math.round(request.amount) } : {}),
      ...(request.notes ? { notes: request.notes } : {}),
    });
    return {
      id: refund.id,
      status: refund.status,
    };
  }
}

export const paymentProvider = new RazorpayPaymentProvider();
