import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Location,
  LocationSummary,
  LocationRequest,
  LocationSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';

/**
 * Abstract contract for the Location service.
 *
 * Components inject {@link LOCATION_SERVICE} — never a concrete implementation.
 * The DI container resolves it to either LocationMockService (dev) or
 * LocationApiService (prod) based on `environment.useMockServices`.
 */
export abstract class LocationService {

  /**
   * Fetch all locations (no filter).
   * Prefer {@link searchLocations} when you need to filter.
   */
  abstract getLocations(): Observable<Location[]>;

  /**
   * Search locations with optional filters.
   * Returns a paginated result.
   */
  abstract searchLocations(
    request: LocationSearchRequest
  ): Observable<DataPage<Location>>;

  /**
   * Convenience: search locations and unwrap the page content.
   *
   * Used by the meal editor picker, which needs a flat list
   * to populate the selectable list.
   */
  abstract searchLocationsFlat(request: {
    keyword?: string;
    vendorId?: string;
    size?: number;
  }): Observable<LocationSummary[]>;

  /**
   * Fetch multiple locations by ID in one call.
   *
   * Used by the meal editor picker to hydrate pills when editing
   * an existing meal (the form only stores location IDs).
   */
  abstract getLocationsByIds(ids: string[]): Observable<LocationSummary[]>;

  abstract getLocationById(id: string): Observable<Location>;

  abstract createLocation(request: LocationRequest): Observable<Location>;

  abstract updateLocation(
    id: string,
    request: Partial<LocationRequest>
  ): Observable<Location>;

  abstract deleteLocation(id: string): Observable<void>;
}

export const LOCATION_SERVICE = new InjectionToken<LocationService>('LocationService');
