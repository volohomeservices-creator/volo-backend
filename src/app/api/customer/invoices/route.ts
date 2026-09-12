import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const customerId = session.user_id;

    // Fetch invoices for this customer with linked booking & service item info
    const { data: invoices, error } = await supabaseAdmin
      .from('invoices')
      .select('*, bookings(address_line, service_items(name), created_at)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error fetching invoices:', error);
      throw error;
    }

    return NextResponse.json({ invoices: invoices || [] });
  } catch (error: any) {
    console.error('Error fetching customer invoices:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
