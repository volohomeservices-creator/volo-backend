import { NextResponse } from 'next/server';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET() {
  try {
    const { data: banners, error } = await supabaseAdmin
      .from('mobile_banners')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch active promo codes
    const { data: promos } = await supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    const now = new Date();
    const activePromos = (promos || []).filter((p: any) => !p.expires_at || new Date(p.expires_at) > now);

    const mergedBanners = (banners || []).map((b: any) => {
      const isWorker = (b.placement || '').toUpperCase() === 'WORKER' || (b.action_url || '').startsWith('/worker');
      return {
        ...b,
        placement: isWorker ? 'WORKER' : (b.placement || 'WEB'),
        target_panel: isWorker ? 'WORKER' : 'CUSTOMER',
        button_text: b.button_text || (isWorker ? 'Explore Opportunity' : 'Explore Services')
      };
    });

    if (activePromos && activePromos.length > 0) {
      // Prepend active promo codes with dynamic CTA
      activePromos.forEach((p: any) => {
        mergedBanners.unshift({
          id: `promo-${p.id}`,
          title: `Use code ${p.code}`,
          subtitle: p.description || `Get ${p.discount_value}${p.discount_type === 'PERCENT' ? '% Off' : ' Flat Off'} on your order!`,
          discount_label: 'PROMO CODE',
          button_text: 'Apply Code',
          action_url: '/customer/services',
          placement: 'ALL',
          active: true,
          created_at: p.created_at
        });
      });
    }

    return NextResponse.json({ banners: mergedBanners });
  } catch (error: any) {
    console.error('Error fetching customer active mobile banners:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
