import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'customer');
    const customerId = session.user_id;

    // Fetch user details for profile completeness (optimized select fields)
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, avatar_url, volo_coins')
      .eq('id', customerId)
      .single();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch all bookings for this customer (optimized select fields)
    const { data: bookings, error: bookingsErr } = await supabaseAdmin
      .from('bookings')
      .select('id, customer_id, worker_id, service_item_id, booking_type, payment_mode, status, address_line, lat, lng, scheduled_at, started_at, completed_at, total_amount, notes, otp, created_at, updated_at, service_items(name), workers(users(full_name), worker_live_locations_approx(latitude, longitude))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (bookingsErr) throw bookingsErr;

    // Fetch recent reviews by this customer (optimized select fields)
    const { data: reviews, error: reviewsErr } = await supabaseAdmin
      .from('reviews')
      .select('id, booking_id, customer_id, worker_id, rating, comment:review_text, created_at, bookings(service_items(name))')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (reviewsErr) throw reviewsErr;

    // Calculate metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
    
    // Pending includes PENDING_ASSIGNMENT, WORKER_ASSIGNED, or WORKER_ACCEPTED
    const pendingBookings = bookings.filter(b => 
      b.status === 'PENDING_ASSIGNMENT' || 
      b.status === 'WORKER_ASSIGNED' || 
      b.status === 'WORKER_ACCEPTED'
    ).length;

    // Upcoming & active booked services: bookings that are not completed or cancelled
    const upcomingBookings = bookings.filter(b => 
      b.status !== 'COMPLETED' && 
      b.status !== 'CANCELLED'
    ).length;

    // Active Bookings: any open, assigned, or in-flight bookings
    const activeList = bookings.filter(b => 
      b.status !== 'COMPLETED' && 
      b.status !== 'CANCELLED'
    );

    // Profile completion calculation for customer:
    // Fields tracked: phone (guaranteed), full_name, email, default address
    let completedFields = 1; // phone number is guaranteed
    const totalFields = 4;
    if (user.full_name) completedFields++;
    if (user.email) completedFields++;
    
    // Check if default customer_address exists
    const { data: defaultAddr } = await supabaseAdmin
      .from('customer_addresses')
      .select('id, address')
      .eq('customer_id', customerId)
      .eq('is_default', true)
      .maybeSingle();

    if (defaultAddr && defaultAddr.address) completedFields++;

    const profileCompletion = Math.min(100, Math.round((completedFields / totalFields) * 100));

    // Fetch all active promo codes
    const { data: promos } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    const now = new Date();
    const activePromos = (promos || []).filter(p => !p.expires_at || new Date(p.expires_at) > now);

    return NextResponse.json({
      user: {
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        email: user.email,
        volo_coins: user.volo_coins,
        has_address: !!(defaultAddr && defaultAddr.address)
      },
      profileCompletion,
      metrics: {
        total: totalBookings,
        completed: completedBookings,
        pending: pendingBookings,
        upcoming: upcomingBookings
      },
      upcomingBookingsList: bookings.filter(b => 
        b.status !== 'COMPLETED' && 
        b.status !== 'CANCELLED'
      ),
      activeBookings: activeList,
      recentBookings: bookings,
      recentReviews: reviews || [],
      activePromos: activePromos.map(p => ({
        id: p.id,
        code: p.code,
        description: p.description,
        discount_type: p.discount_type,
        discount_value: p.discount_value
      }))
    });
  } catch (error: any) {
    console.error('Error fetching customer dashboard:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
