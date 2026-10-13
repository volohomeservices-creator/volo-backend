import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = (searchParams.get('tab') || 'ALL').toUpperCase();

    // 1. Fetch batches
    const { data: batchesData } = await supabaseAdmin
      .from('settlement_batches')
      .select('*')
      .order('created_at', { ascending: false });

    // 2. Fetch ledger with workers and bookings
    const { data: ledgerData } = await supabaseAdmin
      .from('settlement_ledger')
      .select(`
        id,
        worker_id,
        booking_id,
        gross_amount,
        commission_amount,
        net_amount,
        status,
        created_at,
        settlement_batch_id,
        updated_at,
        workers:worker_id(
          id,
          rating,
          users:id(full_name, phone)
        ),
        bookings:booking_id(
          id,
          total_amount,
          service_items(name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    // Fallback if workers join syntax differs
    let finalLedger = ledgerData;
    if (!ledgerData || ledgerData.length === 0) {
      const { data: rawLedger } = await supabaseAdmin
        .from('settlement_ledger')
        .select('*, workers(users(full_name, phone))')
        .order('created_at', { ascending: false })
        .limit(100);
      finalLedger = rawLedger || [];
    }

    // 3. Compute Overview Metrics
    let batchPending = 0;
    let batchReady = 0;
    let batchPaid = 0;
    let totalComm = 0;
    let totalEarn = 0;

    (batchesData || []).forEach((b: any) => {
      totalComm += Number(b.commission_amount || 0);
      totalEarn += Number(b.net_amount || 0);
      if (b.status === 'PROCESSING') batchPending++;
      if (b.status === 'READY_FOR_PAYOUT') batchReady++;
      if (b.status === 'PAID') batchPaid++;
    });

    // Also factor in pending ledger entries not yet batched
    let unbatchedPendingGross = 0;
    let unbatchedPendingComm = 0;
    let unbatchedPendingNet = 0;
    let unbatchedCount = 0;

    (finalLedger || []).forEach((l: any) => {
      if (l.status === 'PENDING' && !l.settlement_batch_id) {
        unbatchedPendingGross += Number(l.gross_amount || 0);
        unbatchedPendingComm += Number(l.commission_amount || 0);
        unbatchedPendingNet += Number(l.net_amount || 0);
        unbatchedCount++;
      }
    });

    const overview = {
      pending: batchPending + (unbatchedCount > 0 ? 1 : 0),
      ready: batchReady,
      paid: batchPaid,
      totalComm: Number((totalComm + unbatchedPendingComm).toFixed(2)),
      totalEarn: Number((totalEarn + unbatchedPendingNet).toFixed(2)),
      unbatchedCount,
      unbatchedPendingNet: Number(unbatchedPendingNet.toFixed(2))
    };

    return NextResponse.json({
      overview,
      batches: batchesData || [],
      ledger: finalLedger || []
    });
  } catch (error: any) {
    console.error('Admin settlements API error:', error);
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let batchType: string = 'WEDNESDAY';
    try {
      const body = await request.json();
      if (body?.batch_type) {
        batchType = body.batch_type.toUpperCase();
      } else {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        batchType = days[new Date().getDay()];
      }
    } catch {
      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      batchType = days[new Date().getDay()];
    }

    const { generateSettlementBatch } = await import('@/lib/settlement-engine');
    const result = await generateSettlementBatch(batchType);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Admin generate settlement batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate batch' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { batchId, batch_type, batch_reference, status } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    const updateFields: any = { updated_at: new Date().toISOString() };
    if (batch_type) updateFields.batch_type = String(batch_type).toUpperCase();
    if (batch_reference) updateFields.batch_reference = String(batch_reference).trim();
    if (status) updateFields.status = String(status).toUpperCase();

    const { data, error } = await supabaseAdmin
      .from('settlement_batches')
      .update(updateFields)
      .eq('id', batchId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Settlement batch updated successfully', 
      batch: data 
    });
  } catch (error: any) {
    console.error('Admin update batch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update batch' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    // Check if batch exists and verify its status
    const { data: batch, error: fetchErr } = await supabaseAdmin
      .from('settlement_batches')
      .select('id, status, batch_reference')
      .eq('id', batchId)
      .single();

    if (fetchErr || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status === 'PAID') {
      return NextResponse.json({ error: 'Cannot delete a completed/paid settlement batch.' }, { status: 400 });
    }

    // 1. Release ledger records back to PENDING and unset settlement_batch_id
    await supabaseAdmin
      .from('settlement_ledger')
      .update({ settlement_batch_id: null, status: 'PENDING' })
      .eq('settlement_batch_id', batchId);

    // 2. Delete any created payouts for this batch
    await supabaseAdmin
      .from('payouts')
      .delete()
      .eq('settlement_batch_id', batchId);

    // 3. Delete the settlement batch record
    const { error: delErr } = await supabaseAdmin
      .from('settlement_batches')
      .delete()
      .eq('id', batchId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Batch ${batch.batch_reference} deleted successfully. Associated ledger items have been reverted to PENDING.` 
    });
  } catch (error: any) {
    console.error('Admin delete batch error:', error);
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message || 'Failed to delete batch' }, { status });
  }
}

