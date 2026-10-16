import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { batchId, preferredMode } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
    }

    const { PayoutService } = await import('@/lib/payouts/payout-service');
    const result = await PayoutService.executePayoutsForBatch(batchId, session.user_id, {
      preferredMode: preferredMode === 'banktransfer' ? 'banktransfer' : 'upi'
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing payouts for batch:', error);
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message || 'Failed to execute payouts' }, { status });
  }
}
