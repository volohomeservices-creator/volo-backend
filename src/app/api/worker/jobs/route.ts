import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'worker');
    const workerId = session.user_id;

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'new';

    // 1. Fetch worker location to calculate distance (prefer live location, fallback to profile coordinates)
    const [workerRes, liveLocRes] = await Promise.all([
      supabaseAdmin.from('workers').select('current_lat, current_lng, status, service_category_ids').eq('id', workerId).single(),
      supabaseAdmin.from('worker_live_locations').select('latitude, longitude').eq('worker_id', workerId).maybeSingle()
    ]);

    if (workerRes.error || !workerRes.data) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const liveLoc = liveLocRes.data;
    const current_lat = liveLoc ? Number(liveLoc.latitude) : workerRes.data.current_lat;
    const current_lng = liveLoc ? Number(liveLoc.longitude) : workerRes.data.current_lng;
    const workerCategories = (workerRes.data.service_category_ids || []) as string[];

    if (tab === 'new') {
      // Haversine function in Javascript
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // A. Fetch all rejections for this worker to exclude
      const { data: rejections } = await supabaseAdmin
        .from('worker_job_rejections')
        .select('booking_id')
        .eq('worker_id', workerId);
      
      const rejectedBookingIds = new Set((rejections || []).map(r => r.booking_id));

      // B. Fetch manually assigned bookings for this worker
      const { data: manuallyAssignedBookings, error: manualErr } = await supabaseAdmin
        .from('bookings')
        .select('*, service_items(name, category_id), customer:users!bookings_customer_id_fkey(full_name)')
        .eq('status', 'WORKER_ASSIGNED')
        .eq('worker_id', workerId);

      if (manualErr) throw manualErr;

      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      // C. Fetch all active broadcasting bookings that have NOT expired
      const { data: broadcastingBookings, error: broadcastErr } = await supabaseAdmin
        .from('bookings')
        .select(`
          *,
          service_items(name, category_id),
          customer:users!bookings_customer_id_fkey(full_name),
          assignment_queue!inner(status, group_workers, group_expires_at)
        `)
        .eq('status', 'PENDING_ASSIGNMENT')
        .eq('assignment_queue.status', 'BROADCASTING')
        .gt('assignment_queue.group_expires_at', nowIso);

      if (broadcastErr) throw broadcastErr;

      // Lazy cleanup of any stale broadcasting queues in the background
      supabaseAdmin
        .from('assignment_queue')
        .update({ status: 'FAILED', updated_at: nowIso })
        .eq('status', 'BROADCASTING')
        .lt('group_expires_at', nowIso)
        .then(() => {});

      // D. Filter broadcasting bookings in memory:
      // - Must not be expired (2-minute window)
      // - Worker must be in the current group of the queue
      // - Worker must not have rejected this booking
      // - Booking category must match worker's assigned categories
      const eligibleBroadcastBookings = (broadcastingBookings || []).filter((b: any) => {
        if (rejectedBookingIds.has(b.id)) return false;

        const expiresAtMs = b.assignment_queue?.group_expires_at 
          ? new Date(b.assignment_queue.group_expires_at).getTime() 
          : new Date(b.created_at).getTime() + 120000;

        if (expiresAtMs <= nowMs) return false;

        if (workerCategories.length > 0 && b.service_items?.category_id) {
          if (!workerCategories.includes(b.service_items.category_id)) {
            return false;
          }
        }

        const groupWorkers = b.assignment_queue?.group_workers || [];
        const isInGroup = groupWorkers.some((gw: any) => gw.worker_id === workerId);
        return isInGroup;
      });

      const filteredManualBookings = (manuallyAssignedBookings || []).filter((b: any) => {
        // Enforce 2 minutes window (120,000 ms) for manual assignments
        const assignedTime = new Date(b.updated_at || b.created_at).getTime();
        if (nowMs - assignedTime > 120000) return false;

        if (workerCategories.length > 0 && b.service_items?.category_id) {
          return workerCategories.includes(b.service_items.category_id);
        }
        return true;
      });

      // E. Merge manually assigned and eligible broadcast bookings
      const mergedBookings = [
        ...filteredManualBookings,
        ...eligibleBroadcastBookings
      ];

      // F. Map and sort by distance
      const jobs = mergedBookings.map((b: any) => {
        let distance = 0.0;
        if (current_lat !== null && current_lng !== null && b.lat !== null && b.lng !== null) {
          distance = Number(calculateDistance(current_lat, current_lng, b.lat, b.lng).toFixed(1));
        }
        return {
          id: b.id,
          booking_code: b.booking_code || `#BK${b.id.substring(0, 8).toUpperCase()}`,
          booking_type: b.booking_type || (b.scheduled_at ? 'SCHEDULED' : 'INSTANT'),
          service_name: b.service_items?.name || 'Home Service',
          customer_first_name: b.customer?.full_name ? b.customer.full_name.split(' ')[0] : 'Client',
          locality: b.address_line ? b.address_line.split(',')[0] : 'Nearby',
          distance_km: distance,
          scheduled_at: b.scheduled_at,
          created_at: b.created_at,
          estimated_earnings: Number((b.total_amount * 0.85).toFixed(2)),
          status: b.status,
          expiresAt: b.assignment_queue?.group_expires_at || new Date(new Date(b.updated_at || b.created_at).getTime() + 120000).toISOString()
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km);

      return NextResponse.json({ jobs });

    } else if (tab === 'upcoming') {
      // Confirmed bookings assigned to/accepted by worker scheduled for the future
      const now = new Date().toISOString();
      const { data: bookings, error: bookingsErr } = await supabaseAdmin
        .from('bookings')
        .select('*, service_items(name), customer:users!bookings_customer_id_fkey(full_name)')
        .eq('worker_id', workerId)
        .eq('status', 'WORKER_ACCEPTED')
        .not('scheduled_at', 'is', null)
        .gt('scheduled_at', now)
        .order('scheduled_at', { ascending: true });

      if (bookingsErr) throw bookingsErr;

      const jobs = (bookings || []).map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code || `#BK${b.id.substring(0, 8).toUpperCase()}`,
        booking_type: b.booking_type || 'SCHEDULED',
        service_name: b.service_items?.name || 'Home Service',
        customer_first_name: b.customer?.full_name ? b.customer.full_name.split(' ')[0] : 'Client',
        locality: b.address_line ? b.address_line.split(',')[0] : 'Nearby',
        scheduled_at: b.scheduled_at,
        created_at: b.created_at,
        status: b.status,
        estimated_earnings: Number((b.total_amount * 0.85).toFixed(2))
      }));

      return NextResponse.json({ jobs });

    } else if (tab === 'active') {
      // In-progress, on the way, arrived, or instant jobs accepted for immediate fulfillment
      const { data: bookings, error: bookingsErr } = await supabaseAdmin
        .from('bookings')
        .select('*, service_items(name), customer:users!bookings_customer_id_fkey(full_name)')
        .eq('worker_id', workerId)
        .in('status', ['WORKER_ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS']);

      if (bookingsErr) throw bookingsErr;

      const now = new Date();
      // Filter out future scheduled bookings from active jobs
      const activeBookings = (bookings || []).filter((b: any) => {
        if (b.status === 'WORKER_ACCEPTED' && b.scheduled_at && new Date(b.scheduled_at) > now) {
          return false; // This is upcoming, not active
        }
        return true;
      });

      const jobs = activeBookings.map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code || `#BK${b.id.substring(0, 8).toUpperCase()}`,
        booking_type: b.booking_type || (b.scheduled_at ? 'SCHEDULED' : 'INSTANT'),
        service_name: b.service_items?.name || 'Home Service',
        customer_first_name: b.customer?.full_name ? b.customer.full_name.split(' ')[0] : 'Client',
        locality: b.address_line ? b.address_line.split(',')[0] : 'Nearby',
        scheduled_at: b.scheduled_at,
        created_at: b.created_at,
        status: b.status,
        estimated_earnings: Number((b.total_amount * 0.85).toFixed(2))
      }));

      return NextResponse.json({ jobs });

    } else if (tab === 'completed') {
      const { data: bookings, error: bookingsErr } = await supabaseAdmin
        .from('bookings')
        .select('*, service_items(name), customer:users!bookings_customer_id_fkey(full_name)')
        .eq('worker_id', workerId)
        .eq('status', 'COMPLETED')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (bookingsErr) throw bookingsErr;

      const jobs = (bookings || []).map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code || `#BK${b.id.substring(0, 8).toUpperCase()}`,
        booking_type: b.booking_type || (b.scheduled_at ? 'SCHEDULED' : 'INSTANT'),
        service_name: b.service_items?.name || 'Home Service',
        customer_first_name: b.customer?.full_name ? b.customer.full_name.split(' ')[0] : 'Client',
        locality: b.address_line ? b.address_line.split(',')[0] : 'Nearby',
        scheduled_at: b.scheduled_at,
        created_at: b.created_at,
        status: b.status,
        estimated_earnings: Number((b.total_amount * 0.85).toFixed(2))
      }));

      return NextResponse.json({ jobs });

    } else if (tab === 'cancelled') {
      const { data: bookings, error: bookingsErr } = await supabaseAdmin
        .from('bookings')
        .select('*, service_items(name), customer:users!bookings_customer_id_fkey(full_name)')
        .eq('worker_id', workerId)
        .eq('status', 'CANCELLED')
        .order('created_at', { ascending: false })
        .limit(20);

      if (bookingsErr) throw bookingsErr;

      const jobs = (bookings || []).map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code || `#BK${b.id.substring(0, 8).toUpperCase()}`,
        booking_type: b.booking_type || (b.scheduled_at ? 'SCHEDULED' : 'INSTANT'),
        service_name: b.service_items?.name || 'Home Service',
        customer_first_name: b.customer?.full_name ? b.customer.full_name.split(' ')[0] : 'Client',
        locality: b.address_line ? b.address_line.split(',')[0] : 'Nearby',
        scheduled_at: b.scheduled_at,
        created_at: b.created_at,
        status: b.status,
        estimated_earnings: Number((b.total_amount * 0.85).toFixed(2))
      }));

      return NextResponse.json({ jobs });

    } else {
      // Tab is all (or history fallback)
      const { data: bookings, error: bookingsErr } = await supabaseAdmin
        .from('bookings')
        .select('*, service_items(name), customer:users!bookings_customer_id_fkey(full_name)')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })
        .limit(30);

      if (bookingsErr) throw bookingsErr;

      const jobs = (bookings || []).map((b: any) => ({
        id: b.id,
        booking_code: b.booking_code || `#BK${b.id.substring(0, 8).toUpperCase()}`,
        booking_type: b.booking_type || (b.scheduled_at ? 'SCHEDULED' : 'INSTANT'),
        service_name: b.service_items?.name || 'Home Service',
        customer_first_name: b.customer?.full_name ? b.customer.full_name.split(' ')[0] : 'Client',
        locality: b.address_line ? b.address_line.split(',')[0] : 'Nearby',
        scheduled_at: b.scheduled_at,
        created_at: b.created_at,
        status: b.status,
        estimated_earnings: Number((b.total_amount * 0.85).toFixed(2))
      }));

      return NextResponse.json({ jobs });
    }
  } catch (error: any) {
    console.error('Error fetching worker jobs:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
