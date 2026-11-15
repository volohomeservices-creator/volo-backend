import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;
import { dispatchNotification } from '@/lib/notification-dispatcher';

// GET: List all referrals with referrer + referred user info
export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    let query = supabaseAdmin
      .from('referrals')
      .select(`
        id,
        status,
        reward_amount,
        referee_reward_amount,
        referee_rewarded_at,
        role,
        created_at,
        rewarded_at,
        referral_code,
        referrer:users!referrals_referrer_id_fkey(id, full_name, phone),
        referred:users!referrals_referred_user_id_fkey(id, full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ referrals: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

// PATCH: Mark referral as REWARDED and notify referrer
export async function PATCH(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    const { data: { referral_id }, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

    if (!referral_id) {
      return NextResponse.json({ error: 'referral_id is required' }, { status: 400 });
    }

    // Get the referral row
    const { data: referral, error: fetchErr } = await supabaseAdmin
      .from('referrals')
      .select('id, referrer_id, referred_user_id, reward_amount, referee_reward_amount, referee_rewarded_at, status, role')
      .eq('id', referral_id)
      .single();

    if (fetchErr || !referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 });
    }

    if (referral.status === 'REWARDED') {
      return NextResponse.json({ error: 'Already rewarded' }, { status: 400 });
    }

    // Update status
    const { error: updateErr } = await supabaseAdmin
      .from('referrals')
      .update({ status: 'REWARDED', rewarded_at: new Date().toISOString() })
      .eq('id', referral_id);

    if (updateErr) throw updateErr;

    // Credit referrer's wallet & insert transaction statement record
    const rewardAmount = Number(referral.reward_amount || 0);
    if (rewardAmount > 0) {
      if (referral.role === 'customer') {
        try {
          const { data: wallet } = await supabaseAdmin
            .from('customer_wallets')
            .select('id, balance')
            .eq('customer_id', referral.referrer_id)
            .maybeSingle();

          if (wallet) {
            await supabaseAdmin
              .from('customer_wallets')
              .update({ balance: Number(wallet.balance) + rewardAmount })
              .eq('id', wallet.id);
          } else {
            await supabaseAdmin
              .from('customer_wallets')
              .insert({ customer_id: referral.referrer_id, balance: rewardAmount });
          }

          // Insert into customer_wallet_transactions
          await supabaseAdmin.from('customer_wallet_transactions').insert({
            customer_id: referral.referrer_id,
            amount: rewardAmount,
            type: 'CREDIT',
            description: 'Referral Bonus - Friend Invite'
          });
        } catch (walletErr) {
          console.error('[Admin Referrals] Customer wallet/txn credit failed:', walletErr);
        }
      } else if (referral.role === 'worker') {
        try {
          const { data: wallet } = await supabaseAdmin
            .from('worker_wallets')
            .select('balance')
            .eq('worker_id', referral.referrer_id)
            .maybeSingle();

          const prevBal = Number(wallet?.balance || 0);
          const newBal = prevBal + rewardAmount;

          if (wallet) {
            await supabaseAdmin
              .from('worker_wallets')
              .update({
                balance: newBal,
                updated_at: new Date().toISOString()
              })
              .eq('worker_id', referral.referrer_id);
          } else {
            await supabaseAdmin
              .from('worker_wallets')
              .insert({ worker_id: referral.referrer_id, balance: newBal });
          }

          // Insert into wallet_transactions
          await supabaseAdmin.from('wallet_transactions').insert({
            worker_id: referral.referrer_id,
            type: 'CREDIT',
            amount: rewardAmount,
            balance_before: prevBal,
            balance_after: newBal,
            description: 'Captain Referral Bonus - Recruitment Reward'
          });
        } catch (workerWalletErr) {
          console.error('[Admin Referrals] Worker wallet/txn credit failed:', workerWalletErr);
        }
      }
    }

    // Also ensure referee welcome bonus is credited if pending
    if (!referral.referee_rewarded_at && referral.referred_user_id) {
      try {
        if (referral.role === 'worker') {
          // Check if worker KYC is approved before crediting welcome bonus
          const { data: worker } = await supabaseAdmin
            .from('workers')
            .select('kyc_status')
            .eq('id', referral.referred_user_id)
            .maybeSingle();

          if (worker?.kyc_status === 'APPROVED') {
            const { creditWorkerKycWelcomeBonus } = await import('@/lib/wallet-engine');
            await creditWorkerKycWelcomeBonus(referral.referred_user_id);
          }
        } else if (referral.role === 'customer') {
          const { creditCustomerReferralWelcomeBonus } = await import('@/lib/wallet-engine');
          await creditCustomerReferralWelcomeBonus(referral.referred_user_id);
        }
      } catch (refereeCreditErr) {
        console.error('[Admin Referrals] Referee welcome credit failed (non-fatal):', refereeCreditErr);
      }
    }

    // Notify the referrer
    await dispatchNotification({
      userId: referral.referrer_id,
      type: 'REFERRAL_REWARDED',
      title: '🎉 Referral Reward Credited!',
      body: `Your referral has been verified! ₹${rewardAmount} has been credited to your account.`,
      data: { referral_id, reward_amount: rewardAmount.toString() },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
