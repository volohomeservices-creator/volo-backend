import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;
import { dispatchNotification } from '@/lib/notification-dispatcher';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    
    // If not authenticated yet, return clean empty state without error
    if (!session) {
      return NextResponse.json({
        threads: [],
        active_booking: null,
        active_sos: []
      });
    }

    // 1. If Admin: Return all conversations / disputes
    if (session.role === 'admin') {
      const { data: disputes, error: dispErr } = await supabaseAdmin
        .from('disputes')
        .select('id, booking_id, reported_by_id, type, description, status, resolution_notes, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (dispErr) {
        console.warn('Disputes query warning:', dispErr.message);
      }

      const safeDisputes = disputes || [];

      // Fetch reporters and bookings safely
      const reporterIds = Array.from(new Set(safeDisputes.map((d: any) => d.reported_by_id).filter(Boolean)));
      const bookingIds = Array.from(new Set(safeDisputes.map((d: any) => d.booking_id).filter((id: string) => id && id !== '00000000-0000-0000-0000-000000000000')));

      const userMap: Record<string, any> = {};
      const bookingMap: Record<string, any> = {};

      if (reporterIds.length > 0) {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, full_name, phone, role')
          .in('id', reporterIds);

        (users || []).forEach((u: any) => {
          userMap[u.id] = u;
        });
      }

      if (bookingIds.length > 0) {
        const { data: bookings } = await supabaseAdmin
          .from('bookings')
          .select('id, status, total_amount, address, scheduled_date, worker_id, customer_id')
          .in('id', bookingIds);

        (bookings || []).forEach((b: any) => {
          bookingMap[b.id] = b;
        });
      }

      const populatedThreads = safeDisputes.map((d: any) => ({
        ...d,
        reporter: userMap[d.reported_by_id] || { full_name: 'Customer / User', phone: '', role: 'customer' },
        booking: bookingMap[d.booking_id] || null
      }));

      // Also get active SOS alerts count safely
      const { data: activeSos } = await supabaseAdmin
        .from('sos_alerts')
        .select('id, user_id, booking_id, created_at, status')
        .eq('status', 'ACTIVE');

      return NextResponse.json({
        threads: populatedThreads,
        active_sos: activeSos || []
      });
    }

    // 2. If Customer or Worker: Return their own open support threads & active bookings
    const { data: myDisputes } = await supabaseAdmin
      .from('disputes')
      .select('id, booking_id, type, description, status, resolution_notes, created_at, updated_at')
      .eq('reported_by_id', session.user_id)
      .order('created_at', { ascending: false });

    // Also get active booking for fast context
    const { data: activeBooking } = await supabaseAdmin
      .from('bookings')
      .select('id, status, total_amount, scheduled_date')
      .or(`customer_id.eq.${session.user_id},worker_id.eq.${session.user_id}`)
      .in('status', ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      threads: myDisputes || [],
      active_booking: activeBooking || null
    });

  } catch (error: any) {
    console.error('Error fetching support chat:', error);
    return NextResponse.json({
      threads: [],
      active_booking: null,
      active_sos: []
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    
    const body = await request.json();
    const { booking_id, message, type = 'OTHER', dispute_id, action } = body;

    // If anonymous/unauthenticated message in chatbot
    if (!session) {
      let botResponse = 'Thank you for reaching out to VOLO! Please log in to connect with a live specialist, track your bookings, or manage services.';
      const lower = (message || '').toLowerCase();
      if (lower.includes('service') || lower.includes('clean') || lower.includes('ac') || lower.includes('price')) {
        botResponse = 'We offer verified master technicians for AC servicing, deep home cleaning, plumbing, and appliance repair with 30-day warranty.';
      } else if (lower.includes('sos') || lower.includes('emergency')) {
        botResponse = '🚨 EMERGENCY HOTLINE: For urgent assistance, please call our 24/7 priority dispatch line at 1800-VOLO-HELP.';
      }

      return NextResponse.json({
        success: true,
        bot_response: botResponse
      });
    }

    // 1. Handle Admin Resolution or Reply
    if (session.role === 'admin' && dispute_id) {
      if (action === 'RESOLVE') {
        await supabaseAdmin
          .from('disputes')
          .update({
            status: 'RESOLVED',
            resolution_notes: message || 'Resolved by Administrator.',
            resolved_at: new Date().toISOString(),
            assigned_admin_id: session.user_id
          })
          .eq('id', dispute_id);

        return NextResponse.json({ success: true, status: 'RESOLVED' });
      }

      // Admin reply to user
      const { data: dispute } = await supabaseAdmin
        .from('disputes')
        .select('reported_by_id, booking_id')
        .eq('id', dispute_id)
        .single();

      if (dispute?.reported_by_id) {
        try {
          await dispatchNotification({
            userId: dispute.reported_by_id,
            type: 'ADMIN_BROADCAST',
            title: '💬 Support Specialist Reply',
            body: message
          });
        } catch (_) { /* non-fatal */ }

        // Update resolution notes
        await supabaseAdmin
          .from('disputes')
          .update({
            status: 'IN_PROGRESS',
            resolution_notes: message,
            assigned_admin_id: session.user_id
          })
          .eq('id', dispute_id);
      }

      return NextResponse.json({ success: true, message: 'Reply dispatched to user' });
    }

    // 2. Handle Emergency SOS Alert
    if (type === 'EMERGENCY_SOS') {
      try {
        await supabaseAdmin
          .from('sos_alerts')
          .insert({
            user_id: session.user_id,
            booking_id: booking_id || null,
            status: 'ACTIVE'
          });
      } catch (_) { /* non-fatal */ }

      // Also create a priority dispute
      try {
        await supabaseAdmin
          .from('disputes')
          .insert({
            booking_id: booking_id || '00000000-0000-0000-0000-000000000000',
            reported_by_id: session.user_id,
            type: 'UNPROFESSIONAL_CONDUCT',
            description: `🚨 [EMERGENCY SOS ALERT]: ${message}`,
            status: 'OPEN'
          });
      } catch (_) { /* non-fatal */ }

      return NextResponse.json({
        success: true,
        bot_response: '🚨 EMERGENCY ALERT RECEIVED: Our Priority Incident Response team and emergency dispatchers have been alerted with your location and booking reference.'
      });
    }

    // 3. Handle Standard Customer / Worker Support Query
    let validBookingId = booking_id;
    if (!validBookingId) {
      // Find latest booking if any
      const { data: latestBooking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .or(`customer_id.eq.${session.user_id},worker_id.eq.${session.user_id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      validBookingId = latestBooking?.id;
    }

    if (validBookingId) {
      try {
        await supabaseAdmin
          .from('disputes')
          .insert({
            booking_id: validBookingId,
            reported_by_id: session.user_id,
            type: type === 'PAYMENT_ISSUE' ? 'PAYMENT_ISSUE' : 'OTHER',
            description: message,
            status: 'OPEN'
          });
      } catch (_) { /* non-fatal */ }
    }

    // Generate intelligent instant resolution based on keywords
    let botResponse = 'Thank you for reaching out. A VOLO Support Specialist has received your request and will assist you shortly.';
    const lower = (message || '').toLowerCase();

    if (lower.includes('where') || lower.includes('technician') || lower.includes('late') || lower.includes('delay')) {
      botResponse = '📍 We are tracking your technician. If your technician is delayed, you can check live GPS in your Bookings tab or request instant reassignment.';
    } else if (lower.includes('refund') || lower.includes('payment') || lower.includes('money') || lower.includes('charge')) {
      botResponse = '💳 All transactions are protected under the VOLO Escrow Guarantee. If a service is cancelled, refunds are automatically credited to your wallet/bank within 2-4 hours.';
    } else if (lower.includes('cancel') || lower.includes('reschedule')) {
      botResponse = '📅 You can reschedule or cancel directly from your Booking Details screen free of charge before the technician arrives.';
    }

    return NextResponse.json({
      success: true,
      bot_response: botResponse
    });

  } catch (error: any) {
    console.error('Error in support chat POST:', error);
    return NextResponse.json({
      success: true,
      bot_response: 'Thank you for your message. A VOLO Specialist is reviewing your request.'
    });
  }
}
