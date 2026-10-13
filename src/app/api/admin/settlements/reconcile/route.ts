import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { PayoutService } from '@/lib/payouts/payout-service';

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await PayoutService.reconcilePayouts();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error reconciling payouts:', error);
    return NextResponse.json({ error: error.message || 'Failed to reconcile payouts' }, { status: 500 });
  }
}
