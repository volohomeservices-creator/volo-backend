import 'server-only';
import { supabaseAdmin } from './supabase-server';
import { logAuditAction } from './audit';
import { AuditAction, WalletTxnType } from '@/types';

export async function createWallet(workerId: string): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from('worker_wallets')
    .select('id')
    .eq('worker_id', workerId)
    .single();

  if (existing) {
    return true; // Already exists
  }

  const { error } = await supabaseAdmin
    .from('worker_wallets')
    .insert({
      worker_id: workerId,
      balance: 0,
      minimum_balance: -500,
      is_active: true
    });

  if (error) {
    console.error('[Wallet Engine] Failed to create wallet:', error);
    return false;
  }

  await logAuditAction({
    admin_id: workerId,
    action: AuditAction.WALLET_CREATED,
    target_type: 'worker',
    target_id: workerId,
    metadata: { initial_balance: 0, minimum_balance: -500 }
  });

  return true;
}

export async function getBalance(workerId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('worker_wallets')
    .select('balance')
    .eq('worker_id', workerId)
    .single();

  if (error || !data) {
    return 0;
  }

  return Number(data.balance);
}

export async function validateWallet(workerId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('worker_wallets')
    .select('balance, minimum_balance')
    .eq('worker_id', workerId)
    .single();

  if (error || !data) {
    return false;
  }

  return Number(data.balance) >= Number(data.minimum_balance);
}

export async function deductCommission(
  workerId: string,
  bookingId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  // Use a Postgres function to safely deduct and create ledger entry in a transaction
  const { data, error } = await supabaseAdmin.rpc('deduct_wallet_commission', {
    p_worker_id: workerId,
    p_booking_id: bookingId,
    p_amount: amount
  });

  if (error) {
    console.error('[Wallet Engine] Error deducting commission:', error);
    return { success: false, error: error.message };
  }

  await logAuditAction({
    admin_id: workerId,
    action: AuditAction.COMMISSION_DEDUCTED,
    target_type: 'worker',
    target_id: workerId,
    metadata: { booking_id: bookingId, amount }
  });

  return { success: true };
}

export async function creditWorkerKycWelcomeBonus(workerId: string): Promise<{ credited: boolean; amount?: number }> {
  try {
    await createWallet(workerId);

    const { data: referral, error: refErr } = await supabaseAdmin
      .from('referrals')
      .select('id, referral_code, referee_reward_amount, referee_rewarded_at, role')
      .eq('referred_user_id', workerId)
      .eq('role', 'worker')
      .is('referee_rewarded_at', null)
      .maybeSingle();

    if (refErr || !referral) {
      return { credited: false };
    }

    let rewardAmount = Number(referral.referee_reward_amount || 0);
    if (!rewardAmount || rewardAmount <= 0) {
      const { data: settings } = await supabaseAdmin
        .from('referral_settings')
        .select('referee_reward')
        .eq('role', 'worker')
        .eq('active', true)
        .maybeSingle();

      rewardAmount = Number(settings?.referee_reward || 100);
    }

    if (rewardAmount <= 0) {
      await supabaseAdmin
        .from('referrals')
        .update({ referee_rewarded_at: new Date().toISOString() })
        .eq('id', referral.id);
      return { credited: false };
    }

    const { data: wallet } = await supabaseAdmin
      .from('worker_wallets')
      .select('balance')
      .eq('worker_id', workerId)
      .maybeSingle();

    const prevBal = Number(wallet?.balance || 0);
    const newBal = prevBal + rewardAmount;

    await supabaseAdmin
      .from('worker_wallets')
      .update({
        balance: newBal,
        updated_at: new Date().toISOString()
      })
      .eq('worker_id', workerId);

    await supabaseAdmin.from('wallet_transactions').insert({
      worker_id: workerId,
      type: 'CREDIT',
      amount: rewardAmount,
      balance_before: prevBal,
      balance_after: newBal,
      description: `Captain Sign-up Bonus - Welcome Incentive after KYC (Code: ${referral.referral_code})`
    });

    await supabaseAdmin
      .from('referrals')
      .update({
        referee_reward_amount: rewardAmount,
        referee_rewarded_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    try {
      const { dispatchNotification } = await import('./notification-dispatcher');
      await dispatchNotification({
        userId: workerId,
        type: 'REFERRAL_REWARDED',
        title: '🎁 Welcome Sign-up Bonus Credited!',
        body: `Congratulations! Your KYC is verified. Your ₹${rewardAmount} referral sign-up bonus has been credited to your Captain wallet.`,
        data: { referral_id: referral.id, amount: rewardAmount.toString() }
      });
    } catch (notifErr) {
      console.warn('[Wallet Engine] Failed to dispatch referee bonus notification:', notifErr);
    }

    return { credited: true, amount: rewardAmount };
  } catch (err) {
    console.error('[Wallet Engine] Error crediting worker KYC welcome bonus:', err);
    return { credited: false };
  }
}

export async function creditCustomerReferralWelcomeBonus(customerId: string): Promise<{ credited: boolean; amount?: number }> {
  try {
    const { data: referral, error: refErr } = await supabaseAdmin
      .from('referrals')
      .select('id, referral_code, referee_reward_amount, referee_rewarded_at, role')
      .eq('referred_user_id', customerId)
      .eq('role', 'customer')
      .is('referee_rewarded_at', null)
      .maybeSingle();

    if (refErr || !referral) {
      return { credited: false };
    }

    let rewardAmount = Number(referral.referee_reward_amount || 0);
    if (!rewardAmount || rewardAmount <= 0) {
      const { data: settings } = await supabaseAdmin
        .from('referral_settings')
        .select('referee_reward')
        .eq('role', 'customer')
        .eq('active', true)
        .maybeSingle();

      rewardAmount = Number(settings?.referee_reward || 50);
    }

    if (rewardAmount <= 0) {
      await supabaseAdmin
        .from('referrals')
        .update({ referee_rewarded_at: new Date().toISOString() })
        .eq('id', referral.id);
      return { credited: false };
    }

    const { data: wallet } = await supabaseAdmin
      .from('customer_wallets')
      .select('id, balance')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (wallet) {
      await supabaseAdmin
        .from('customer_wallets')
        .update({ balance: Number(wallet.balance) + rewardAmount })
        .eq('id', wallet.id);
    } else {
      await supabaseAdmin
        .from('customer_wallets')
        .insert({ customer_id: customerId, balance: rewardAmount });
    }

    await supabaseAdmin.from('customer_wallet_transactions').insert({
      customer_id: customerId,
      amount: rewardAmount,
      type: 'CREDIT',
      description: `Friend Welcome Bonus - Sign-up Reward (Code: ${referral.referral_code})`
    });

    await supabaseAdmin
      .from('referrals')
      .update({
        referee_reward_amount: rewardAmount,
        referee_rewarded_at: new Date().toISOString()
      })
      .eq('id', referral.id);

    try {
      const { dispatchNotification } = await import('./notification-dispatcher');
      await dispatchNotification({
        userId: customerId,
        type: 'REFERRAL_REWARDED',
        title: '🎁 Welcome Bonus Credited!',
        body: `Welcome to Volo! Your ₹${rewardAmount} friend welcome bonus has been added to your Volo wallet.`,
        data: { referral_id: referral.id, amount: rewardAmount.toString() }
      });
    } catch (notifErr) {
      console.warn('[Wallet Engine] Failed to dispatch customer referee bonus notification:', notifErr);
    }

    return { credited: true, amount: rewardAmount };
  } catch (err) {
    console.error('[Wallet Engine] Error crediting customer welcome bonus:', err);
    return { credited: false };
  }
}
