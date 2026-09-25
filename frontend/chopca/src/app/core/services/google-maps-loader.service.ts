import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadPromise?: Promise<typeof google.maps>;

  load(): Promise<typeof google.maps> {
    if (!this.loadPromise) {
      setOptions({
        key: environment.googleMapsApiKey, // Property is 'key' in v2 APIOptions
        v: 'weekly',                        // Property is 'v' (version)
      });

      this.loadPromise = Promise.all([
        importLibrary('places'),
        importLibrary('geocoding'),
      ]).then(() => google.maps);
    }

    return this.loadPromise;
  }
}
