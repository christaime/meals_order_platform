import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { City } from '@app/core/models/marketplace';

/**
 * Abstract contract for the City service.
 *
 * Provides the list of cities where vendors can operate.
 * Components inject {@link CITY_SERVICE} — never a concrete implementation.
 * The DI container resolves it based on `environment.useMockServices`.
 */
export abstract class CityService {
  /**
   * Fetch all cities where a vendor can register.
   * Results are typically cached by the implementation.
   */
  abstract getCities(): Observable<City[]>;

  /**
   * Fetch a single city by id.
   */
  abstract getCityById(id: string): Observable<City>;
}

export const CITY_SERVICE = new InjectionToken<CityService>('CityService');
