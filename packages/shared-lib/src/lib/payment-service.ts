import 'server-only';
import { supabaseAdmin } from './supabase-server';
import { logAuditAction } from './audit';
import { paymentProvider } from './razorpay-payment-provider';
import { calculateCommission } from './commission-engine';
import { deductCommission } from './wallet-engine';
import { AuditAction, PaymentStatus, PaymentMode } from '@/types';

export async function createOnlinePayment(
  bookingId: string,
  customerId: string,
  amount: number
): Promise<{
  success: boolean;
  error?: string;
  checkout?: { keyId: string; orderId: string; amount: number; currency: string };
}> {
  try {
    const order = await paymentProvider.createOrder({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receiptId: bookingId,
      notes: { booking_id: bookingId, customer_id: customerId },
    });

    const { data: payment, error: paymentErr } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: bookingId,
        customer_id: customerId,
        payment_mode: 'ONLINE',
        status: 'PENDING',
        amount: amount,
        razorpay_order_id: order.id,
      })
      .select('id')
      .single();

    if (paymentErr || !payment) {
      throw paymentErr || new Error('Failed to create payment record');
    }

    await supabaseAdmin.from('payment_attempts').insert({
      payment_id: payment.id,
      status: 'CREATED',
      response: { order_id: order.id },
    });

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    if (!keyId) {
      throw new Error('Razorpay key id is not configured');
    }

    return {
      success: true,
      checkout: {
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
      },
    };
  } catch (error: any) {
    console.error('[Payment Service] Error creating online payment:', error);
    return { success: false, error: error.message };
  }
}

export async function captureOnlinePayment(input: {
  customerId: string;
  orderId: string;
  paymentId: string;
  signature: string;
}): Promise<{ success: boolean; bookingId?: string; alreadyProcessed?: boolean; error?: string }> {
  try {
    const valid = await paymentProvider.verifyPayment({
      orderId: input.orderId,
      paymentId: input.paymentId,
      signature: input.signature,
    });
    if (!valid) {
      return { success: false, error: 'Invalid payment signature' };
    }

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('payments')
      .select('id, booking_id, customer_id, status')
      .eq('razorpay_order_id', input.orderId)
      .single();

    if (fetchErr || !existing) {
      return { success: false, error: 'Payment not found' };
    }
    if (existing.customer_id !== input.customerId) {
      return { success: false, error: 'Access denied' };
    }
    if (existing.status === 'SUCCESS') {
      return { success: true, bookingId: existing.booking_id, alreadyProcessed: true };
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'SUCCESS',
        razorpay_payment_id: input.paymentId,
        razorpay_signature: input.signature,
        paid_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .neq('status', 'SUCCESS')
      .select('id, booking_id')
      .single();

    if (updateErr || !updated) {
      return { success: true, bookingId: existing.booking_id, alreadyProcessed: true };
    }

    await supabaseAdmin.from('payment_attempts').insert({
      payment_id: updated.id,
      status: 'CAPTURED',
      response: { order_id: input.orderId, payment_id: input.paymentId },
    });

    await logAuditAction({
      admin_id: input.customerId,
      action: AuditAction.PAYMENT_CAPTURED,
      target_type: 'payment',
      target_id: updated.id,
      metadata: { booking_id: updated.booking_id, order_id: input.orderId },
    });

    return { success: true, bookingId: updated.booking_id };
  } catch (error: any) {
    console.error('[Payment Service] Error capturing online payment:', error);
    return { success: false, error: error.message };
  }
}

export async function finalizeBookingFinancials(bookingId: string): Promise<boolean> {
  // This is called when a booking status becomes COMPLETED
  try {
    // 1. Fetch booking details
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from('bookings')
      .select('id, customer_id, worker_id, total_amount, payment_mode, service_items(category_id)')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking || !booking.worker_id) {
      throw bookingErr || new Error('Booking or Worker not found');
    }

    const categoryId = (booking as any).service_items?.category_id || null;
    const amount = Number(booking.total_amount);

    // 2. Calculate Commission
    const commissionAmount = await calculateCommission(amount, categoryId);
    const workerShare = amount - commissionAmount;

    // 3. Process according to payment mode
    if (booking.payment_mode === 'COD') {
      // Worker collected cash. Deduct commission from their wallet.
      const deductResult = await deductCommission(booking.worker_id, booking.id, commissionAmount);
      if (!deductResult.success) {
        throw new Error(`Failed to deduct commission: ${deductResult.error}`);
      }

      // Record a fake COD "payment" to keep financial reports consistent
      await supabaseAdmin.from('payments').insert({
        booking_id: booking.id,
        customer_id: booking.customer_id, // Corrected customer ID
        payment_mode: 'COD',
        status: 'SUCCESS',
        amount: amount,
        admin_commission: commissionAmount,
        worker_share: workerShare,
        paid_at: new Date().toISOString()
      });

      // Insert settlement ledger (marked as PENDING with 0 net payout because cash was already collected)
      await supabaseAdmin.from('settlement_ledger').insert({
        worker_id: booking.worker_id,
        booking_id: booking.id,
        gross_amount: amount,
        commission_amount: commissionAmount,
        net_amount: 0, // No platform payout needed
        status: 'PENDING'
      });

    } else if (booking.payment_mode === 'ONLINE') {
      // Payment was already captured by the platform.
      // Update the existing payment with commission breakdown.
      await supabaseAdmin
        .from('payments')
        .update({
          admin_commission: commissionAmount,
          worker_share: workerShare,
          status: 'SUCCESS'
        })
        .eq('booking_id', booking.id);

      // Insert settlement ledger (marked as PENDING to pay the worker later)
      await supabaseAdmin.from('settlement_ledger').insert({
        worker_id: booking.worker_id,
        booking_id: booking.id,
        gross_amount: amount,
        commission_amount: commissionAmount,
        net_amount: workerShare,
        status: 'PENDING'
      });
    }

    // 4. Mark Invoice as PAID
    await supabaseAdmin
      .from('invoices')
      .update({ status: 'PAID' })
      .eq('booking_id', booking.id);

    // 5. Automatic Referral Qualification Check
    if (booking.customer_id) {
      try {
        const { data: referral } = await supabaseAdmin
          .from('referrals')
          .select('id, referrer_id, reward_amount, status, role')
          .eq('referred_user_id', booking.customer_id)
          .eq('status', 'PENDING')
          .maybeSingle();

        if (referral) {
          // Fetch settings to get min_bookings_to_qualify
          const { data: settings } = await supabaseAdmin
            .from('referral_settings')
            .select('min_bookings_to_qualify')
            .eq('role', referral.role || 'customer')
            .eq('active', true)
            .maybeSingle();

          const minBookings = settings?.min_bookings_to_qualify ?? 1;

          // Count completed bookings for the referee
          const { count, error: countErr } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', booking.customer_id)
            .eq('status', 'COMPLETED');

          if (!countErr && count !== null && count >= minBookings) {
            // Update status to QUALIFIED
            const { error: qualErr } = await supabaseAdmin
              .from('referrals')
              .update({ status: 'QUALIFIED' })
              .eq('id', referral.id);

            if (qualErr) {
              console.error('Failed to update referral to QUALIFIED:', qualErr);
            } else {
              // Notify referrer that referral is qualified and waiting for approval
              const { dispatchNotification } = await import('./notification-dispatcher');
              await dispatchNotification({
                userId: referral.referrer_id,
                type: 'REFERRAL_QUALIFIED',
                title: '🎉 Referral Qualified!',
                body: `Your friend has completed the required service(s)! Your reward of ₹${referral.reward_amount || 500} is qualified and pending admin processing.`,
              });
            }
          }
        }
      } catch (refErr) {
        console.error('[Payment Service] Automatic referral check failed (non-fatal):', refErr);
      }
    }

    return true;

  } catch (error) {
    console.error('[Payment Service] Finalize booking failed:', error);
    return false;
  }
}
