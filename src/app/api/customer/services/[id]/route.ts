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
    const session = await requireRole(request, 'customer');
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idOrSlug } = await params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);

    let item: any = null;

    if (isUuid) {
      const { data, error } = await supabaseAdmin
        .from('service_items')
        .select('*, service_categories(id, name, icon_url)')
        .eq('id', idOrSlug)
        .single();
      if (!error && data) {
        item = data;
      }
    }

    // If not found by UUID or if param was a slug name, search by slug / name
    if (!item) {
      const { data: allItems, error: fetchErr } = await supabaseAdmin
        .from('service_items')
        .select('*, service_categories(id, name, icon_url)')
        .eq('is_active', true);

      if (fetchErr) throw fetchErr;

      item = (allItems || []).find(it => {
        const itemSlug = getSlug(it.name);
        const target = idOrSlug.toLowerCase();
        return itemSlug === target || it.id === idOrSlug || it.name.toLowerCase().trim() === target;
      });
    }

    if (!item) {
      return NextResponse.json({ error: 'Service offering not found.' }, { status: 404 });
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
