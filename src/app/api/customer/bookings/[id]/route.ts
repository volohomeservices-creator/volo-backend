import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { parseBookingIdentifier, getBookingSlug, getUuidRangeForShortId } from '@/lib/booking-slug';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const customerId = session.user_id;
    const { id: rawIdentifier } = await params;
    const identifier = parseBookingIdentifier(rawIdentifier);

    if (!identifier.isValid) {
      return NextResponse.json({ error: 'Invalid booking identifier.' }, { status: 400 });
    }

    // 1. Fetch booking details (optimized select fields) by UUID or short ID range
    let bookingQuery = supabaseAdmin
      .from('bookings')
      .select(`
        id, customer_id, worker_id, service_item_id, booking_type, payment_mode, status, 
        address_line, lat, lng, scheduled_at, started_at, completed_at, total_amount, notes, otp, created_at, updated_at,
        service_items(id, category_id, name, description, base_price, estimated_mins, icon_url, is_active, service_categories(name)),
        workers(id, rating, total_jobs, current_lat, current_lng, status, users(full_name, avatar_url, phone))
      `);

    if (identifier.isUuid && identifier.fullUuid) {
      bookingQuery = bookingQuery.eq('id', identifier.fullUuid);
    } else if (identifier.shortId) {
      const range = getUuidRangeForShortId(identifier.shortId);
      bookingQuery = bookingQuery.gte('id', range.minUuid).lte('id', range.maxUuid);
    }

    const { data: booking, error: bookingErr } = await bookingQuery.maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }

    // Ensure this customer owns this booking
    if (booking.customer_id !== customerId) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const bookingId = booking.id;
    const slug = getBookingSlug(booking);

    // 2. Fetch booking images
    const { data: images } = await supabaseAdmin
      .from('booking_images')
      .select('image_url')
      .eq('booking_id', bookingId);

    // Get public URLs for each uploaded image
    const imageUrls = (images || []).map(img => {
      if (img.image_url.startsWith('http')) return img.image_url;
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('booking-images')
        .getPublicUrl(img.image_url);
      return publicUrl;
    });

    // 3. Fetch latest route snapshot for distance and ETA
    const { data: routeSnapshot } = await supabaseAdmin
      .from('booking_route_snapshots')
      .select('distance_km, eta_minutes')
      .eq('booking_id', bookingId)
      .order('captured_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      booking,
      slug,
      images: imageUrls,
      routeSnapshot: routeSnapshot || null
    });
  } catch (error: any) {
    console.error('Error fetching booking details:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const customerId = session.user_id;
    const { id: rawIdentifier } = await params;
    const identifier = parseBookingIdentifier(rawIdentifier);

    if (!identifier.isValid) {
      return NextResponse.json({ error: 'Invalid booking identifier.' }, { status: 400 });
    }

    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

    // Verify ownership
    let fetchQuery = supabaseAdmin
      .from('bookings')
      .select('id, customer_id, status, created_at, total_amount, payment_mode, worker_id');

    if (identifier.isUuid && identifier.fullUuid) {
      fetchQuery = fetchQuery.eq('id', identifier.fullUuid);
    } else if (identifier.shortId) {
      const range = getUuidRangeForShortId(identifier.shortId);
      fetchQuery = fetchQuery.gte('id', range.minUuid).lte('id', range.maxUuid);
    }

    const { data: booking, error: fetchErr } = await fetchQuery.maybeSingle();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    }
    if (booking.customer_id !== customerId) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const id = booking.id;

    const updates: any = {};
    let shouldRefund = false;
    let refundAmount = 0;

    if (body.status === 'CANCELLED') {
      if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
        return NextResponse.json({ error: 'Cannot cancel completed or already cancelled bookings.' }, { status: 400 });
      }

      // Customer can only cancel until a worker is assigned
      if (booking.status !== 'PENDING_ASSIGNMENT' || booking.worker_id) {
        return NextResponse.json({
          error: 'Cannot cancel booking once a technician has been assigned.'
        }, { status: 400 });
      }

      // 3-minute cancellation buffer time check
      const createdAtTime = new Date(booking.created_at).getTime();
      const elapsedMs = Date.now() - createdAtTime;
      const bufferMs = 3 * 60 * 1000;

      if (elapsedMs > bufferMs) {
        return NextResponse.json({
          error: 'Cancellation buffer expired. Bookings can only be cancelled within 3 minutes of placement and before technician assignment.'
        }, { status: 400 });
      }

      updates.status = 'CANCELLED';

      if (booking.payment_mode === 'ONLINE') {
        shouldRefund = true;
        refundAmount = Number(booking.total_amount);
      }
    }
    if (body.scheduled_at) {
      updates.scheduled_at = body.scheduled_at;
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // If cancelled, cancel any pending assignment queue items for this booking
    if (body.status === 'CANCELLED') {
      try {
        await supabaseAdmin
          .from('assignment_queue')
          .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
          .eq('booking_id', id)
          .eq('status', 'PENDING');
      } catch (queueErr) {
        console.error('Failed to cancel assignment queue for booking:', queueErr);
      }
    }

    // Process customer wallet refund if required
    if (shouldRefund && refundAmount > 0) {
      const { data: existingWallet } = await supabaseAdmin
        .from('customer_wallets')
        .select('id, balance')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (existingWallet) {
        await supabaseAdmin
          .from('customer_wallets')
          .update({ balance: Number(existingWallet.balance) + refundAmount, updated_at: new Date().toISOString() })
          .eq('id', existingWallet.id);
      } else {
        await supabaseAdmin
          .from('customer_wallets')
          .insert({ customer_id: customerId, balance: refundAmount });
      }

      try {
        await supabaseAdmin.from('customer_wallet_transactions').insert({
          customer_id: customerId,
          amount: refundAmount,
          type: 'REFUND',
          description: `Refund for cancelled booking #${id.substring(0, 8).toUpperCase()}`,
        });
      } catch (err) {
        console.error('Failed to log refund transaction:', err);
      }
    }

    return NextResponse.json({ success: true, booking: updated });
  } catch (error: any) {
    console.error('Error updating booking:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
