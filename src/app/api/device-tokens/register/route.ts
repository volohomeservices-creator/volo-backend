import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

// Recompile trigger

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);

    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;

    const { deviceToken, platform = 'web', permissionStatus = 'granted' } = body || {};

    if (!deviceToken || typeof deviceToken !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid FCM token' },
        { status: 400 }
      );
    }

    // If no active session yet, acknowledge receipt gracefully without throwing 401
    if (!session?.user_id) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        message: 'Device token received; ready for authentication binding',
      });
    }

    const userId = session.user_id;

    // Upsert device token — unique constraint is (user_id, device_token)
    const { error: upsertErr } = await supabaseAdmin
      .from('user_devices')
      .upsert(
        {
          user_id: userId,
          device_token: deviceToken,
          platform,
          permission_status: permissionStatus,
          is_active: true,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,device_token',
        }
      );

    if (upsertErr) {
      console.error('[API /device-tokens/register] Supabase upsert error:', {
        message: upsertErr.message,
        code: upsertErr.code,
        hint: upsertErr.hint,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to register device token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Device registered successfully' });
  } catch (error: any) {
    console.error('[API /device-tokens/register] Unexpected error:', {
      error: error instanceof Error ? error.message : error,
    });

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
