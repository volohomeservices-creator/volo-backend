import 'server-only';
import { supabaseAdmin } from '../supabase-server';
import { logAuditAction } from '../audit';
import { AuditAction } from '@/types';
import { PayoutStatus } from './payout-types';
import { DefaultPayoutProvider } from './payout-provider';
import { ProviderNotConfiguredError } from './payout-errors';
import { dispatchNotification } from '../notification-dispatcher';

export class PayoutService {
  private static provider: DefaultPayoutProvider | null = null;

  private static getProvider(): DefaultPayoutProvider {
    if (!this.provider) {
      this.provider = new DefaultPayoutProvider();
    }
    return this.provider;
  }

  /**
   * Called when an admin marks a Settlement Batch as READY_FOR_PAYOUT
   */
  static async queuePayoutsForBatch(batchId: string, adminId: string) {
    // 1. Fetch settlements in the batch
    const { data: settlements, error: fetchErr } = await supabaseAdmin
      .from('settlement_ledger')
      .select('id, worker_id, net_amount')
      .eq('settlement_batch_id', batchId);

    if (fetchErr) throw fetchErr;
    if (!settlements || settlements.length === 0) return { success: true, count: 0 };

    let createdCount = 0;

    for (const settlement of settlements) {
      if (Number(settlement.net_amount) <= 0) continue; // No payout needed

      const { data: payout, error: insertErr } = await supabaseAdmin
        .from('payouts')
        .insert({
          worker_id: settlement.worker_id,
          settlement_batch_id: batchId,
          settlement_ledger_id: settlement.id,
          amount: settlement.net_amount,
          status: PayoutStatus.READY_FOR_PAYOUT
        })
        .select('id')
        .single();

      if (!insertErr && payout) {
        createdCount++;
        await logAuditAction({
          admin_id: adminId,
          action: 'PAYOUT_CREATED' as AuditAction,
          target_type: 'payouts',
          target_id: payout.id,
          metadata: { amount: settlement.net_amount }
        });
      }
    }

    return { success: true, count: createdCount };
  }

  /**
   * Executes all pending/ready payouts for a given settlement batch via Razorpay Route
   */
  static async executePayoutsForBatch(batchId: string, adminId: string) {
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from('settlement_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchErr || !batch) throw new Error('Settlement batch not found');

    const isLive = process.env.CASHFREE_LIVE_PAYOUTS_ENABLED === 'true';
    const { data: payouts, error: fetchErr } = await supabaseAdmin
      .from('payouts')
      .select('id, worker_id, amount, settlement_ledger_id, status, retry_count, provider_reference')
      .eq('settlement_batch_id', batchId);

    if (fetchErr) throw fetchErr;

    // Actionable payouts: READY_FOR_PAYOUT, QUEUED, PENDING, FAILED, or simulated PROCESSING
    let actionablePayouts = (payouts || []).filter(p =>
      [PayoutStatus.READY_FOR_PAYOUT, PayoutStatus.QUEUED, PayoutStatus.PENDING, PayoutStatus.FAILED].includes(p.status) ||
      (isLive && p.status === PayoutStatus.PROCESSING && p.provider_reference?.startsWith('cf_sim_'))
    );

    // If no actionable payouts found, automatically attempt queueing from batch ledger
    if (!actionablePayouts || actionablePayouts.length === 0) {
      await this.queuePayoutsForBatch(batchId, adminId);
      const { data: requeued } = await supabaseAdmin
        .from('payouts')
        .select('id, worker_id, amount, settlement_ledger_id, status, retry_count, provider_reference')
        .eq('settlement_batch_id', batchId)
        .in('status', [PayoutStatus.READY_FOR_PAYOUT, PayoutStatus.QUEUED, PayoutStatus.PENDING]);
      actionablePayouts = requeued || [];
    }

    if (!actionablePayouts || actionablePayouts.length === 0) {
      return { 
        success: false, 
        processedCount: 0, 
        failedCount: 0, 
        message: 'No pending payouts found for this batch. All disbursements may already be completed.' 
      };
    }

    let processedCount = 0;
    let failedCount = 0;
    const providerName = process.env.CASHFREE_CLIENT_ID ? 'CASHFREE' : 'RAZORPAY_ROUTE';

    for (const payout of actionablePayouts) {
      try {
        // Concurrency Guard: Optimistically lock this payout for 5 minutes
        const now = new Date();
        const lockUntil = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
        const { data: locked, error: lockErr } = await supabaseAdmin
          .from('payouts')
          .update({ 
            execution_lock_until: lockUntil,
            status: PayoutStatus.PROCESSING,
            updated_at: now.toISOString() 
          })
          .eq('id', payout.id)
          .select('id')
          .single();

        if (lockErr || !locked) {
          console.warn(`[PayoutService] Payout ${payout.id} is already locked or being processed. Skipping.`);
          continue;
        }

        let { data: bankAccount } = await supabaseAdmin
          .from('worker_bank_accounts')
          .select('*')
          .eq('worker_id', payout.worker_id)
          .eq('is_primary', true)
          .maybeSingle();

        if (!bankAccount) {
          const { data: fallbackBank } = await supabaseAdmin
            .from('worker_bank_accounts')
            .select('*')
            .eq('worker_id', payout.worker_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          bankAccount = fallbackBank;
        }

        if (!bankAccount) {
          throw new Error('Worker does not have a registered bank account for settlement.');
        }

        const { data: worker } = await supabaseAdmin
          .from('workers')
          .select('id, users:id(full_name, email, phone)')
          .eq('id', payout.worker_id)
          .single();

        const userName = (worker?.users as any)?.full_name || bankAccount?.account_holder_name || 'Service Partner';
        const userEmail = (worker?.users as any)?.email || '';
        const userPhone = (worker?.users as any)?.phone || '';

        const contactId = await this.getProvider().createContact(payout.worker_id, userName, userEmail, userPhone);
        const fundAccountId = await this.getProvider().createFundAccount(contactId, bankAccount);

        if (bankAccount) {
          await supabaseAdmin
            .from('worker_bank_accounts')
            .update({
              beneficiary_id: fundAccountId,
              provider_contact_id: contactId,
              provider_fund_account_id: fundAccountId,
              updated_at: new Date().toISOString()
            })
            .eq('id', bankAccount.id);
        }

        const transferResult = await this.getProvider().createPayout(fundAccountId, Number(payout.amount), payout.id);
        const isSuccess = transferResult.status === 'processed';
        const finalStatus = isSuccess ? PayoutStatus.PAID : PayoutStatus.PROCESSING;

        await supabaseAdmin
          .from('payouts')
          .update({
            provider: providerName,
            provider_reference: transferResult.providerPayoutId,
            provider_status: transferResult.status,
            utr_number: transferResult.utr || null,
            status: finalStatus,
            processed_at: isSuccess ? new Date().toISOString() : null,
            execution_lock_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', payout.id);

        await supabaseAdmin
          .from('payout_attempts')
          .insert({
            payout_id: payout.id,
            attempt_number: (payout.retry_count || 0) + 1,
            request_payload: { fundAccountId, amount: payout.amount, referenceId: payout.id, provider: providerName },
            response_payload: transferResult,
            status: transferResult.status
          });

        if (payout.settlement_ledger_id) {
          await supabaseAdmin
            .from('settlement_ledger')
            .update({
              status: isSuccess ? 'PAID' : 'PROCESSING',
              cashfree_transfer_id: transferResult.providerPayoutId,
              cashfree_reference_id: transferResult.providerPayoutId,
              payout_initiated_at: new Date().toISOString(),
              payout_completed_at: isSuccess ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', payout.settlement_ledger_id);
        }

        await dispatchNotification({
          userId: payout.worker_id,
          type: 'PAYOUT_INITIATED' as any,
          title: isSuccess ? 'Settlement Completed' : 'Settlement Initiated',
          body: `Transfer of ₹${Number(payout.amount).toFixed(2)} ${isSuccess ? 'has been deposited into' : 'is being processed for'} your bank account.`
        });

        processedCount++;
      } catch (err: any) {
        console.error(`[PayoutService] Error processing payout ${payout.id}:`, err);
        failedCount++;

        const isUncertain = err.isUncertain === true;
        const targetStatus = isUncertain ? PayoutStatus.PROCESSING : PayoutStatus.FAILED;

        await supabaseAdmin
          .from('payouts')
          .update({
            status: targetStatus,
            failure_reason: err.message,
            execution_lock_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', payout.id);

        await supabaseAdmin
          .from('payout_attempts')
          .insert({
            payout_id: payout.id,
            attempt_number: (payout.retry_count || 0) + 1,
            request_payload: { amount: payout.amount, provider: providerName },
            response_payload: { error: err.message, isUncertain },
            status: targetStatus.toLowerCase(),
            error_message: err.message
          });
      }
    }

    // Check remaining unpaid in batch
    const { count: remainingUnpaid } = await supabaseAdmin
      .from('payouts')
      .select('*', { count: 'exact', head: true })
      .eq('settlement_batch_id', batchId)
      .neq('status', PayoutStatus.PAID);

    if (remainingUnpaid === 0) {
      await supabaseAdmin
        .from('settlement_batches')
        .update({ status: 'PAID', updated_at: new Date().toISOString() })
        .eq('id', batchId);
    }

    await logAuditAction({
      admin_id: adminId,
      action: AuditAction.SETTLEMENT_PAID,
      target_type: 'settlement_batches',
      target_id: batchId,
      metadata: { processedCount, failedCount, provider: providerName }
    });

    return {
      success: true,
      processedCount,
      failedCount,
      totalCount: payouts.length,
      provider: providerName,
      message: `Processed ${processedCount} payouts via ${providerName} (${failedCount} failed).`
    };
  }

  /**
   * Reconciles uncertain or pending payouts directly against provider
   */
  static async reconcilePayouts() {
    const { data: pendingPayouts } = await supabaseAdmin
      .from('payouts')
      .select('id, provider, provider_reference, settlement_ledger_id, worker_id, amount')
      .in('status', [PayoutStatus.PROCESSING, PayoutStatus.QUEUED])
      .not('provider_reference', 'is', null);

    if (!pendingPayouts || pendingPayouts.length === 0) {
      return { success: true, reconciledCount: 0, message: 'No pending payouts to reconcile.' };
    }

    let reconciledCount = 0;
    for (const p of pendingPayouts) {
      try {
        const statusResult = await this.getProvider().fetchPayoutStatus(p.provider_reference!);
        if (statusResult.status === 'processed') {
          await supabaseAdmin
            .from('payouts')
            .update({
              status: PayoutStatus.PAID,
              utr_number: statusResult.utr,
              provider_status: 'SUCCESS',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', p.id);

          if (p.settlement_ledger_id) {
            await supabaseAdmin
              .from('settlement_ledger')
              .update({
                status: 'PAID',
                payout_completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', p.settlement_ledger_id);
          }

          await dispatchNotification({
            userId: p.worker_id,
            type: 'PAYOUT_INITIATED' as any,
            title: 'Payout Confirmed',
            body: `Your settlement of ₹${Number(p.amount).toFixed(2)} has been confirmed with UTR: ${statusResult.utr || 'Direct Transfer'}.`
          });

          reconciledCount++;
        } else if (statusResult.status === 'failed') {
          await supabaseAdmin
            .from('payouts')
            .update({
              status: PayoutStatus.FAILED,
              failure_reason: statusResult.failureReason || 'Transfer rejected by provider',
              updated_at: new Date().toISOString()
            })
            .eq('id', p.id);
          reconciledCount++;
        }
      } catch (err: any) {
        console.error(`[PayoutService] Error reconciling payout ${p.id}:`, err.message);
      }
    }

    return { success: true, reconciledCount, message: `Reconciled ${reconciledCount} payouts.` };
  }

  /**
   * Execute pending payouts across all active batches
   */
  static async executePendingPayouts() {
    const { data: readyBatches } = await supabaseAdmin
      .from('settlement_batches')
      .select('id')
      .eq('status', 'READY_FOR_PAYOUT');

    if (!readyBatches || readyBatches.length === 0) return { success: true, count: 0 };

    let totalProcessed = 0;
    for (const b of readyBatches) {
      const res = await this.executePayoutsForBatch(b.id, 'system');
      totalProcessed += res.processedCount || 0;
    }

    return { success: true, count: totalProcessed };
  }
}

