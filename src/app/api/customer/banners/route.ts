import { NextResponse } from 'next/server';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
import { getBannerCache, setBannerCache } from '@/lib/cache';

const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform')?.toLowerCase() || 'all';
    const scope = searchParams.get('scope')?.toLowerCase() || 'dashboard';
    const cacheKey = `customer:${platform}:${scope}`;

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
        'HERO', 'PROMO', 'CUSTOMER', 'MOBILE_HERO', 'MOBILE_PROMO', 
        'CUSTOMER_HERO', 'CUSTOMER_PROMO', 'CUSTOMER_ALL', 
        'CATALOG_HERO', 'GLOBAL_HERO'
      ]);
    } else if (platform === 'web') {
      if (scope === 'public') {
        // Public landing page has no dynamic promotional banners
        return NextResponse.json({ banners: [] });
      } else if (scope === 'catalog') {
        // Customer services catalog screen
        query = query.in('placement', [
          'CATALOG_HERO', 'CATALOG_MASTER', 'CUSTOMER_WEB', 'CUSTOMER_ALL', 
          'WEB', 'WEB_HERO'
        ]);
      } else {
        // Customer Web Dashboard (/customer/dashboard)
        query = query.in('placement', [
          'CUSTOMER_WEB', 'CUSTOMER_ALL', 'WEB', 'WEB_HERO'
        ]);
      }
    } else {
      // Exclude worker-only and public-only placements by default
      query = query
        .not('placement', 'ilike', 'WORKER_%')
        .not('placement', 'ilike', 'PUBLIC_%');
    }

    // Run promo query concurrently if needed
    const promoPromise = platform !== 'web'
      ? supabaseAdmin
          .from('promo_codes')
          .select('*')
          .eq('active', true)
          .in('applicable_role', ['customer', 'all'])
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: null });

    const [{ data: banners, error }, { data: promos }] = await Promise.all([query, promoPromise]);
    if (error) throw error;

    const mergedBanners = [...(banners || [])];

    if (platform !== 'web' && promos && promos.length > 0) {
      const now = new Date();
      const activePromos = promos.filter((p: any) => !p.expires_at || new Date(p.expires_at) > now);

      activePromos.forEach((p: any) => {
        mergedBanners.push({
          id: `promo-${p.id}`,
          title: `Use code ${p.code}`,
          subtitle: p.description || `Get ${p.discount_value}${p.discount_type === 'PERCENT' ? '% Off' : ' Flat Off'} on your order!`,
          discount_label: 'PROMO CODE',
          action_url: '',
          placement: 'PROMO',
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
    console.error('Error fetching customer active banners:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
