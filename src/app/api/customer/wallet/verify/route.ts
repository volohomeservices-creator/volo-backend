import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { paymentProvider } from '@/lib/razorpay-payment-provider';

const VerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

/**
 * POST /api/customer/wallet/verify
 * Verifies Razorpay payment signature and credits the customer's Volo Wallet.
 */
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const customerId = session.user_id;

    const { data: body, errorResponse } = await validateBody(request, VerifySchema);
    if (errorResponse) return errorResponse;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // 1. Cryptographically verify signature
    const isValid = await paymentProvider.verifyPayment({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      );
    }

    // 2. Idempotency check: has this payment already been credited?
    const { data: existingTxn } = await supabaseAdmin
      .from('customer_wallet_transactions')
      .select('id')
      .eq('customer_id', customerId)
      .eq('type', 'TOP_UP')
      .like('description', `%${razorpay_payment_id}%`)
      .maybeSingle();

    if (existingTxn) {
      const { data: wallet } = await supabaseAdmin
        .from('customer_wallets')
        .select('balance')
        .eq('customer_id', customerId)
        .single();

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        balance: wallet ? Number(wallet.balance) : 0,
      });
    }

    // 3. Extract topup amount safely from Razorpay order or tracking table
    let topupAmount = 0;

    try {
      const rzpOrder = await paymentProvider.getOrder(razorpay_order_id);
      if (rzpOrder && rzpOrder.amount) {
        // Ensure this order was created for this customer
        if (rzpOrder.notes && rzpOrder.notes.customer_id && rzpOrder.notes.customer_id !== customerId) {
          return NextResponse.json({ error: 'Order customer mismatch.' }, { status: 403 });
        }
        topupAmount = Math.round(Number(rzpOrder.amount) / 100);
      }
    } catch (orderErr) {
      console.warn('[Customer Wallet Verify] Error getting order from Razorpay:', orderErr);
    }

    // Fallback to wallet_topup_orders if direct fetch fails
    if (!topupAmount || topupAmount <= 0) {
      const { data: topupOrder } = await supabaseAdmin
        .from('wallet_topup_orders')
        .select('amount')
        .eq('razorpay_order_id', razorpay_order_id)
        .maybeSingle();

      if (topupOrder?.amount) {
        topupAmount = Number(topupOrder.amount);
      }
    }

    if (!topupAmount || topupAmount <= 0) {
      return NextResponse.json(
        { error: 'Top-up order could not be validated. Please contact support.' },
        { status: 404 }
      );
    }

    // 4. Update customer wallet
    let { data: wallet } = await supabaseAdmin
      .from('customer_wallets')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin
        .from('customer_wallets')
        .insert({ customer_id: customerId, balance: 0.00 })
        .select('*')
        .single();
      wallet = newWallet;
    }

    if (!wallet) {
      return NextResponse.json({ error: 'Failed to access customer wallet' }, { status: 500 });
    }

    const newBalance = Number(wallet.balance) + topupAmount;

    const { error: updateErr } = await supabaseAdmin
      .from('customer_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('customer_id', customerId);

    if (updateErr) throw updateErr;

    // 5. Record transaction in customer_wallet_transactions
    await supabaseAdmin.from('customer_wallet_transactions').insert({
      customer_id: customerId,
      amount: topupAmount,
      type: 'TOP_UP',
      description: `Razorpay top-up ₹${topupAmount} (Payment: ${razorpay_payment_id})`,
    });

    // Mark pending order record as completed if present
    await supabaseAdmin
      .from('wallet_topup_orders')
      .update({ status: 'COMPLETED', razorpay_payment_id, updated_at: new Date().toISOString() })
      .eq('razorpay_order_id', razorpay_order_id)
      .then(() => {})
      .catch(() => {});

    return NextResponse.json({
      success: true,
      balance: newBalance,
      amount: topupAmount,
    });
  } catch (error: any) {
    console.error('[Customer Wallet Verify] Error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: error.status || 500 }
    );
  }
}
