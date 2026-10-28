import { customerAddressSchema } from '@/lib/schemas';
import { validateBody } from '@/lib/zod-validator';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { isLocationInWarangal, WARANGAL_CENTER } from '@/lib/warangal-geofence';

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, 'customer');
    const customerId = session.user_id;

    const { data: addresses, error } = await supabaseAdmin
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ addresses: addresses || [] });
  } catch (error: any) {
    console.error('Error fetching customer addresses:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'customer');
    const customerId = session.user_id;
    // Validate payload against customerAddressSchema with defaults
    const validation = await validateBody(request, customerAddressSchema);
    if (!validation.success) return validation.errorResponse;
    const body = validation.data;
    const { label, address, latitude, longitude, is_default, place_id, formatted_address } = body;

    if (!label || !address) {
      return NextResponse.json({ error: 'Label and Address are required.' }, { status: 400 });
    }

    const rawLabel = (label || 'HOME').trim().toUpperCase();
    const finalLabel = ['HOME', 'WORK', 'OTHER'].includes(rawLabel) ? rawLabel : 'OTHER';

    let lat = Number(latitude);
    let lng = Number(longitude);

    // If coordinates are not provided, geocode the address string
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      const geocodeResult = await geocodeAddress(address);
      if (geocodeResult) {
        lat = geocodeResult.lat;
        lng = geocodeResult.lng;
      } else {
        lat = WARANGAL_CENTER.lat;
        lng = WARANGAL_CENTER.lng;
      }
    }

    // Verify address is strictly located within Warangal operational district
    if (!isLocationInWarangal(lat, lng)) {
      return NextResponse.json(
        {
          error: 'OUT_OF_SERVICE_AREA',
          message: 'VOLO Home Services is currently operational exclusively in Warangal district. Addresses outside Warangal cannot be serviced at this time.'
        },
        { status: 422 }
      );
    }

    let finalIsDefault = !!is_default;
    if (!finalIsDefault) {
      const { count } = await supabaseAdmin
        .from('customer_addresses')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customerId);
      if (!count || count === 0) {
        finalIsDefault = true;
      }
    }

    // Insert new address
    const { data: newAddr, error } = await supabaseAdmin
      .from('customer_addresses')
      .insert({
        customer_id: customerId,
        label: finalLabel,
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        is_default: finalIsDefault,
        place_id: place_id || null,
        formatted_address: formatted_address || address.trim()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, address: newAddr });
  } catch (error: any) {
    console.error('Error creating customer address:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.status || 500 }
    );
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VoloHomeServices/1.0 (contact@volo.com)'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lng: lon };
      }
    }
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
  }
  return null;
}
