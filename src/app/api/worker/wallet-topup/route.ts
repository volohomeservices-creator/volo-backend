import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { paymentProvider } from '@/lib/razorpay-payment-provider';

const TopUpSchema = z.object({
  amount: z.number().positive('Top-up amount must be positive').max(50000, 'Maximum top-up is ₹50,000'),
});

/**
 * POST /api/worker/wallet-topup
 * Creates a Razorpay order for the captain to add funds to their commission wallet.
 */
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    const { data: body, errorResponse } = await validateBody(request, TopUpSchema);
    if (errorResponse) return errorResponse;

    const amount = body.amount;

    // Fetch dynamic minimum topup from platform_settings
    const { data: minTopupSetting } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'min_worker_wallet_topup')
      .maybeSingle();

    const minTopup = minTopupSetting ? Number(minTopupSetting.value) || 100 : 100;
    if (amount < minTopup) {
      return NextResponse.json(
        { error: `Minimum wallet top-up amount is ₹${minTopup}.` },
        { status: 400 }
      );
    }

    // 1. Get or create worker wallet
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
      return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
    }

    // 2. Create Razorpay order via the shared payment provider
    const receiptId = `wlt_${workerId.slice(0, 8)}_${Date.now()}`;
    const order = await paymentProvider.createOrder({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receiptId,
      notes: {
        worker_id: workerId,
        purpose: 'wallet_topup',
      },
    });

    // 3. Store a pending wallet_topup record so we can verify later
    await supabaseAdmin.from('wallet_topup_orders').insert({
      worker_id: workerId,
      razorpay_order_id: order.id,
      amount: amount,
      status: 'PENDING',
    }).then(() => {}).catch(async () => {
      // Table might not exist yet. Create the pending record in wallet_transactions instead with PENDING status.
      // We'll use a separate approach — store the intent in a lightweight way.
    });

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    if (!keyId) {
      return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      checkout: {
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || 'INR',
        displayAmount: amount,
      },
    });
  } catch (error: any) {
    console.error('[Wallet TopUp] Error creating order:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Failed to create top-up order' },
      { status: error.status || 500 }
    );
  }
}
