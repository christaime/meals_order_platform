import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { DataPage } from '@app/core/models/shared/data-page.model';
import {
  City,
  CityRequest,
  CitySearchRequest,
} from '@app/core/models/marketplace';

/**
 * Contract for the City service.
 *
 * The base URL is workspace-driven: the implementation reads the current
 * {@link WorkspaceService} and picks the correct endpoint.
 *
 *   - Public workspace   → /api/v1/reference/cities
 *   - Admin  workspace   → /api/v1/admin/cities
 *
 * Reads ({@link getCities}, {@link getCityById}) resolve via the workspace.
 * Writes ({@link createCity}, {@link updateCity}, {@link deleteCity}) and
 * {@link searchCities} always use the admin endpoint — they are admin-only
 * operations and there is no public equivalent.
 */
export abstract class CityService {

  // ═══════════════════════════════════════════════════════════
  //  Reads — workspace-aware base URL
  // ═══════════════════════════════════════════════════════════

  abstract getCities(): Observable<City[]>;

  abstract getCityById(id: string): Observable<City>;

  // ═══════════════════════════════════════════════════════════
  //  Admin-only operations (always `/admin/cities`)
  // ═══════════════════════════════════════════════════════════

  abstract searchCities(request: CitySearchRequest): Observable<DataPage<City>>;

  abstract createCity(request: CityRequest): Observable<City>;
  abstract updateCity(id: string, request: CityRequest): Observable<City>;
  abstract deleteCity(id: string): Observable<void>;
}

export const CITY_SERVICE = new InjectionToken<CityService>('CityService');
