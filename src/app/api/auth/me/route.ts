import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const cacheHeaders = { 'Cache-Control': 'no-store, max-age=0, must-revalidate' };
  try {
    const session = await requireSession(request);

    // Parallel fetch user and worker status
    const [
      { data: user, error },
      workerRes
    ] = await Promise.all([
      supabaseAdmin
        .from('users')
        .select('id, role, full_name, phone, email, avatar_url, is_active, volo_coins, admin_role, admin_permissions')
        .eq('id', session.user_id)
        .single(),
      session.role === 'worker'
        ? supabaseAdmin
            .from('workers')
            .select('kyc_status, status')
            .eq('id', session.user_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    if (error || !user) {
      console.error('[/api/auth/me] Supabase Error fetching user:', error, 'User ID:', session.user_id);
      return NextResponse.json({ error: 'User profile not found' }, { status: 404, headers: cacheHeaders });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'ACCOUNT_BLOCKED' }, { status: 403, headers: cacheHeaders });
    }

    if (session.role === 'worker' && workerRes?.data) {
      user.kyc_status = workerRes.data.kyc_status || 'PENDING';
      user.worker_status = workerRes.data.status || 'OFFLINE';
    }

    return NextResponse.json({
      success: true,
      user
    }, { headers: cacheHeaders });
  } catch (error: any) {
    if (error.status === 401) {
      return NextResponse.json({ error: 'Session expired or invalid. Please login again.' }, { status: 401, headers: cacheHeaders });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: cacheHeaders });
  }
}

