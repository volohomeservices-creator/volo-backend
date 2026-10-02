import { IMapProvider } from './map-provider';
import { HybridMapProvider } from './hybrid-map-provider';

class MapsService {
  private provider: IMapProvider;

  constructor() {
    this.provider = new HybridMapProvider();
  }

  getProvider(): IMapProvider {
    return this.provider;
  }
}

export const mapsService = new MapsService();
