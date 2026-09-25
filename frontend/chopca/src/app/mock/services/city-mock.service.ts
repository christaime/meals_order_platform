import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { City } from '@app/core/models/marketplace';
import { CityService } from '@app/core/services/marketplace/city.service';
import citiesData from '@app/mock/data/cities.json';

/**
 * Mock implementation of CityService.
 * Loads data from a JSON file at startup (bundled into the build).
 */
@Injectable()
export class CityMockService implements CityService {

  private readonly cities: City[] = citiesData as City[];
  private readonly latency = 200;

  getCities(): Observable<City[]> {
    return of(this.cities).pipe(delay(this.latency));
  }

  getCityById(id: string): Observable<City> {
    const city = this.cities.find(c => c.id === id);
    if (!city) {
      return throwError(() => new Error(`City not found: ${id}`)).pipe(delay(this.latency));
    }
    return of(city).pipe(delay(this.latency));
  }
}
