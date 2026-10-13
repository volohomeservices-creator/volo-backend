import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId parameter' }, { status: 400 });
    }

    // 1. Fetch batch
    const { data: batch, error: bErr } = await supabaseAdmin
      .from('settlement_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (bErr || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // 2. Fetch all ledger items in this batch
    const { data: items, error: iErr } = await supabaseAdmin
      .from('settlement_ledger')
      .select(`
        id,
        worker_id,
        booking_id,
        gross_amount,
        commission_amount,
        net_amount,
        status,
        razorpayx_transfer_id,
        created_at,
        workers:worker_id(
          id,
          users:id(full_name, phone)
        )
      `)
      .eq('settlement_batch_id', batchId);

    if (iErr) throw iErr;

    // 3. Fetch bank details for these workers
    const workerIds = Array.from(new Set((items || []).map((it: any) => it.worker_id)));
    let bankMap = new Map();
    if (workerIds.length > 0) {
      const { data: banks } = await supabaseAdmin
        .from('worker_bank_accounts')
        .select('worker_id, bank_name, account_last_four, ifsc_code, is_verified, provider_fund_account_id')
        .in('worker_id', workerIds);

      (banks || []).forEach((b: any) => {
        bankMap.set(b.worker_id, b);
      });
    }

    // 4. Group by worker to calculate exact disbursals per partner
    const workerGroups = new Map();

    (items || []).forEach((it: any) => {
      const wId = it.worker_id;
      const bank = bankMap.get(wId);
      const wName = it.workers?.users?.full_name || 'Service Partner';
      const wPhone = it.workers?.users?.phone || '';

      if (!workerGroups.has(wId)) {
        workerGroups.set(wId, {
          workerId: wId,
          workerName: wName,
          workerPhone: wPhone,
          bankName: bank?.bank_name || 'Registered Bank',
          accountLastFour: bank?.account_last_four || 'XXXX',
          ifscCode: bank?.ifsc_code || '',
          isBankVerified: !!bank?.is_verified,
          routeAccountId: bank?.provider_fund_account_id || null,
          grossAmount: 0,
          commissionAmount: 0,
          netAmount: 0,
          bookingCount: 0,
          status: it.status,
          transferId: it.razorpayx_transfer_id || null,
          bookings: []
        });
      }

      const curr = workerGroups.get(wId);
      curr.grossAmount += Number(it.gross_amount || 0);
      curr.commissionAmount += Number(it.commission_amount || 0);
      curr.netAmount += Number(it.net_amount || 0);
      curr.bookingCount += 1;
      if (it.razorpayx_transfer_id) curr.transferId = it.razorpayx_transfer_id;
      curr.bookings.push({
        bookingId: it.booking_id,
        gross: Number(it.gross_amount || 0),
        commission: Number(it.commission_amount || 0),
        net: Number(it.net_amount || 0)
      });
    });

    const workersList = Array.from(workerGroups.values());

    return NextResponse.json({
      success: true,
      batch,
      workers: workersList
    });
  } catch (err: any) {
    console.error('Error fetching batch itemized workers:', err);
    const status = err.status || (err.message === 'UNAUTHORIZED' ? 401 : err.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}
