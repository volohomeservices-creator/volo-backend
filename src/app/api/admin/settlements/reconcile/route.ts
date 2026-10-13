import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { PayoutService } = await import('@/lib/payouts/payout-service');
    const result = await PayoutService.reconcilePayouts();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error reconciling payouts:', error);
    const status = error.status || (error.message === 'UNAUTHORIZED' ? 401 : error.message === 'FORBIDDEN' ? 403 : 500);
    return NextResponse.json({ error: error.message || 'Failed to reconcile payouts' }, { status });
  }
}
