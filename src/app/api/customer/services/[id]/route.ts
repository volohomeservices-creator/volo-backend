import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

function getSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let session: any = null;
    try {
      session = await requireRole(request, 'customer');
    } catch (e) {
      // Allow public guest catalog access
    }

    const { id: idOrSlug } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);

    let item: any = null;
    let itemErr: any = null;

    if (isUuid) {
      const { data, error } = await supabaseAdmin
        .from('service_items')
        .select('*, service_categories(name)')
        .eq('id', idOrSlug)
        .single();
      item = data;
      itemErr = error;
    } else {
      // Find by slug name
      const { data: allItems, error: fetchErr } = await supabaseAdmin
        .from('service_items')
        .select('*, service_categories(name)');

      if (fetchErr) throw fetchErr;

      item = (allItems || []).find(it => getSlug(it.name) === idOrSlug.toLowerCase());
    }

    if (itemErr || !item) {
      return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    console.error('Error fetching service item details:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}


