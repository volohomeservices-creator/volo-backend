import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };
  try {
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cacheHeaders });
    }
    const customerId = session.user_id;

    // 1. Fetch or initialize customer wallet
    let { data: wallet, error: walletErr } = await supabaseAdmin
      .from('customer_wallets')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (walletErr) throw walletErr;

    if (!wallet) {
      // Auto-create wallet
      const { data: newWallet, error: createErr } = await supabaseAdmin
        .from('customer_wallets')
        .insert({
          customer_id: customerId,
          balance: 0.00
        })
        .select('*')
        .single();

      if (createErr) {
        console.error('[Customer Wallet] Failed to auto-create wallet:', createErr);
      } else {
        wallet = newWallet;
      }
    }

    // 2. Fetch last 20 transactions
    const { data: transactions, error: txErr } = await supabaseAdmin
      .from('customer_wallet_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txErr) throw txErr;

    return NextResponse.json({
      balance: wallet ? Number(wallet.balance) : 0,
      transactions: transactions || []
    }, { headers: cacheHeaders });
  } catch (error: any) {
    console.error('Error fetching customer wallet:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500, headers: cacheHeaders }
    );
  }
}

// Direct unverified top-up is disabled for security. All top-ups must go through Razorpay.
export async function POST(request: Request) {
  return NextResponse.json(
    { 
      error: 'Direct wallet top-up is disabled. Please create a Razorpay order via POST /api/customer/wallet/topup and verify via POST /api/customer/wallet/verify.' 
    },
    { status: 400 }
  );
}

