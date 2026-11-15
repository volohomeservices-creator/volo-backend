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

/**
 * Evaluates and processes all referral rewards upon booking completion.
 * Rules:
 * - Customer Referral: Referrer must have >= min_referrer_bookings (default 1)
 *   and referee customer must have >= min_bookings_to_qualify (default 1).
 *   Rewards (both referee welcome bonus and referrer bonus) deposit into wallets
 *   after the referee completes their required order(s).
 * - Worker / Captain Referral: Criteria (min_referrer_bookings & min_bookings_to_qualify)
 *   are decided by Admin through the Admin Panel. Rewards deposit into wallets
 *   after the referee worker completes their required jobs.
 */
export async function processBookingCompletionReferrals(bookingId: string): Promise<void> {
  try {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('id, customer_id, worker_id, status')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking || booking.status !== 'COMPLETED') {
      return;
    }

    const { dispatchNotification } = await import('./notification-dispatcher');

    // =============================================================
    // 1. CUSTOMER REFERRAL PROCESSING
    // =============================================================
    if (booking.customer_id) {
      const customerId = booking.customer_id;

      // 1A. Check if this customer was REFERRED by someone (Customer Referee)
      const { data: refereeRecord } = await supabaseAdmin
        .from('referrals')
        .select('id, referrer_id, referral_code, reward_amount, referee_reward_amount, status, referee_rewarded_at, rewarded_at')
        .eq('referred_user_id', customerId)
        .eq('role', 'customer')
        .maybeSingle();

      if (refereeRecord) {
        const { data: custSettings } = await supabaseAdmin
          .from('referral_settings')
          .select('referrer_reward, referee_reward, min_bookings_to_qualify, min_referrer_bookings')
          .eq('role', 'customer')
          .eq('active', true)
          .maybeSingle();

        const minRefereeBookings = custSettings?.min_bookings_to_qualify ?? 1;
        const minReferrerBookings = custSettings?.min_referrer_bookings ?? 1;
        const referrerReward = Number(refereeRecord.reward_amount || custSettings?.referrer_reward || 100);
        const refereeReward = Number(refereeRecord.referee_reward_amount || custSettings?.referee_reward || 50);

        // Count referee's completed bookings
        const { count: refereeCompletedCount } = await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('status', 'COMPLETED');

        if ((refereeCompletedCount || 0) >= minRefereeBookings) {
          // Count referrer's completed bookings
          const { count: referrerCompletedCount } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', refereeRecord.referrer_id)
            .eq('status', 'COMPLETED');

          // 1. Deposit Referee Welcome Bonus if not already credited
          if (!refereeRecord.referee_rewarded_at && refereeReward > 0) {
            const { data: refWallet } = await supabaseAdmin
              .from('customer_wallets')
              .select('id, balance')
              .eq('customer_id', customerId)
              .maybeSingle();

            if (refWallet) {
              await supabaseAdmin
                .from('customer_wallets')
                .update({ balance: Number(refWallet.balance) + refereeReward })
                .eq('id', refWallet.id);
            } else {
              await supabaseAdmin
                .from('customer_wallets')
                .insert({ customer_id: customerId, balance: refereeReward });
            }

            await supabaseAdmin.from('customer_wallet_transactions').insert({
              customer_id: customerId,
              amount: refereeReward,
              type: 'CREDIT',
              description: `Friend Welcome Bonus - 1st Order Completed (Code: ${refereeRecord.referral_code})`
            });

            await supabaseAdmin
              .from('referrals')
              .update({ referee_rewarded_at: new Date().toISOString() })
              .eq('id', refereeRecord.id);

            await dispatchNotification({
              userId: customerId,
              type: 'REFERRAL_REWARDED',
              title: '🎁 Welcome Bonus Deposited!',
              body: `Congratulations on completing your first order! Your ₹${refereeReward} friend welcome bonus has been deposited to your VOLO wallet.`,
              data: { referral_id: refereeRecord.id, amount: refereeReward.toString() }
            });
          }

          // 2. Deposit Referrer Reward if Referrer has >= min_referrer_bookings
          const isReferrerEligible = (referrerCompletedCount || 0) >= minReferrerBookings;
          if (isReferrerEligible && !refereeRecord.rewarded_at && referrerReward > 0) {
            const { data: referrerWallet } = await supabaseAdmin
              .from('customer_wallets')
              .select('id, balance')
              .eq('customer_id', refereeRecord.referrer_id)
              .maybeSingle();

            if (referrerWallet) {
              await supabaseAdmin
                .from('customer_wallets')
                .update({ balance: Number(referrerWallet.balance) + referrerReward })
                .eq('id', referrerWallet.id);
            } else {
              await supabaseAdmin
                .from('customer_wallets')
                .insert({ customer_id: refereeRecord.referrer_id, balance: referrerReward });
            }

            await supabaseAdmin.from('customer_wallet_transactions').insert({
              customer_id: refereeRecord.referrer_id,
              amount: referrerReward,
              type: 'CREDIT',
              description: `Referral Reward - Friend Completed Service (Code: ${refereeRecord.referral_code})`
            });

            await supabaseAdmin
              .from('referrals')
              .update({
                status: 'REWARDED',
                rewarded_at: new Date().toISOString()
              })
              .eq('id', refereeRecord.id);

            await dispatchNotification({
              userId: refereeRecord.referrer_id,
              type: 'REFERRAL_REWARDED',
              title: '🎉 Referral Bonus Deposited!',
              body: `Your friend completed their service and you have completed your required order! ₹${referrerReward} referral reward has been credited to your VOLO wallet.`,
              data: { referral_id: refereeRecord.id, amount: referrerReward.toString() }
            });
          } else if (!isReferrerEligible && refereeRecord.status !== 'REWARDED') {
            await supabaseAdmin
              .from('referrals')
              .update({ status: 'QUALIFIED' })
              .eq('id', refereeRecord.id);

            await dispatchNotification({
              userId: refereeRecord.referrer_id,
              type: 'REFERRAL_QUALIFIED',
              title: '⏳ Unlock Your Referral Bonus!',
              body: `Your referred friend completed their service! Complete at least ${minReferrerBookings} order to unlock and claim your ₹${referrerReward} referral bonus.`,
              data: { referral_id: refereeRecord.id }
            });
          }
        }
      }

      // 1B. Check if this customer is a REFERRER who has pending referrals waiting on their own order requirement
      const { data: pendingAsReferrer } = await supabaseAdmin
        .from('referrals')
        .select('id, referred_user_id, referral_code, reward_amount, status, rewarded_at')
        .eq('referrer_id', customerId)
        .eq('role', 'customer')
        .is('rewarded_at', null);

      if (pendingAsReferrer && pendingAsReferrer.length > 0) {
        const { data: custSettings } = await supabaseAdmin
          .from('referral_settings')
          .select('referrer_reward, min_bookings_to_qualify, min_referrer_bookings')
          .eq('role', 'customer')
          .eq('active', true)
          .maybeSingle();

        const minRefereeBookings = custSettings?.min_bookings_to_qualify ?? 1;
        const minReferrerBookings = custSettings?.min_referrer_bookings ?? 1;

        const { count: currentCustomerCompleted } = await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', customerId)
          .eq('status', 'COMPLETED');

        if ((currentCustomerCompleted || 0) >= minReferrerBookings) {
          for (const ref of pendingAsReferrer) {
            const { count: refOrders } = await supabaseAdmin
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .eq('customer_id', ref.referred_user_id)
              .eq('status', 'COMPLETED');

            if ((refOrders || 0) >= minRefereeBookings) {
              const rewardAmt = Number(ref.reward_amount || custSettings?.referrer_reward || 100);
              const { data: w } = await supabaseAdmin
                .from('customer_wallets')
                .select('id, balance')
                .eq('customer_id', customerId)
                .maybeSingle();

              if (w) {
                await supabaseAdmin
                  .from('customer_wallets')
                  .update({ balance: Number(w.balance) + rewardAmt })
                  .eq('id', w.id);
              } else {
                await supabaseAdmin
                  .from('customer_wallets')
                  .insert({ customer_id: customerId, balance: rewardAmt });
              }

              await supabaseAdmin.from('customer_wallet_transactions').insert({
                customer_id: customerId,
                amount: rewardAmt,
                type: 'CREDIT',
                description: `Referral Reward - Unlocked by Completing Order (Code: ${ref.referral_code})`
              });

              await supabaseAdmin
                .from('referrals')
                .update({ status: 'REWARDED', rewarded_at: new Date().toISOString() })
                .eq('id', ref.id);

              await dispatchNotification({
                userId: customerId,
                type: 'REFERRAL_REWARDED',
                title: '🎉 Referral Bonus Unlocked!',
                body: `You completed your order! Your ₹${rewardAmt} referral reward for inviting a friend has been deposited into your VOLO wallet.`,
                data: { referral_id: ref.id, amount: rewardAmt.toString() }
              });
            }
          }
        }
      }
    }

    // =============================================================
    // 2. CAPTAIN / WORKER REFERRAL PROCESSING
    // =============================================================
    if (booking.worker_id) {
      const workerId = booking.worker_id;

      // 2A. Check if this worker was REFERRED by someone (Captain Referee)
      const { data: workerRefereeRecord } = await supabaseAdmin
        .from('referrals')
        .select('id, referrer_id, referral_code, reward_amount, referee_reward_amount, status, referee_rewarded_at, rewarded_at')
        .eq('referred_user_id', workerId)
        .eq('role', 'worker')
        .maybeSingle();

      if (workerRefereeRecord) {
        const { data: workerSettings } = await supabaseAdmin
          .from('referral_settings')
          .select('referrer_reward, referee_reward, min_bookings_to_qualify, min_referrer_bookings')
          .eq('role', 'worker')
          .eq('active', true)
          .maybeSingle();

        const minWorkerJobs = workerSettings?.min_bookings_to_qualify ?? 5;
        const minReferrerJobs = workerSettings?.min_referrer_bookings ?? 1;
        const captainReferrerReward = Number(workerRefereeRecord.reward_amount || workerSettings?.referrer_reward || 100);
        const captainRefereeReward = Number(workerRefereeRecord.referee_reward_amount || workerSettings?.referee_reward || 100);

        // Count referee captain's completed jobs
        const { count: workerCompletedCount } = await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', workerId)
          .eq('status', 'COMPLETED');

        if ((workerCompletedCount || 0) >= minWorkerJobs) {
          // Count referrer captain's completed jobs
          const { count: referrerCaptainCompletedCount } = await supabaseAdmin
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('worker_id', workerRefereeRecord.referrer_id)
            .eq('status', 'COMPLETED');

          // 1. Credit Referee Captain Sign-in Bonus if not already credited
          if (!workerRefereeRecord.referee_rewarded_at && captainRefereeReward > 0) {
            await createWallet(workerId);
            const { data: wWallet } = await supabaseAdmin
              .from('worker_wallets')
              .select('balance')
              .eq('worker_id', workerId)
              .maybeSingle();

            const prevBal = Number(wWallet?.balance || 0);
            const newBal = prevBal + captainRefereeReward;

            await supabaseAdmin
              .from('worker_wallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('worker_id', workerId);

            await supabaseAdmin.from('wallet_transactions').insert({
              worker_id: workerId,
              type: 'CREDIT',
              amount: captainRefereeReward,
              balance_before: prevBal,
              balance_after: newBal,
              description: `Captain Sign-up Bonus - Completed ${minWorkerJobs} Jobs (Code: ${workerRefereeRecord.referral_code})`
            });

            await supabaseAdmin
              .from('referrals')
              .update({ referee_rewarded_at: new Date().toISOString() })
              .eq('id', workerRefereeRecord.id);

            await dispatchNotification({
              userId: workerId,
              type: 'REFERRAL_REWARDED',
              title: '🎁 Captain Sign-up Bonus Credited!',
              body: `Congratulations on completing ${minWorkerJobs} jobs! Your ₹${captainRefereeReward} welcome sign-up bonus has been deposited to your Captain wallet.`,
              data: { referral_id: workerRefereeRecord.id, amount: captainRefereeReward.toString() }
            });
          }

          // 2. Credit Referrer Captain Reward if Referrer has >= min_referrer_bookings
          const isReferrerCaptainEligible = (referrerCaptainCompletedCount || 0) >= minReferrerJobs;
          if (isReferrerCaptainEligible && !workerRefereeRecord.rewarded_at && captainReferrerReward > 0) {
            await createWallet(workerRefereeRecord.referrer_id);
            const { data: refCapWallet } = await supabaseAdmin
              .from('worker_wallets')
              .select('balance')
              .eq('worker_id', workerRefereeRecord.referrer_id)
              .maybeSingle();

            const prevBal = Number(refCapWallet?.balance || 0);
            const newBal = prevBal + captainReferrerReward;

            await supabaseAdmin
              .from('worker_wallets')
              .update({ balance: newBal, updated_at: new Date().toISOString() })
              .eq('worker_id', workerRefereeRecord.referrer_id);

            await supabaseAdmin.from('wallet_transactions').insert({
              worker_id: workerRefereeRecord.referrer_id,
              type: 'CREDIT',
              amount: captainReferrerReward,
              balance_before: prevBal,
              balance_after: newBal,
              description: `Captain Recruitment Reward - Referred captain completed ${minWorkerJobs} jobs (Code: ${workerRefereeRecord.referral_code})`
            });

            await supabaseAdmin
              .from('referrals')
              .update({ status: 'REWARDED', rewarded_at: new Date().toISOString() })
              .eq('id', workerRefereeRecord.id);

            await dispatchNotification({
              userId: workerRefereeRecord.referrer_id,
              type: 'REFERRAL_REWARDED',
              title: '🎉 Captain Referral Reward Deposited!',
              body: `Your recruited captain has completed ${minWorkerJobs} jobs! Your reward of ₹${captainReferrerReward} has been credited to your Captain wallet.`,
              data: { referral_id: workerRefereeRecord.id, amount: captainReferrerReward.toString() }
            });
          } else if (!isReferrerCaptainEligible && workerRefereeRecord.status !== 'REWARDED') {
            await supabaseAdmin
              .from('referrals')
              .update({ status: 'QUALIFIED' })
              .eq('id', workerRefereeRecord.id);

            await dispatchNotification({
              userId: workerRefereeRecord.referrer_id,
              type: 'REFERRAL_QUALIFIED',
              title: '⏳ Unlock Your Captain Referral Reward!',
              body: `Your recruited captain has completed ${minWorkerJobs} jobs! Complete at least ${minReferrerJobs} jobs to unlock your ₹${captainReferrerReward} recruitment bonus.`,
              data: { referral_id: workerRefereeRecord.id }
            });
          }
        }
      }

      // 2B. Check if this worker is a REFERRER CAPTAIN with pending referrals
      const { data: pendingCaptainReferrals } = await supabaseAdmin
        .from('referrals')
        .select('id, referred_user_id, referral_code, reward_amount, status, rewarded_at')
        .eq('referrer_id', workerId)
        .eq('role', 'worker')
        .is('rewarded_at', null);

      if (pendingCaptainReferrals && pendingCaptainReferrals.length > 0) {
        const { data: workerSettings } = await supabaseAdmin
          .from('referral_settings')
          .select('referrer_reward, min_bookings_to_qualify, min_referrer_bookings')
          .eq('role', 'worker')
          .eq('active', true)
          .maybeSingle();

        const minWorkerJobs = workerSettings?.min_bookings_to_qualify ?? 5;
        const minReferrerJobs = workerSettings?.min_referrer_bookings ?? 1;

        const { count: currentWorkerCompleted } = await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', workerId)
          .eq('status', 'COMPLETED');

        if ((currentWorkerCompleted || 0) >= minReferrerJobs) {
          for (const ref of pendingCaptainReferrals) {
            const { count: refCapOrders } = await supabaseAdmin
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .eq('worker_id', ref.referred_user_id)
              .eq('status', 'COMPLETED');

            if ((refCapOrders || 0) >= minWorkerJobs) {
              const rewardAmt = Number(ref.reward_amount || workerSettings?.referrer_reward || 100);
              await createWallet(workerId);
              const { data: wWallet } = await supabaseAdmin
                .from('worker_wallets')
                .select('balance')
                .eq('worker_id', workerId)
                .maybeSingle();

              const prevBal = Number(wWallet?.balance || 0);
              const newBal = prevBal + rewardAmt;

              await supabaseAdmin
                .from('worker_wallets')
                .update({ balance: newBal, updated_at: new Date().toISOString() })
                .eq('worker_id', workerId);

              await supabaseAdmin.from('wallet_transactions').insert({
                worker_id: workerId,
                type: 'CREDIT',
                amount: rewardAmt,
                balance_before: prevBal,
                balance_after: newBal,
                description: `Captain Recruitment Reward - Unlocked by Completing Jobs (Code: ${ref.referral_code})`
              });

              await supabaseAdmin
                .from('referrals')
                .update({ status: 'REWARDED', rewarded_at: new Date().toISOString() })
                .eq('id', ref.id);

              await dispatchNotification({
                userId: workerId,
                type: 'REFERRAL_REWARDED',
                title: '🎉 Captain Referral Reward Unlocked!',
                body: `You completed your required jobs! Your ₹${rewardAmt} recruitment reward has been deposited into your Captain wallet.`,
                data: { referral_id: ref.id, amount: rewardAmt.toString() }
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('[Wallet Engine] Error processing booking completion referrals:', error);
  }
}
