import { z } from 'zod';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
import { invalidateBannerCache } from '@/lib/cache';
const supabaseAdmin: any = supabaseAdminOriginal;
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'admin');
    const { id } = await props.params;

    const { data: banner, error } = await supabaseAdmin
      .from('mobile_banners')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !banner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, banner });
  } catch (error: any) {
    console.error('Error fetching mobile banner:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'admin');
    const { id } = await props.params;
    const { data: body, errorResponse } = await validateBody(request, z.any());
    if (errorResponse) return errorResponse;
    const { title, subtitle, discount_label, action_url, background_color, image_name, image_url, placement, button_text, active, image_position } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (title !== undefined) updatePayload.title = title;
    if (subtitle !== undefined) updatePayload.subtitle = subtitle;
    if (discount_label !== undefined) updatePayload.discount_label = discount_label;
    if (action_url !== undefined) updatePayload.action_url = action_url;
    if (background_color !== undefined) updatePayload.background_color = background_color;
    if (image_name !== undefined) updatePayload.image_name = image_name;
    if (image_url !== undefined) updatePayload.image_url = image_url;
    if (placement !== undefined) updatePayload.placement = placement;
    if (button_text !== undefined) updatePayload.button_text = button_text;
    if (active !== undefined) updatePayload.active = active;
    if (image_position !== undefined) updatePayload.image_position = image_position;

    const { data: updatedBanner, error } = await supabaseAdmin
      .from('mobile_banners')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    invalidateBannerCache();

    return NextResponse.json({ success: true, banner: updatedBanner });
  } catch (error: any) {
    console.error('Error updating mobile banner:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, 'admin');
    const { id } = await props.params;

    const { error } = await supabaseAdmin
      .from('mobile_banners')
      .delete()
      .eq('id', id);

    if (error) throw error;

    invalidateBannerCache();

    return NextResponse.json({ success: true, message: 'Banner deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting mobile banner:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
