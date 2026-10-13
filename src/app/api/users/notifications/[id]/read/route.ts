import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: cacheHeaders });
    }

    const { id } = await params;
    await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', session.user_id);

    return NextResponse.json({ success: true }, { headers: cacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false }, { status: 500, headers: cacheHeaders });
  }
}
