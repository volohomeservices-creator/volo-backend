import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ifsc = (searchParams.get('ifsc') || '').trim().toUpperCase();

    if (!ifsc) {
      return NextResponse.json({ error: 'IFSC code is required' }, { status: 400 });
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return NextResponse.json({ 
        error: 'Invalid IFSC format. Expected 11 characters starting with 4 letters followed by 0 (e.g. HDFC0001234)' 
      }, { status: 400 });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`https://ifsc.razorpay.com/${ifsc}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 404) {
        return NextResponse.json({ 
          valid: false, 
          error: 'IFSC code not found. Please verify with your bank passbook/cheque.' 
        }, { status: 404 });
      }

      if (!res.ok) {
        return NextResponse.json({ 
          valid: false, 
          error: 'Could not verify IFSC code at this time.' 
        }, { status: 502 });
      }

      const data = await res.json();
      return NextResponse.json({
        valid: true,
        ifsc: data.IFSC,
        bank_name: data.BANK,
        branch: data.BRANCH,
        city: data.CITY,
        state: data.STATE
      });
    } catch (fetchErr: any) {
      return NextResponse.json({ 
        valid: false, 
        error: 'IFSC verification service timeout. Please try again.' 
      }, { status: 504 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
