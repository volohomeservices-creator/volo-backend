import { NextResponse } from 'next/server';
import { calculateCustomerCharges, getActivePlatformFeeSetting } from '@/lib/pricing-engine';

export const dynamic = 'force-dynamic';

/**
 * Public/authenticated calculation endpoint for customer checkout and admin live preview.
 */
export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { serviceAmount, serviceId, categoryId, configOverride } = body;

    const breakdown = await calculateCustomerCharges({
      serviceAmount: Number(serviceAmount || 0),
      serviceId,
      categoryId,
      configOverride,
    });

    return NextResponse.json(breakdown, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error: any) {
    console.error('Error calculating customer pricing breakdown:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal pricing calculation error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const amountParam = url.searchParams.get('amount') || url.searchParams.get('serviceAmount') || '0';
    const serviceAmount = Math.max(0, parseFloat(amountParam));

    const breakdown = await calculateCustomerCharges({
      serviceAmount,
    });

    return NextResponse.json(breakdown, {
      headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal pricing calculation error' },
      { status: 500 }
    );
  }
}
