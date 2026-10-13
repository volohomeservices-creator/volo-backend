import { NextResponse } from 'next/server';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';

const supabaseAdmin: any = supabaseAdminOriginal;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const featuredOnly = searchParams.get('featured') === 'true';

    // 1. Fetch approved public reviews
    let query = supabaseAdmin
      .from('reviews')
      .select(`
        id,
        rating,
        review_text,
        is_featured,
        would_recommend,
        created_at,
        approved_at,
        customer:users!reviews_customer_id_fkey (full_name),
        worker:workers!reviews_worker_id_fkey (id, user:users!workers_id_fkey (full_name)),
        bookings (id, service_items (name))
      `)
      .eq('is_approved', true)
      .eq('is_hidden', false)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (featuredOnly) {
      query = query.eq('is_featured', true);
    }

    // 2. Fetch platform reputation metrics concurrently
    const [reviewsResult, statsResult] = await Promise.all([
      query,
      supabaseAdmin
        .from('reviews')
        .select('rating, would_recommend')
        .eq('is_approved', true)
        .eq('is_hidden', false)
    ]);

    if (reviewsResult.error) throw reviewsResult.error;

    const allApproved = statsResult.data || [];
    const totalApproved = allApproved.length;

    let avgRating = 4.9;
    let recommendRate = 98;

    if (totalApproved > 0) {
      const sum = allApproved.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0);
      avgRating = parseFloat((sum / totalApproved).toFixed(1));
      const recommendCount = allApproved.filter((r: any) => r.would_recommend !== false).length;
      recommendRate = Math.round((recommendCount / totalApproved) * 100);
    }

    const reviews = (reviewsResult.data || []).map((r: any) => {
      const rawName = r.customer?.full_name || 'Verified Customer';
      // Anonymize last name for privacy, e.g. "Rohan S."
      const nameParts = rawName.trim().split(/\s+/);
      const displayName = nameParts.length > 1
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0].toUpperCase()}.`
        : nameParts[0];

      return {
        id: r.id,
        name: displayName,
        rating: Number(r.rating) || 5,
        text: r.review_text || '',
        comment: r.review_text || '',
        service_name: r.bookings?.service_items?.name || 'Home Service',
        worker_name: r.worker?.user?.full_name || 'Volo Partner',
        is_featured: !!r.is_featured,
        would_recommend: r.would_recommend ?? true,
        created_at: r.created_at,
        approved_at: r.approved_at
      };
    });

    return NextResponse.json(
      {
        reputation: {
          average_rating: avgRating,
          total_reviews: totalApproved,
          recommendation_percentage: recommendRate,
          rating_scale: 5.0
        },
        reviews
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (error: any) {
    console.error('Error fetching public reviews:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
