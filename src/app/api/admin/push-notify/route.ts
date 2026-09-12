import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;
import { dispatchNotification, dispatchBulkNotifications } from '@/lib/notification-dispatcher';

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin');
    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { target, target_user_id, title, body: msgBody, scheduled_at } = body;

    if (!title || !msgBody) {
      return NextResponse.json({ error: 'Title and message body are required' }, { status: 400 });
    }

    let sentCount = 0;

    if (target === 'specific' && target_user_id) {
      // Send to one specific user
      await dispatchNotification({
        userId: target_user_id,
        type: 'ADMIN_BROADCAST',
        title,
        body: msgBody,
      });
      sentCount = 1;

    } else if (target === 'all_customers') {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'customer')
        .eq('is_active', true);

      const userIds = (users || []).map((u: any) => u.id);
      if (userIds.length > 0) {
        await dispatchBulkNotifications({ userIds, type: 'ADMIN_BROADCAST', title, body: msgBody });
        sentCount = userIds.length;
      }

    } else if (target === 'all_workers') {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'worker')
        .eq('is_active', true);

      const userIds = (users || []).map((u: any) => u.id);
      if (userIds.length > 0) {
        await dispatchBulkNotifications({ userIds, type: 'ADMIN_BROADCAST', title, body: msgBody });
        sentCount = userIds.length;
      }

    } else if (target === 'inactive_30_days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeBookings } = await supabaseAdmin
        .from('bookings')
        .select('customer_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const activeIds = (activeBookings || []).map((b: any) => b.customer_id);

      const { data: customers } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'customer')
        .eq('is_active', true);

      const inactiveIds = (customers || []).map((c: any) => c.id).filter(id => !activeIds.includes(id));
      if (inactiveIds.length > 0) {
        await dispatchBulkNotifications({ userIds: inactiveIds, type: 'ADMIN_BROADCAST', title, body: msgBody });
        sentCount = inactiveIds.length;
      }

    } else if (target === 'everyone') {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('is_active', true);

      const userIds = (users || []).map((u: any) => u.id);
      if (userIds.length > 0) {
        await dispatchBulkNotifications({ userIds, type: 'ADMIN_BROADCAST', title, body: msgBody });
        sentCount = userIds.length;
      }

    } else {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    // Log the broadcast in notifications_log (audit)
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: null,
        type: 'ADMIN_BROADCAST_LOG',
        title: `[ADMIN BROADCAST] ${title}`,
        body: `Target: ${target}, Sent: ${sentCount} recipients. ${msgBody}`,
        data: { target, sent_count: sentCount, scheduled_at }
      });
    } catch (_) { /* non-fatal */ }

    return NextResponse.json({ success: true, sent_count: sentCount });
  } catch (error: any) {
    console.error('Error dispatching push notify:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

// GET: search users by phone or return audience segment counts and recent history
export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (phone) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, full_name, phone, role')
        .ilike('phone', `%${phone}%`)
        .limit(5);

      if (error) throw error;
      return NextResponse.json({ users: data || [] });
    }

    // Query live segment counts
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [customersRes, workersRes, everyoneRes, activeBookingsRes, recentLogsRes] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer').eq('is_active', true),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'worker').eq('is_active', true),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('bookings').select('customer_id').gte('created_at', thirtyDaysAgo.toISOString()),
      supabaseAdmin.from('notifications').select('*').eq('type', 'ADMIN_BROADCAST_LOG').order('created_at', { ascending: false }).limit(10)
    ]);

    const customerCount = customersRes.count || 0;
    const workerCount = workersRes.count || 0;
    const totalCount = everyoneRes.count || 0;
    
    // Estimate inactive 30 days
    const activeCustomerIds = new Set((activeBookingsRes.data || []).map((b: any) => b.customer_id));
    const inactiveCount = Math.max(0, customerCount - activeCustomerIds.size);

    return NextResponse.json({
      stats: {
        all_customers: customerCount,
        all_workers: workerCount,
        inactive_30_days: inactiveCount,
        everyone: totalCount
      },
      recent_broadcasts: recentLogsRes.data || []
    });
  } catch (error: any) {
    console.error('Error fetching push notification stats:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
