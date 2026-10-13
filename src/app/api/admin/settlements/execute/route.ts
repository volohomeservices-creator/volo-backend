import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { PayoutService } from '@/lib/payouts/payout-service';

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { batchId } = body;

    if (!batchId) {
      return NextResponse.json({ error: 'Missing batchId' }, { status: 400 });
    }

    const result = await PayoutService.executePayoutsForBatch(batchId, session.user_id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing payouts for batch:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute payouts' }, { status: 500 });
  }
}
