import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
    }

    const { data: payouts, error } = await supabaseAdmin
      .from('payouts')
      .select(`
        id,
        worker_id,
        amount,
        status,
        provider,
        provider_reference,
        provider_status,
        utr_number,
        failure_code,
        failure_reason,
        retry_count,
        processed_at,
        created_at,
        updated_at,
        workers:worker_id(
          id,
          users:id(full_name, phone)
        )
      `)
      .eq('settlement_batch_id', batchId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ payouts: payouts || [] });
  } catch (error: any) {
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message || 'Failed to fetch payouts' }, { status });
  }
}

// Reset a FAILED payout back to READY_FOR_PAYOUT so it can be retried
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { payoutId } = await request.json();
    if (!payoutId) return NextResponse.json({ error: 'payoutId is required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('payouts')
      .update({
        status: 'READY_FOR_PAYOUT',
        failure_reason: null,
        failure_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', payoutId)
      .eq('status', 'FAILED')
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Payout not found or not in FAILED status' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Payout reset to READY_FOR_PAYOUT for retry' });
  } catch (error: any) {
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message || 'Failed to reset payout' }, { status });
  }
}
