import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { captureOnlinePayment } from '@/lib/payment-service';
import { startAssignment } from '@/lib/assignment-engine';
import { dispatchNotification } from '@/lib/notification-dispatcher';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing Razorpay payment fields' }, { status: 400 });
    }

    const result = await captureOnlinePayment({
      customerId: session.user_id,
      orderId,
      paymentId,
      signature,
    });

    if (!result.success || !result.bookingId) {
      return NextResponse.json({ error: result.error || 'Payment verification failed' }, { status: 400 });
    }

    if (!result.alreadyProcessed) {
      startAssignment(result.bookingId).catch((err) => {
        console.error('Assignment start after payment verify failed:', err);
      });
      await dispatchNotification({
        userId: session.user_id,
        type: 'BOOKING_CREATED',
        title: 'Payment received',
        body: 'Your payment is confirmed. We are assigning a technician.',
      });
    }

    return NextResponse.json({ success: true, bookingId: result.bookingId });
  } catch (error: any) {
    console.error('Payment verify error:', error.message || error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
