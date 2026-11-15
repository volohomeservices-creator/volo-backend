import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import { dispatchNotification } from '@/lib/notification-dispatcher';
import { CashfreePayoutProvider } from '@/lib/payouts/cashfree-payout-provider';

export const dynamic = 'force-dynamic';

const directPayoutSchema = z.object({
  workerId: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than 0'),
  payoutSource: z.enum(['WALLET_DEDUCTION', 'DIRECT_BONUS']),
  payoutType: z.enum(['REFERRAL_BONUS', 'SIGNUP_BONUS', 'WALLET_WITHDRAWAL', 'INCENTIVE', 'OTHER']).optional(),
  preferredMode: z.enum(['banktransfer', 'upi']).default('banktransfer'),
  remarks: z.string().optional()
});

// GET: Return all direct / promotional payouts and eligible captains with bank accounts
export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Fetch referral payouts ONLY (do NOT return job settlements here)
    const { data: payouts, error: pErr } = await supabaseAdmin
      .from('payouts')
      .select(`
        id,
        worker_id,
        settlement_batch_id,
        amount,
        provider,
        provider_reference,
        provider_status,
        utr_number,
        status,
        payout_mode,
        payout_type,
        remarks,
        failure_reason,
        processed_at,
        created_at,
        workers:workers!inner (
          id,
          users:users!inner (
            id,
            full_name,
            phone
          )
        )
      `)
      .in('payout_type', ['REFERRAL_BONUS', 'SIGNUP_BONUS'])
      .order('created_at', { ascending: false })
      .limit(100);

    if (pErr) {
      console.error('[Direct Payout API] Error querying referral payouts:', pErr);
    }

    // 2. Fetch all referrals to compute pending referral rewards awaiting disbursal
    const { data: referrals, error: rErr } = await supabaseAdmin
      .from('referrals')
      .select(`
        id,
        referrer_id,
        referred_user_id,
        referral_code,
        status,
        reward_amount,
        referee_reward_amount,
        created_at,
        role,
        rewarded_at,
        referee_rewarded_at,
        referrer:users!referrals_referrer_id_fkey(id, full_name, phone),
        referred:users!referrals_referred_user_id_fkey(id, full_name, phone)
      `)
      .order('created_at', { ascending: false });

    if (rErr) {
      console.error('[Direct Payout API] Error querying referrals:', rErr);
    }

    // 3. Fetch all registered bank accounts with worker and user details
    const { data: bankAccounts, error: bErr } = await supabaseAdmin
      .from('worker_bank_accounts')
      .select(`
        id,
        worker_id,
        bank_name,
        account_last_four,
        ifsc_code,
        upi_id,
        is_verified,
        is_primary,
        account_holder_name,
        workers:workers!inner (
          id,
          users:users!inner (
            id,
            full_name,
            phone
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (bErr) {
      console.error('[Direct Payout API] Error querying bank accounts:', bErr);
    }

    // 4. Fetch wallets to pair with bank accounts
    const { data: wallets } = await supabaseAdmin
      .from('worker_wallets')
      .select('worker_id, balance');

    const walletMap = new Map<string, number>();
    (wallets || []).forEach((w: any) => {
      walletMap.set(w.worker_id, Number(w.balance || 0));
    });

    // Format eligible captains with their verified bank accounts & balances
    const captainsMap = new Map<string, any>();
    (bankAccounts || []).forEach((b: any) => {
      const wId = b.worker_id;
      const userName = b.workers?.users?.full_name || b.account_holder_name || 'Captain';
      const userPhone = b.workers?.users?.phone || 'N/A';
      const balance = walletMap.get(wId) ?? 0;

      // Keep primary bank account or first verified
      if (!captainsMap.has(wId) || (b.is_primary && !captainsMap.get(wId).is_primary)) {
        captainsMap.set(wId, {
          workerId: wId,
          fullName: userName,
          phone: userPhone,
          bankName: b.bank_name,
          accountLastFour: b.account_last_four,
          ifscCode: b.ifsc_code,
          upiId: b.upi_id,
          isVerified: b.is_verified,
          isPrimary: b.is_primary,
          walletBalance: balance
        });
      }
    });

    const referralPayoutsList = payouts || [];

    // 5. Compute pending referral payouts awaiting execution
    const pendingReferrals: any[] = [];
    (referrals || []).forEach((ref: any) => {
      // A. Referrer Reward (Invite Bonus)
      const refReward = Number(ref.reward_amount || 0);
      if (refReward > 0 && ref.referrer_id) {
        const paidToReferrer = referralPayoutsList
          .filter((p: any) => p.worker_id === ref.referrer_id && ['PAID', 'PROCESSING'].includes(p.status))
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

        const pending = Math.max(0, refReward - paidToReferrer);
        const bank = (bankAccounts || []).find((b: any) => b.worker_id === ref.referrer_id);
        const walletBal = walletMap.get(ref.referrer_id) ?? 0;

        if (pending > 0) {
          pendingReferrals.push({
            id: `ref_referrer_${ref.id}`,
            referralId: ref.id,
            workerId: ref.referrer_id,
            captainName: ref.referrer?.full_name || 'Referrer Captain',
            phone: ref.referrer?.phone || 'N/A',
            role: 'REFERRER',
            typeLabel: 'Referral Invite Bonus',
            referralCode: ref.referral_code,
            counterpartName: ref.referred?.full_name || 'Invited Captain',
            counterpartPhone: ref.referred?.phone || '',
            totalReward: refReward,
            disbursedAmount: paidToReferrer,
            pendingAmount: pending,
            walletBalance: walletBal,
            bankName: bank?.bank_name || null,
            accountLastFour: bank?.account_last_four || null,
            ifscCode: bank?.ifsc_code || null,
            upiId: bank?.upi_id || null,
            isBankVerified: bank?.is_verified ?? false,
            hasBank: !!bank,
            createdAt: ref.created_at,
            rewardedAt: ref.rewarded_at
          });
        }
      }

      // B. Referee Reward (Sign-up Welcome Bonus)
      const refereeReward = Number(ref.referee_reward_amount || 0);
      if (refereeReward > 0 && ref.referred_user_id) {
        const paidToReferee = referralPayoutsList
          .filter((p: any) => p.worker_id === ref.referred_user_id && ['PAID', 'PROCESSING'].includes(p.status))
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

        const pending = Math.max(0, refereeReward - paidToReferee);
        const bank = (bankAccounts || []).find((b: any) => b.worker_id === ref.referred_user_id);
        const walletBal = walletMap.get(ref.referred_user_id) ?? 0;

        if (pending > 0) {
          pendingReferrals.push({
            id: `ref_referee_${ref.id}`,
            referralId: ref.id,
            workerId: ref.referred_user_id,
            captainName: ref.referred?.full_name || 'New Captain',
            phone: ref.referred?.phone || 'N/A',
            role: 'REFEREE',
            typeLabel: 'Sign-up Welcome Bonus',
            referralCode: ref.referral_code,
            counterpartName: ref.referrer?.full_name || 'Inviting Captain',
            counterpartPhone: ref.referrer?.phone || '',
            totalReward: refereeReward,
            disbursedAmount: paidToReferee,
            pendingAmount: pending,
            walletBalance: walletBal,
            bankName: bank?.bank_name || null,
            accountLastFour: bank?.account_last_four || null,
            ifscCode: bank?.ifsc_code || null,
            upiId: bank?.upi_id || null,
            isBankVerified: bank?.is_verified ?? false,
            hasBank: !!bank,
            createdAt: ref.created_at,
            rewardedAt: ref.referee_rewarded_at || ref.rewarded_at
          });
        }
      }
    });

    const formattedPayouts = referralPayoutsList.map((p: any) => {
      const bank = (bankAccounts || []).find((b: any) => b.worker_id === p.worker_id);
      return {
        id: p.id,
        workerId: p.worker_id,
        fullName: p.workers?.users?.full_name || 'Captain',
        phone: p.workers?.users?.phone || 'N/A',
        amount: Number(p.amount || 0),
        status: p.status,
        provider: p.provider,
        providerReference: p.provider_reference,
        providerStatus: p.provider_status,
        utrNumber: p.utr_number,
        payoutMode: p.payout_mode,
        payoutType: p.payout_type || 'REFERRAL_BONUS',
        remarks: p.remarks,
        failureReason: p.failure_reason,
        bankName: bank?.bank_name || 'Bank',
        accountLastFour: bank?.account_last_four || '',
        createdAt: p.created_at,
        processedAt: p.processed_at
      };
    });

    return NextResponse.json({
      success: true,
      pendingReferrals,
      payouts: formattedPayouts,
      captains: Array.from(captainsMap.values())
    });
  } catch (error: any) {
    console.error('[Direct Payout API GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to load payouts' }, { status: 500 });
  }
}

// POST: Execute a direct Cashfree payout to a captain
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: body, errorResponse } = await validateBody(request, directPayoutSchema);
    if (errorResponse) return errorResponse;

    const { workerId, amount, payoutSource, payoutType, preferredMode, remarks } = body;

    // 1. Fetch user & worker info
    const { data: userRec, error: uErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, phone, email')
      .eq('id', workerId)
      .maybeSingle();

    if (uErr || !userRec) {
      return NextResponse.json({ error: 'Worker user account not found.' }, { status: 404 });
    }

    // 2. Fetch captain's bank account
    let { data: bankAccount } = await supabaseAdmin
      .from('worker_bank_accounts')
      .select('*')
      .eq('worker_id', workerId)
      .eq('is_primary', true)
      .maybeSingle();

    if (!bankAccount) {
      const { data: fallbackBank } = await supabaseAdmin
        .from('worker_bank_accounts')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      bankAccount = fallbackBank;
    }

    if (!bankAccount) {
      return NextResponse.json({
        error: 'Captain does not have a registered bank account. Add or verify a bank account first.'
      }, { status: 400 });
    }

    // 3. If deducting from wallet, check wallet balance
    let currentWalletBalance = 0;
    let walletId = '';
    if (payoutSource === 'WALLET_DEDUCTION') {
      const { data: wallet, error: wErr } = await supabaseAdmin
        .from('worker_wallets')
        .select('id, balance')
        .eq('worker_id', workerId)
        .maybeSingle();

      if (wErr || !wallet) {
        return NextResponse.json({ error: 'Captain wallet record not found.' }, { status: 404 });
      }

      currentWalletBalance = Number(wallet.balance || 0);
      walletId = wallet.id;

      if (currentWalletBalance < amount) {
        return NextResponse.json({
          error: `Insufficient wallet balance. Current Balance: ₹${currentWalletBalance.toFixed(2)}, Requested: ₹${amount.toFixed(2)}.`
        }, { status: 400 });
      }
    }

    // 4. Initialize Cashfree Payout Provider
    const provider = new CashfreePayoutProvider();
    const isLive = provider.isLiveEnabled();
    const userName = userRec.full_name || bankAccount.account_holder_name || 'Captain';
    const userPhone = userRec.phone || bankAccount.phone || '';
    const userEmail = userRec.email || bankAccount.email || '';

    const bankAccountWithContact = {
      ...bankAccount,
      phone: userPhone,
      email: userEmail,
      account_holder_name: userName
    };

    // 5. Register / sync Cashfree Contact and Beneficiary
    const contactId = await provider.createContact(workerId, userName, userEmail, userPhone);
    const fundAccountId = await provider.createFundAccount(contactId, bankAccountWithContact);

    await supabaseAdmin
      .from('worker_bank_accounts')
      .update({
        beneficiary_id: fundAccountId,
        provider_contact_id: contactId,
        provider_fund_account_id: fundAccountId,
        updated_at: new Date().toISOString()
      })
      .eq('id', bankAccount.id);

    // 6. Execute Transfer via Cashfree
    const cleanRef = `dp_${Date.now()}_${workerId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)}`;
    const effectiveMode = (preferredMode === 'banktransfer' || !bankAccount.upi_id) ? 'banktransfer' : 'upi';

    let transferResult: any;
    try {
      transferResult = await provider.createPayout(
        fundAccountId,
        amount,
        cleanRef,
        bankAccountWithContact,
        effectiveMode
      );
    } catch (err: any) {
      console.error('[Direct Payout API] Cashfree Transfer failed:', err);
      return NextResponse.json({
        error: `Cashfree Transfer Error: ${err.message || 'Transfer failed at provider'}`
      }, { status: 502 });
    }

    const isSuccess = ['processed', 'SUCCESS', 'SUCCESSFUL', 'simulation_ready'].includes(transferResult.status);
    const isFailed = ['failed', 'rejected', 'FAILED', 'REJECTED'].includes(transferResult.status);
    const finalStatus = isSuccess ? 'PAID' : isFailed ? 'FAILED' : 'PROCESSING';

    const resolvedPayoutType = payoutType || (payoutSource === 'WALLET_DEDUCTION' ? 'WALLET_WITHDRAWAL' : 'DIRECT_BONUS');
    const resolvedRemarks = remarks || (
      payoutSource === 'WALLET_DEDUCTION'
        ? `Captain Wallet withdrawal to ${bankAccount.bank_name} (...${bankAccount.account_last_four})`
        : `Direct promotion bonus to ${bankAccount.bank_name} (...${bankAccount.account_last_four})`
    );

    // 7. Insert Record into payouts table
    const { data: insertedPayout, error: insErr } = await supabaseAdmin
      .from('payouts')
      .insert({
        worker_id: workerId,
        amount: Number(amount.toFixed(2)),
        provider: 'CASHFREE',
        provider_reference: transferResult.providerPayoutId,
        provider_status: transferResult.status?.toUpperCase() || (isSuccess ? 'PROCESSED' : 'PROCESSING'),
        utr_number: transferResult.utr || null,
        status: finalStatus,
        payout_mode: effectiveMode.toUpperCase(),
        payout_type: resolvedPayoutType,
        remarks: resolvedRemarks,
        processed_at: isSuccess ? new Date().toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insErr) {
      console.error('[Direct Payout API] Error recording payout row:', insErr);
    }

    // 8. If WALLET_DEDUCTION and not failed, debit the captain wallet
    let newBalance = currentWalletBalance;
    if (payoutSource === 'WALLET_DEDUCTION' && !isFailed) {
      newBalance = Number((currentWalletBalance - amount).toFixed(2));
      await supabaseAdmin
        .from('worker_wallets')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('worker_id', workerId);

      await supabaseAdmin
        .from('wallet_transactions')
        .insert({
          worker_id: workerId,
          type: 'DEBIT',
          amount: amount,
          balance_before: currentWalletBalance,
          balance_after: newBalance,
          description: `Bank withdrawal to ${bankAccount.bank_name} (...${bankAccount.account_last_four}) - Ref: ${transferResult.providerPayoutId}`
        });
    }

    // 9. Dispatch notification to captain
    try {
      await dispatchNotification({
        userId: workerId,
        type: 'PAYOUT_PROCESSED',
        title: 'Bank Transfer Received! 💸',
        body: `₹${amount.toFixed(2)} has been transferred to your ${bankAccount.bank_name} account (...${bankAccount.account_last_four})${transferResult.utr ? ` with UTR ${transferResult.utr}` : ''}.`,
        data: {
          payoutId: insertedPayout?.id,
          utr: transferResult.utr,
          amount: String(amount)
        }
      });
    } catch (nErr) {
      console.warn('[Direct Payout API] Notification dispatch error:', nErr);
    }

    // 10. Audit log
    try {
      await logAuditAction({
        admin_id: session.user_id,
        action: 'PAYOUT_EXECUTED' as AuditAction,
        target_type: 'payouts',
        target_id: insertedPayout?.id || cleanRef,
        metadata: {
          workerId,
          amount,
          payoutSource,
          payoutType: resolvedPayoutType,
          bankName: bankAccount.bank_name,
          accountLastFour: bankAccount.account_last_four,
          utr: transferResult.utr,
          transferId: transferResult.providerPayoutId,
          isLive
        }
      });
    } catch (aErr) {
      console.warn('[Direct Payout API] Audit log error:', aErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully initiated ₹${amount} payout to ${userName} via Cashfree (${effectiveMode.toUpperCase()})`,
      payout: insertedPayout,
      transferId: transferResult.providerPayoutId,
      utr: transferResult.utr,
      status: finalStatus,
      isLive,
      newWalletBalance: payoutSource === 'WALLET_DEDUCTION' ? newBalance : undefined
    });
  } catch (error: any) {
    console.error('[Direct Payout API POST Error]:', error);
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message || 'Internal server error processing payout' }, { status });
  }
}
