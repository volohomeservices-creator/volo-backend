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
 * POST /api/worker/wallet-topup/verify
 * Verifies Razorpay payment signature and credits the captain's wallet.
 */
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    const { data: body, errorResponse } = await validateBody(request, VerifySchema);
    if (errorResponse) return errorResponse;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // 1. Verify cryptographic signature
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

    // 2. Check if this payment was already processed (idempotency)
    const { data: existingTxn } = await supabaseAdmin
      .from('wallet_transactions')
      .select('id')
      .eq('worker_id', workerId)
      .eq('type', 'TOPUP')
      .like('description', `%${razorpay_payment_id}%`)
      .maybeSingle();

    if (existingTxn) {
      // Already processed
      const { data: wallet } = await supabaseAdmin
        .from('worker_wallets')
        .select('balance')
        .eq('worker_id', workerId)
        .single();

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        balance: wallet ? Number(wallet.balance) : 0,
      });
    }

    // 3. Extract the original amount from the topup order table
    let topupAmount = 0;

    // Try the dedicated topup orders table first
    const { data: topupOrder } = await supabaseAdmin
      .from('wallet_topup_orders')
      .select('amount, status')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('worker_id', workerId)
      .maybeSingle();

    if (topupOrder) {
      topupAmount = Number(topupOrder.amount);
      // Mark as completed
      await supabaseAdmin
        .from('wallet_topup_orders')
        .update({ status: 'COMPLETED', razorpay_payment_id, updated_at: new Date().toISOString() })
        .eq('razorpay_order_id', razorpay_order_id);
    } else {
      // Fallback: Fetch order details directly from Razorpay API
      try {
        const rzpOrder = await paymentProvider.getOrder(razorpay_order_id);
        if (rzpOrder && rzpOrder.amount) {
          topupAmount = Math.round(Number(rzpOrder.amount) / 100);
        }
      } catch (fetchErr) {
        console.error('[Wallet TopUp Verify] Error fetching order from Razorpay:', fetchErr);
      }
    }

    // If topup amount cannot be confirmed, return error
    if (!topupAmount || topupAmount <= 0) {
      return NextResponse.json(
        { error: 'Top-up order could not be validated. Please contact support.' },
        { status: 404 }
      );
    }

    // 4. Credit the wallet
    let { data: wallet } = await supabaseAdmin
      .from('worker_wallets')
      .select('*')
      .eq('worker_id', workerId)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await supabaseAdmin
        .from('worker_wallets')
        .insert({ worker_id: workerId, balance: 0.00, minimum_balance: -500.00 })
        .select('*')
        .single();
      wallet = newWallet;
    }

    if (!wallet) {
      return NextResponse.json({ error: 'Failed to access wallet' }, { status: 500 });
    }

    const newBalance = Number(wallet.balance) + topupAmount;

    const { error: updateErr } = await supabaseAdmin
      .from('worker_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('worker_id', workerId);

    if (updateErr) throw updateErr;

    // 5. Log the transaction
    await supabaseAdmin.from('wallet_transactions').insert({
      worker_id: workerId,
      amount: topupAmount,
      type: 'TOPUP',
      description: `Razorpay top-up ₹${topupAmount} (Payment: ${razorpay_payment_id})`,
    });

    return NextResponse.json({
      success: true,
      balance: newBalance,
      amount: topupAmount,
    });
  } catch (error: any) {
    console.error('[Wallet TopUp Verify] Error:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: error.status || 500 }
    );
  }
}
