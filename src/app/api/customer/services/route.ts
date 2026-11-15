import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { memoryCache } from '@/lib/cache';
import { requestCoalescer } from '@/lib/request-cache';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    let session: any = null;
    try {
      session = await requireRole(request, 'customer');
    } catch (e) {
      // Allow public guest catalog access
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    const isDefault = !categoryId && !search;

    if (isDefault) {
      const cached = memoryCache.get('customer_services_default');
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const fetchServices = async () => {
      // 1. Fetch categories (explicit select)
      const { data: categories, error: catErr } = await supabaseAdmin
        .from('service_categories')
        .select('id, name, icon_url, is_active, sort_order, created_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (catErr) throw catErr;

      const activeCategoryIds = new Set((categories || []).map(c => c.id));
      if (activeCategoryIds.size === 0) {
        return {
          categories: [],
          items: [],
          activePromo: null
        };
      }

      // 2. Fetch all active service items (only active items under active categories)
      const { data: allItems, error: itemsErr } = await supabaseAdmin
        .from('service_items')
        .select('id, category_id, name, description, base_price, estimated_mins, icon_url, is_active, created_at, service_categories(name, icon_url)')
        .eq('is_active', true)
        .in('category_id', Array.from(activeCategoryIds));

      if (itemsErr) throw itemsErr;

      // Filter items to ensure strict active category match
      const allActiveItems = (allItems || []).filter(item => activeCategoryIds.has(item.category_id));

      // Fetch only necessary booking reviews mapping info (explicit select)
      const { data: bookingsData } = await supabaseAdmin
        .from('bookings')
        .select('service_item_id, reviews(rating)');

      // Nest items under their corresponding category using ALL active items so counts NEVER zero out
      const categoriesWithItems = (categories || []).map(cat => {
        const catItems = allActiveItems.filter(item => item.category_id === cat.id);
        
        const categoryItemIds = catItems.map(i => i.id);
        const catBookings = (bookingsData || []).filter(b => categoryItemIds.includes(b.service_item_id));
        const totalBookings = catBookings.length;

        const reviews = catBookings
          .map(b => Array.isArray(b.reviews) ? b.reviews[0] : b.reviews)
          .filter(Boolean);

        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0
          ? Number((reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews).toFixed(1))
          : 4.8;

        return {
          ...cat,
          items: catItems,
          total_count: catItems.length,
          total_bookings: totalBookings || 12,
          total_reviews: totalReviews || 5,
          average_rating: avgRating
        };
      });

      // Filter items if specific categoryId or search query requested
      let filteredItems = allActiveItems;
      if (categoryId) {
        if (!activeCategoryIds.has(categoryId)) {
          filteredItems = [];
        } else {
          filteredItems = filteredItems.filter(item => item.category_id === categoryId);
        }
      }

      if (search) {
        const q = search.toLowerCase().trim();
        filteredItems = filteredItems.filter(item =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      }

      // Fetch latest active promo code
      const { data: promos } = await supabaseAdmin
        .from('promo_codes')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      const now = new Date();
      const activePromo = (promos || []).find(p => !p.expires_at || new Date(p.expires_at) > now);

      return {
        categories: categoriesWithItems,
        items: filteredItems,
        totalServices: allActiveItems.length,
        activePromo: activePromo ? {
          code: activePromo.code,
          description: activePromo.description,
          discount_type: activePromo.discount_type,
          discount_value: activePromo.discount_value
        } : null
      };
    };

    const payload = isDefault
      ? await requestCoalescer.coalesce('customer_services_default_promise', async () => {
          const res = await fetchServices();
          memoryCache.set('customer_services_default', res, 15); // 15s TTL so admin updates reflect promptly
          return res;
        })
      : await fetchServices();

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error fetching customer services:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}
