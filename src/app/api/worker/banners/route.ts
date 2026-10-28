import { NextResponse } from 'next/server';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
import { getBannerCache, setBannerCache } from '@/lib/cache';

const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform')?.toLowerCase() || 'all';
    const scope = searchParams.get('scope')?.toLowerCase() || 'dashboard';
    const cacheKey = `worker:${platform}:${scope}`;

    // Ultra-fast in-memory cache check (<1ms)
    const cachedBanners = getBannerCache(cacheKey);
    if (cachedBanners) {
      return NextResponse.json(
        { banners: cachedBanners },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
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
        'WORKER', 'WORKER_HERO', 'WORKER_MOBILE', 'WORKER_PROMO', 'WORKER_ALL'
      ]);
    } else if (platform === 'web') {
      query = query.in('placement', [
        'WORKER_WEB', 'WORKER', 'WORKER_ALL'
      ]);
    } else {
      query = query.or('placement.ilike.WORKER%');
    }

    const { data: banners, error } = await query;
    if (error) throw error;

    const mergedBanners = banners || [];

    // Store in RAM cache for 5 minutes
    setBannerCache(cacheKey, mergedBanners, 300);

    return NextResponse.json(
      { banners: mergedBanners },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
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
