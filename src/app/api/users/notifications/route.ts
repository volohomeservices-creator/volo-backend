import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ notifications: [], unread_count: 0 }, { headers: cacheHeaders });
    }

    const userId = session.user_id;

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Error querying notifications table:', error.message);
      return NextResponse.json({ notifications: [], unread_count: 0 }, { headers: cacheHeaders });
    }

    const items = notifications || [];
    const unreadCount = items.filter((n: any) => !n.is_read).length;

    return NextResponse.json(
      { notifications: items, unread_count: unreadCount },
      { headers: cacheHeaders }
    );
  } catch (error: any) {
    console.error('Error in /api/users/notifications:', error.message || error);
    return NextResponse.json(
      { notifications: [], unread_count: 0 },
      { headers: cacheHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cacheHeaders });
    }

    const userId = session.user_id;

    // Mark all as read
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);

    return NextResponse.json({ success: true }, { headers: cacheHeaders });
  } catch (error: any) {
    return NextResponse.json({ success: false }, { status: 500, headers: cacheHeaders });
  }
}
