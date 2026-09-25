import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Location,
  LocationSummary,
  LocationRequest,
  LocationSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { LocationService } from './location.service';
import { RoleContext } from '@app/core/services/role-context.service';
import { environment } from '@environments/environment';

/**
 * Real implementation of LocationService.
 *
 * Role-aware: admins hit /admin/* (sees all statuses and all vendors),
 * vendors hit /vendor/* (sees their own locations).
 * Public reads use /public/*.
 */
@Injectable()
export class LocationApiService implements LocationService {

  private http = inject(HttpClient);
  private readonly roleContext = inject(RoleContext);

  private readonly publicUrl = `${environment.apiUrl}/public/locations`;
  private readonly adminUrl  = `${environment.apiUrl}/admin/locations`;
  private readonly vendorUrl = `${environment.apiUrl}/vendor/locations`;

  // ─── Reads ────────────────────────────────────────────────

  getLocations(): Observable<Location[]> {
    return new Observable<Location[]>(subscriber => {
      const params = new HttpParams().set('size', '500');
      this.http.get<DataPage<Location>>(this.getReadBaseUrl(), { params }).subscribe({
        next: (page) => {
          subscriber.next(page.content);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  searchLocations(
    request: LocationSearchRequest
  ): Observable<DataPage<Location>> {
    const params = this.buildSearchParams(request);
    return this.http.get<DataPage<Location>>(this.getReadBaseUrl(), { params });
  }

  searchLocationsFlat(request: {
    keyword?: string;
    vendorId?: string;
    size?: number;
  }): Observable<LocationSummary[]> {
    const params = this.buildSearchParams({
      keyword: request.keyword,
      vendorId: request.vendorId,
      size: request.size ?? 50,
      sortBy: 'name',
      sortDirection: 'ASC',
    });

    return this.http
      .get<DataPage<LocationSummary>>(this.getReadBaseUrl(), { params })
      .pipe(map(page => page.content));
  }

  getLocationsByIds(ids: string[]): Observable<LocationSummary[]> {
    if (!ids || ids.length === 0) {
      return new Observable(sub => {
        sub.next([]);
        sub.complete();
      });
    }

    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<LocationSummary[]>(
      `${this.getReadBaseUrl()}/by-ids`,
      { params },
    );
  }

  getLocationById(id: string): Observable<Location> {
    return this.http.get<Location>(`${this.getReadBaseUrl()}/${id}`);
  }

  // ─── Writes ───────────────────────────────────────────────

  createLocation(request: LocationRequest): Observable<Location> {
    return this.http.post<Location>(this.vendorUrl, request);
  }

  updateLocation(
    id: string,
    request: Partial<LocationRequest>
  ): Observable<Location> {
    return this.http.patch<Location>(`${this.vendorUrl}/${id}`, request);
  }

  deleteLocation(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private getReadBaseUrl(): string {
    if (this.roleContext.isAdmin()) return this.adminUrl;
    if (this.roleContext.isVendor()) return this.vendorUrl;
    return this.publicUrl;
  }

  private buildSearchParams(request: LocationSearchRequest): HttpParams {
    let params = new HttpParams();
    if (request.keyword)              params = params.set('keyword', request.keyword);
    if (request.vendorId)             params = params.set('vendorId', request.vendorId);
    if (request.name)                 params = params.set('name', request.name);
    if (request.moderationStatus)     params = params.set('moderationStatus', request.moderationStatus);
    if (request.nearLatitude != null) params = params.set('nearLatitude', request.nearLatitude.toString());
    if (request.nearLongitude != null) params = params.set('nearLongitude', request.nearLongitude.toString());
    if (request.radiusKm != null)     params = params.set('radiusKm', request.radiusKm.toString());
    if (request.page != null)         params = params.set('page', request.page.toString());
    if (request.size != null)         params = params.set('size', request.size.toString());
    if (request.sortBy)               params = params.set('sortBy', request.sortBy);
    if (request.sortDirection)        params = params.set('sortDirection', request.sortDirection);
    return params;
  }
}
