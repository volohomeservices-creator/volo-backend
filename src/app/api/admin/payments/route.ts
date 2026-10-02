import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'admin');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const status = (searchParams.get('status') || '').trim();
    const paymentMode = (searchParams.get('payment_mode') || '').trim();

    let query = supabaseAdmin
      .from('payments')
      .select(`
        id,
        amount,
        admin_commission,
        worker_share,
        payment_mode,
        status,
        created_at,
        paid_at,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        customer_id,
        customer:users!payments_customer_id_fkey(id, full_name, phone, email),
        bookings(id, status, total_amount, service_items(name))
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (paymentMode) {
      query = query.eq('payment_mode', paymentMode);
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error('Error fetching admin payments:', error);
      // Fallback query without joins if relationship alias errors
      const { data: rawPayments, error: rawError } = await supabaseAdmin
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (rawError) throw rawError;

      return NextResponse.json({
        payments: rawPayments || [],
        total: rawPayments?.length || 0
      });
    }

    let result = (payments || []).map((p: any) => ({
      id: p.id,
      amount: Number(p.amount || 0),
      admin_commission: Number(p.admin_commission || 0),
      worker_share: Number(p.worker_share || 0),
      payment_mode: p.payment_mode || 'ONLINE',
      status: p.status || 'PENDING',
      created_at: p.created_at,
      paid_at: p.paid_at,
      razorpay_order_id: p.razorpay_order_id,
      razorpay_payment_id: p.razorpay_payment_id,
      customer_name: p.customer?.full_name || 'Customer',
      customer_phone: p.customer?.phone,
      customer_email: p.customer?.email,
      booking_id: p.bookings?.id || p.booking_id,
      booking_status: p.bookings?.status,
      service_name: p.bookings?.service_items?.name,
      bookings: p.bookings ? { id: p.bookings.id } : null,
      users: p.customer ? { full_name: p.customer.full_name } : null
    }));

    // Client-side search filtering if provided
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p: any) =>
        p.id.toLowerCase().includes(q) ||
        (p.customer_name && p.customer_name.toLowerCase().includes(q)) ||
        (p.customer_phone && p.customer_phone.toLowerCase().includes(q)) ||
        (p.razorpay_order_id && p.razorpay_order_id.toLowerCase().includes(q)) ||
        (p.booking_id && p.booking_id.toLowerCase().includes(q))
      );
    }

    // Dynamic metrics
    const successPayments = result.filter((p: any) => ['SUCCESS', 'CAPTURED', 'PAID', 'COMPLETED'].includes(p.status.toUpperCase()));
    const pendingPayments = result.filter((p: any) => p.status.toUpperCase() === 'PENDING');
    const failedPayments = result.filter((p: any) => p.status.toUpperCase() === 'FAILED');
    const refundedPayments = result.filter((p: any) => p.status.toUpperCase() === 'REFUNDED');

    const metrics = {
      successSum: successPayments.reduce((acc: number, p: any) => acc + p.amount, 0),
      successCount: successPayments.length,
      pendingSum: pendingPayments.reduce((acc: number, p: any) => acc + p.amount, 0),
      pendingCount: pendingPayments.length,
      failedSum: failedPayments.reduce((acc: number, p: any) => acc + p.amount, 0),
      failedCount: failedPayments.length,
      refundedSum: refundedPayments.reduce((acc: number, p: any) => acc + p.amount, 0),
      refundedCount: refundedPayments.length,
    };

    return NextResponse.json({
      payments: result,
      metrics,
      total: result.length
    });
  } catch (error: any) {
    console.error('Admin payments API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
