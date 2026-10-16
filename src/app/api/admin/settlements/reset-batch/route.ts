import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { batchId } = await request.json();
    if (!batchId) return NextResponse.json({ error: 'batchId is required' }, { status: 400 });

    // Reset failed/processing payouts in this batch to READY_FOR_PAYOUT
    await supabaseAdmin
      .from('payouts')
      .update({
        status: 'READY_FOR_PAYOUT',
        failure_reason: null,
        failure_code: null,
        execution_lock_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('settlement_batch_id', batchId)
      .neq('status', 'PAID');

    // Update batch to READY_FOR_PAYOUT
    await supabaseAdmin
      .from('settlement_batches')
      .update({
        status: 'READY_FOR_PAYOUT',
        updated_at: new Date().toISOString()
      })
      .eq('id', batchId);

    return NextResponse.json({ success: true, message: 'Batch reset to READY_FOR_PAYOUT' });
  } catch (error: any) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to reset batch' }, { status });
  }
}
