import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');

    const { data: banners, error } = await supabaseAdmin
      .from('mobile_banners')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedBanners = (banners || []).map((b: any) => {
      const isWorker = (b.placement || '').toUpperCase() === 'WORKER' || (b.action_url || '').startsWith('/worker');
      return {
        ...b,
        placement: isWorker ? 'WORKER' : (b.placement || 'MOBILE'),
        target_panel: isWorker ? 'WORKER' : 'CUSTOMER'
      };
    });

    return NextResponse.json({ banners: mappedBanners });
  } catch (error: any) {
    console.error('Error fetching admin mobile banners:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin');
    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { title, subtitle, discount_label, action_url, button_text, cta_text, background_color, image_name, image_url, placement, target_panel, active } = body;

    if (!title || !subtitle) {
      return NextResponse.json({ error: 'Title and subtitle are required.' }, { status: 400 });
    }

    // Standardize placement to reflect target audience
    const isWorker = target_panel === 'WORKER' || (action_url && action_url.startsWith('/worker'));
    const effectivePlacement = isWorker ? 'WORKER' : (placement || 'WEB');
    const finalButtonText = button_text || cta_text || (isWorker ? 'Explore Opportunity' : 'Explore Services');

    const insertPayload: any = {
      title,
      subtitle,
      discount_label: discount_label || 'VOLO BRAND',
      action_url: action_url || (isWorker ? '/worker/dashboard' : '/customer/services'),
      button_text: finalButtonText,
      background_color: background_color || '#3C01A7',
      image_name: image_url || image_name || 'home_services_banner.png',
      image_url: image_url || null,
      placement: effectivePlacement,
      active: active !== undefined ? active : true
    };

    const { data: newBanner, error } = await supabaseAdmin
      .from('mobile_banners')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, banner: newBanner });
  } catch (error: any) {
    console.error('Error creating banner:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, 'admin');
    const body = await request.json().catch(() => ({}));
    const { id, active, discount_label, placement, target_panel, title, subtitle, action_url, button_text, cta_text, image_url, image_name, background_color } = body;

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (active !== undefined) updates.active = active;
    if (discount_label !== undefined) updates.discount_label = discount_label;
    if (target_panel === 'WORKER' || (action_url && action_url.startsWith('/worker'))) {
      updates.placement = 'WORKER';
    } else if (placement !== undefined) {
      updates.placement = placement;
    }
    if (title !== undefined) updates.title = title;
    if (subtitle !== undefined) updates.subtitle = subtitle;
    if (action_url !== undefined) updates.action_url = action_url;
    if (button_text !== undefined || cta_text !== undefined) updates.button_text = button_text || cta_text;
    if (image_url !== undefined) {
      updates.image_url = image_url;
      updates.image_name = image_url || image_name;
    }
    if (background_color !== undefined) updates.background_color = background_color;

    const { data: updatedBanner, error } = await supabaseAdmin
      .from('mobile_banners')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, banner: updatedBanner });
  } catch (error: any) {
    console.error('Error updating banner:', error.message || error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, 'admin');
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Banner ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('mobile_banners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting banner:', error.message || error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
