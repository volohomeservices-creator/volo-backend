import { NextResponse } from 'next/server';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
import { getBannerCache, setBannerCache } from '@/lib/cache';

const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform')?.toLowerCase() || 'all';
    const cacheKey = `worker:${platform}`;

    // Ultra-fast in-memory cache check (<1ms)
    const cachedBanners = getBannerCache(cacheKey);
    if (cachedBanners) {
      return NextResponse.json(
        { banners: cachedBanners },
        {
          headers: {
            'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    let query = supabaseAdmin
      .from('mobile_banners')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (platform === 'mobile') {
      query = query.in('placement', [
        'WORKER', 'WORKER_HERO', 'WORKER_MOBILE', 'WORKER_PROMO', 'WORKER_ALL', 
        'ALL', 'ALL_MOBILE', 'UNIVERSAL', 'ALL_HERO', 'UNIVERSAL_HERO', 'ALL_PROMO', 'UNIVERSAL_PROMO'
      ]);
    } else if (platform === 'web') {
      query = query.in('placement', [
        'WORKER_WEB', 'WORKER', 'WORKER_ALL', 
        'ALL', 'ALL_WEB', 'UNIVERSAL'
      ]);
    } else {
      query = query.or('placement.ilike.WORKER%,placement.in.(ALL,ALL_MOBILE,ALL_WEB,UNIVERSAL,ALL_HERO,ALL_PROMO,UNIVERSAL_HERO,UNIVERSAL_PROMO)');
    }

    // Append active worker incentive promo codes as secondary items
    const promoPromise = supabaseAdmin
      .from('promo_codes')
      .select('*')
      .eq('active', true)
      .in('applicable_role', ['worker', 'all'])
      .order('created_at', { ascending: false });

    const [{ data: banners, error }, { data: promos }] = await Promise.all([query, promoPromise]);
    if (error) throw error;

    const mergedBanners = [...(banners || [])];

    if (promos && promos.length > 0) {
      const now = new Date();
      const activePromos = promos.filter((p: any) => !p.expires_at || new Date(p.expires_at) > now);

      activePromos.forEach((p: any) => {
        mergedBanners.push({
          id: `worker-incentive-${p.id}`,
          title: `Captain Incentive: Code ${p.code}`,
          subtitle: p.description || `Earn extra ${p.discount_type === 'PERCENT' ? `${p.discount_value}%` : `₹${p.discount_value}`} on completing target bookings!`,
          discount_label: 'CAPTAIN INCENTIVE',
          action_url: '/worker/dashboard',
          placement: platform === 'web' ? 'WORKER_WEB' : 'WORKER_HERO',
          active: true,
          created_at: p.created_at
        });
      });
    }

    // Store in RAM cache for 5 minutes
    setBannerCache(cacheKey, mergedBanners, 300);

    return NextResponse.json(
      { banners: mergedBanners },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching worker active banners:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
