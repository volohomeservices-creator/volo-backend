import { IMapProvider, Coordinates, GeocodeResult, DirectionsResult } from './map-provider';
import { GoogleMapsProvider } from './google-maps-provider';
import { OpenStreetMapProvider } from './openstreetmap-provider';

export class HybridMapProvider implements IMapProvider {
  private googleProvider = new GoogleMapsProvider();
  private osmProvider = new OpenStreetMapProvider();

  private hasGoogleKey(): boolean {
    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
    return key.length > 10 && !key.includes('placeholder') && !key.includes('your_google_maps_key');
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    if (this.hasGoogleKey()) {
      try {
        const res = await this.googleProvider.geocode(address);
        if (res) return res;
      } catch (err: any) {
        console.warn('[HybridMapProvider] Google geocode failed, falling back to OSM:', err.message || err);
      }
    }
    return this.osmProvider.geocode(address);
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    if (this.hasGoogleKey()) {
      try {
        const res = await this.googleProvider.reverseGeocode(lat, lng);
        if (res) return res;
      } catch (err: any) {
        console.warn('[HybridMapProvider] Google reverse geocode failed, falling back to OSM:', err.message || err);
      }
    }
    return this.osmProvider.reverseGeocode(lat, lng);
  }

  async getDirections(origin: Coordinates, destination: Coordinates): Promise<DirectionsResult | null> {
    if (this.hasGoogleKey()) {
      try {
        const res = await this.googleProvider.getDirections(origin, destination);
        if (res) return res;
      } catch (err: any) {
        console.warn('[HybridMapProvider] Google directions failed, falling back to OSRM:', err.message || err);
      }
    }
    return this.osmProvider.getDirections(origin, destination);
  }

  async getAutocomplete(input: string, sessionToken?: string): Promise<any[]> {
    if (this.hasGoogleKey()) {
      try {
        const res = await this.googleProvider.getAutocomplete(input, sessionToken);
        if (res && res.length > 0) return res;
      } catch (err: any) {
        console.warn('[HybridMapProvider] Google autocomplete failed, falling back to OSM:', err.message || err);
      }
    }
    return this.osmProvider.getAutocomplete(input, sessionToken);
  }

  async getPlaceDetails(placeId: string, sessionToken?: string): Promise<GeocodeResult | null> {
    if (this.hasGoogleKey()) {
      try {
        const res = await this.googleProvider.getPlaceDetails(placeId, sessionToken);
        if (res) return res;
      } catch (err: any) {
        console.warn('[HybridMapProvider] Google place details failed, falling back to OSM:', err.message || err);
      }
    }
    return this.osmProvider.getPlaceDetails(placeId, sessionToken);
  }
}
