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
 * POST /api/customer/wallet/topup
 * Creates a Razorpay order for the customer to add funds to their Volo Wallet.
 */
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const customerId = session.user_id;

    const { data: body, errorResponse } = await validateBody(request, TopUpSchema);
    if (errorResponse) return errorResponse;

    const amount = body.amount;

    // Fetch dynamic limits from platform_settings
    const { data: settingRows } = await supabaseAdmin
      .from('platform_settings')
      .select('key, value')
      .in('key', ['min_customer_wallet_topup', 'max_customer_wallet_balance']);

    const settingsMap: Record<string, number> = {};
    (settingRows || []).forEach((r: any) => {
      settingsMap[r.key] = Number(r.value);
    });

    const minTopup = settingsMap['min_customer_wallet_topup'] || 100;
    const maxBalance = settingsMap['max_customer_wallet_balance'] || 10000;

    if (amount < minTopup) {
      return NextResponse.json(
        { error: `Minimum wallet top-up amount is ₹${minTopup}.` },
        { status: 400 }
      );
    }

    // 1. Get or create customer wallet
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

    if (Number(wallet.balance) + amount > maxBalance) {
      return NextResponse.json(
        { error: `Wallet balance cannot exceed ₹${maxBalance}. Current balance is ₹${Number(wallet.balance).toFixed(2)}.` },
        { status: 400 }
      );
    }

    // 2. Create Razorpay order
    const receiptId = `cw_${customerId.slice(0, 8)}_${Date.now()}`;
    const order = await paymentProvider.createOrder({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receiptId,
      notes: {
        customer_id: customerId,
        amount: String(amount),
        purpose: 'customer_wallet_topup',
      },
    });

    // 3. Optional tracking record
    await supabaseAdmin
      .from('wallet_topup_orders')
      .insert({
        customer_id: customerId,
        razorpay_order_id: order.id,
        amount: amount,
        status: 'PENDING',
      })
      .then(() => {})
      .catch(() => {
        // Table might have worker_id column or not exist yet, continue safely
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
    console.error('[Customer Wallet TopUp] Error creating order:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Failed to create top-up order' },
      { status: error.status || 500 }
    );
  }
}
