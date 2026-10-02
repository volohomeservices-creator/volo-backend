import axios from 'axios';
import { IMapProvider, Coordinates, GeocodeResult, DirectionsResult } from './map-provider';

export class OpenStreetMapProvider implements IMapProvider {
  // In-memory cache for reverse geocoding to optimize performance and prevent rate limiting
  private reverseCache = new Map<string, { result: GeocodeResult; timestamp: number }>();
  private CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

  async geocode(address: string): Promise<GeocodeResult | null> {
    if (!address || !address.trim()) return null;

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address.trim(),
          format: 'json',
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'VoloHomeServices/1.0 (contact@volohomeservices.com)',
        },
        timeout: 8000,
      });

      if (response.data && response.data.length > 0) {
        const item = response.data[0];
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          formattedAddress: item.display_name,
          placeId: item.place_id ? String(item.place_id) : undefined,
        };
      }
      return null;
    } catch (error: any) {
      console.error('[OpenStreetMapProvider] Geocode error:', error.message || error);
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    if (isNaN(lat) || isNaN(lng)) return null;

    // Cache key rounded to 4 decimals (~11m resolution)
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.reverseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.result;
    }

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat,
          lon: lng,
          format: 'json',
          zoom: 18,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'VoloHomeServices/1.0 (contact@volohomeservices.com)',
        },
        timeout: 8000,
      });

      if (response.data && response.data.display_name) {
        const result: GeocodeResult = {
          lat: parseFloat(response.data.lat),
          lng: parseFloat(response.data.lon),
          formattedAddress: response.data.display_name,
          placeId: response.data.place_id ? String(response.data.place_id) : undefined,
        };

        this.reverseCache.set(cacheKey, { result, timestamp: Date.now() });
        return result;
      }
      return null;
    } catch (error: any) {
      console.error('[OpenStreetMapProvider] Reverse geocode error:', error.message || error);
      return null;
    }
  }

  async getDirections(origin: Coordinates, destination: Coordinates): Promise<DirectionsResult | null> {
    try {
      // OSRM Driving routing engine (Free, accurate road routing)
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=polyline`;
      const response = await axios.get(url, { timeout: 8000 });

      if (response.data?.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          distanceKm: Number((route.distance / 1000).toFixed(2)),
          durationMin: Math.max(1, Math.ceil(route.duration / 60)),
          polylinePath: route.geometry || '',
        };
      }
    } catch (error: any) {
      console.warn('[OpenStreetMapProvider] OSRM route error, using mathematical fallback:', error.message || error);
    }

    // Mathematical fallback if OSRM is momentarily unreachable
    const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
    const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((origin.lat * Math.PI) / 180) *
        Math.cos((destination.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = 6371 * c;
    const drivingEstKm = straightKm * 1.3; // 1.3 road winding factor
    const durationMin = Math.max(1, Math.ceil((drivingEstKm / 28) * 60)); // ~28 km/h city speed

    return {
      distanceKm: Number(drivingEstKm.toFixed(2)),
      durationMin,
      polylinePath: '',
    };
  }

  async getAutocomplete(input: string, _sessionToken?: string): Promise<any[]> {
    if (!input || !input.trim()) return [];

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: input.trim(),
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'VoloHomeServices/1.0 (contact@volohomeservices.com)',
        },
        timeout: 6000,
      });

      if (Array.isArray(response.data)) {
        return response.data.map((item: any) => {
          const parts = item.display_name.split(',');
          const mainText = parts[0]?.trim() || item.name || '';
          const secondaryText = parts.slice(1).join(',').trim();
          return {
            placeId: String(item.place_id),
            description: item.display_name,
            mainText,
            secondaryText,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });
      }
      return [];
    } catch (error: any) {
      console.error('[OpenStreetMapProvider] Autocomplete error:', error.message || error);
      return [];
    }
  }

  async getPlaceDetails(placeId: string, _sessionToken?: string): Promise<GeocodeResult | null> {
    if (!placeId) return null;

    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/lookup', {
        params: {
          osm_ids: placeId,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'VoloHomeServices/1.0 (contact@volohomeservices.com)',
        },
        timeout: 6000,
      });

      if (Array.isArray(response.data) && response.data.length > 0) {
        const item = response.data[0];
        return {
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          formattedAddress: item.display_name,
          placeId: String(item.place_id),
        };
      }
      return null;
    } catch (error: any) {
      console.error('[OpenStreetMapProvider] Place details error:', error.message || error);
      return null;
    }
  }
}
