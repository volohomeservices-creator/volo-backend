import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const rawAcc = searchParams.get('account_number') || '';
    const clean = rawAcc.replace(/\D/g, '');
    const len = clean.length;

    if (len < 9 || len > 18) {
      return NextResponse.json({ detected: false, message: 'Account number must be 9-18 digits' });
    }

    const b4 = clean.substring(0, 4);
    const candidates: string[] = [];

    // 1. Canara Bank (16-digit: BBBB10100XXXXX or 14-digit)
    if (len === 16 && clean.substring(4, 9) === '10100') {
      candidates.push(`CNRB000${b4}`);
      candidates.push(`CNRB001${b4}`);
    } else if (len === 14 && clean.startsWith('1')) {
      candidates.push(`CNRB000${b4}`);
    }

    // 2. Punjab National Bank (16-digit)
    if (len === 16) {
      candidates.push(`PUNB0${b4}00`);
    }

    // 3. HDFC Bank (14-digit)
    if (len === 14) {
      candidates.push(`HDFC000${b4}`);
      candidates.push(`HDFC0000${clean.substring(0, 3)}`);
    }

    // 4. ICICI Bank (12-digit)
    if (len === 12) {
      candidates.push(`ICIC000${b4}`);
    }

    // 5. Bank of Baroda (14-digit)
    if (len === 14) {
      candidates.push(`BARB0${b4}`);
    }

    // 6. Kotak Mahindra Bank (14-digit)
    if (len === 14) {
      candidates.push(`KKBK000${b4}`);
    }

    // 7. Federal Bank (14-digit)
    if (len === 14) {
      candidates.push(`FDRL000${b4}`);
    }

    // 8. IndusInd Bank (12-digit)
    if (len === 12) {
      candidates.push(`INDB000${b4}`);
    }

    // 9. Union Bank of India (15-digit)
    if (len === 15) {
      candidates.push(`UBIN05${b4}`);
      candidates.push(`UBIN08${b4}`);
    }

    // Test candidate IFSCs against Razorpay's master open banking registry
    for (const ifsc of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            detected: true,
            ifsc: data.IFSC,
            bank_name: data.BANK,
            branch: data.BRANCH,
            city: data.CITY,
            state: data.STATE
          });
        }
      } catch (err) {
        // continue to next candidate
      }
    }

    return NextResponse.json({ 
      detected: false, 
      message: 'Could not automatically derive IFSC. Please enter your 11-digit IFSC code.' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
