import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-server';
import { PayoutStatus } from '@/lib/payouts/payout-types';
import { dispatchNotification } from '@/lib/notification-dispatcher';

export const dynamic = 'force-dynamic';

function verifyCashfreeSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!secret) return true; // If no secret configured yet in sandbox/test, allow through
  if (!signature) return false;

  try {
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    const computedHex = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return (
      crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature)) ||
      crypto.timingSafeEqual(Buffer.from(computedHex), Buffer.from(signature))
    );
  } catch (e) {
    return false;
  }
}

export async function GET(request: Request) {
  return NextResponse.json({ status: 'Cashfree payouts webhook endpoint active' }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-cashfree-signature') || request.headers.get('signature');
    const secret = process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET || process.env.CASHFREE_CLIENT_SECRET || '';

    // If it's a test ping or empty ping from Cashfree Dashboard
    if (!rawBody || rawBody.trim() === '' || rawBody === '{}') {
      return NextResponse.json({ status: 'SUCCESS', message: 'Cashfree webhook active' }, { status: 200 });
    }

    // Verify signature if secret configured
    if (process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET && !verifyCashfreeSignature(rawBody, signature, secret)) {
      console.warn('[Cashfree Webhook] Invalid webhook signature rejected.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ status: 'SUCCESS', message: 'Raw ping received' }, { status: 200 });
    }

    // Extract event details (supporting both V1 and V2 snake_case & camelCase payloads)
    const eventType = (payload.event || payload.type || payload.event_type || 'TRANSFER_UPDATE').toUpperCase();
    const transferId = payload.data?.transfer_id || payload.transfer_id || payload.transferId || payload.data?.transferId || payload.data?.transfer?.transferId;
    const referenceId = payload.data?.reference_id || payload.reference_id || payload.referenceId || payload.data?.referenceId || payload.data?.transfer?.referenceId;
    const cfTransferId = payload.data?.cf_transfer_id || payload.cf_transfer_id || payload.data?.cfTransferId || payload.cfTransferId;
    const utr = payload.utr || payload.data?.utr || payload.data?.transfer?.utr || null;
    const status = (payload.status || payload.data?.status || payload.data?.transfer?.status || '').toUpperCase();
    const reason = payload.reason || payload.data?.reason || payload.data?.transfer?.reason || payload.data?.status_description || null;
    const eventId = payload.eventId || payload.id || `${cfTransferId || transferId || referenceId}_${eventType}_${Date.now()}`;

    console.log(`[Cashfree Webhook] Received ${eventType} for transferId=${transferId}, cfTransferId=${cfTransferId}, referenceId=${referenceId}, status=${status}`);

    // Deduplication check
    const { data: existingEvent } = await supabaseAdmin
      .from('payout_webhook_events')
      .select('id, processed')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent && existingEvent.processed) {
      console.log(`[Cashfree Webhook] Event ${eventId} already processed. Skipping.`);
      return NextResponse.json({ status: 'ALREADY_PROCESSED' }, { status: 200 });
    }

    // Record webhook event in audit table
    await supabaseAdmin
      .from('payout_webhook_events')
      .insert({
        provider: 'CASHFREE',
        event_type: eventType,
        payload,
        processed: false,
        event_id: eventId,
      });

    // Find the associated payout record in Volo database
    let query = supabaseAdmin.from('payouts').select('*');
    const matchConditions: string[] = [];
    if (cfTransferId) matchConditions.push(`provider_reference.eq.${cfTransferId}`);
    if (transferId) {
      matchConditions.push(`provider_reference.eq.${transferId}`);
      matchConditions.push(`id.eq.${transferId.replace('trf_', '')}`);
    }
    if (referenceId) {
      matchConditions.push(`provider_reference.eq.${referenceId}`);
      matchConditions.push(`id.eq.${referenceId}`);
    }

    if (matchConditions.length === 0) {
      console.warn('[Cashfree Webhook] No referenceId, transferId, or cfTransferId in payload. Stored audit only.');
      return NextResponse.json({ status: 'RECORDED_NO_MATCH' }, { status: 200 });
    }

    query = query.or(matchConditions.join(','));

    const { data: payoutRecords, error: fetchErr } = await query;
    if (fetchErr || !payoutRecords || payoutRecords.length === 0) {
      console.warn(`[Cashfree Webhook] Payout not found for references: ${matchConditions.join(', ')}`);
      return NextResponse.json({ status: 'RECORDED_UNMATCHED' }, { status: 200 });
    }

    const payout = payoutRecords[0];

    // Terminal State Protection: Never regress a PAID transfer
    if (payout.status === PayoutStatus.PAID && (status === 'PENDING' || status === 'PROCESSING')) {
      console.log(`[Cashfree Webhook] Ignoring regressive status ${status} for already PAID payout ${payout.id}`);
      return NextResponse.json({ status: 'IGNORED_TERMINAL_STATE' }, { status: 200 });
    }

    // Process State Transitions
    const isSuccess = eventType === 'TRANSFER_SUCCESS' || status === 'SUCCESS';
    const isFailed = eventType === 'TRANSFER_FAILED' || eventType === 'TRANSFER_REJECTED' || status === 'FAILED' || status === 'REJECTED';
    const isReversed = eventType === 'TRANSFER_REVERSED' || status === 'REVERSED';

    if (isSuccess) {
      await supabaseAdmin
        .from('payouts')
        .update({
          status: PayoutStatus.PAID,
          provider_status: 'SUCCESS',
          utr_number: utr || payout.utr_number,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.id);

      if (payout.settlement_ledger_id) {
        await supabaseAdmin
          .from('settlement_ledger')
          .update({
            status: 'PAID',
            payout_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payout.settlement_ledger_id);
      }

      await dispatchNotification({
        userId: payout.worker_id,
        type: 'PAYOUT_INITIATED' as any,
        title: 'Settlement Deposited',
        body: `Your settlement of ₹${Number(payout.amount).toFixed(2)} has been successfully deposited into your bank account.`,
      });
    } else if (isFailed) {
      await supabaseAdmin
        .from('payouts')
        .update({
          status: PayoutStatus.FAILED,
          provider_status: 'FAILED',
          failure_reason: reason || 'Transfer failed on provider side',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.id);
    } else if (isReversed) {
      await supabaseAdmin
        .from('payouts')
        .update({
          status: PayoutStatus.REVERSED,
          provider_status: 'REVERSED',
          failure_reason: reason || 'Transfer reversed by banking partner',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payout.id);
    }

    // Mark webhook event as processed
    await supabaseAdmin
      .from('payout_webhook_events')
      .update({ processed: true })
      .eq('event_id', eventId);

    return NextResponse.json({ status: 'SUCCESS', processed: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Cashfree Webhook Handler Error]:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 500 });
  }
}
