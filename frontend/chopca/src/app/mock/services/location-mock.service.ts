import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Location,
  LocationSummary,
  LocationRequest,
  LocationSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { LocationService } from '@app/core/services/marketplace/location.service';
import locationsData from '@app/mock/data/locations.json';

/**
 * Mock implementation of LocationService.
 *
 * Implements the same filtering logic as the backend. Returns `DataPage`
 * objects matching the backend's pagination contract.
 */
@Injectable()
export class LocationMockService implements LocationService {

  private locations: Location[] = locationsData as Location[];
  private readonly latency = 300;

  // ─── Reads ────────────────────────────────────────────────

  getLocations(): Observable<Location[]> {
    return of(this.locations).pipe(delay(this.latency));
  }

  searchLocations(
    request: LocationSearchRequest
  ): Observable<DataPage<Location>> {
    let result = [...this.locations];

    console.log("searchLocations",{request});
    // ─── Filters ────────────────────────────────────────────
    if (request.vendorId) {
      result = result.filter(l => l.vendorId === request.vendorId);
    }

    if (request.name) {
      const needle = request.name.toLowerCase();
      result = result.filter(l => l.name.toLowerCase() === needle);
    }

    if (request.keyword) {
      const needle = request.keyword.toLowerCase();
      result = result.filter(l =>
        l.name.toLowerCase().includes(needle) ||
        l.address.toLowerCase().includes(needle),
      );
    }

    if (request.moderationStatus) {
      result = result.filter(l => l.moderationStatus === request.moderationStatus);
    }

    // ─── Proximity filter (approximate) ─────────────────────
    if (
      request.nearLatitude != null &&
      request.nearLongitude != null &&
      request.radiusKm != null
    ) {
      const { nearLatitude: lat, nearLongitude: lng, radiusKm } = request;
      result = result.filter(l => this.distanceKm(lat!, lng!, l.latitude, l.longitude) <= radiusKm!);
    }

    // ─── Sort ───────────────────────────────────────────────
    const sortBy = request.sortBy ?? 'name';
    const dir = request.sortDirection ?? 'ASC';
    result.sort((a, b) => {
      const av = (a as any)[sortBy] ?? '';
      const bv = (b as any)[sortBy] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'ASC' ? cmp : -cmp;
    });

    // ─── Paginate ───────────────────────────────────────────
    const page = request.page ?? 0;
    const size = request.size ?? 20;
    const totalElements = result.length;
    const content = result.slice(page * size, page * size + size);

    return of(this.buildPage(content, page, size, totalElements))
      .pipe(delay(this.latency));
  }

  searchLocationsFlat(request: {
    keyword?: string;
    vendorId?: string;
    size?: number;
  }): Observable<LocationSummary[]> {
    const keyword = request.keyword?.toLowerCase() ?? '';
    const size = request.size ?? 50;

    const matched = this.locations
      .filter(l => !request.vendorId || l.vendorId === request.vendorId)
      .filter(l =>
        !keyword ||
        l.name.toLowerCase().includes(keyword) ||
        l.address.toLowerCase().includes(keyword),
      )
      .slice(0, size)
      .map(this.toSummary);

    return of(matched).pipe(delay(this.latency));
  }

  getLocationsByIds(ids: string[]): Observable<LocationSummary[]> {
    if (!ids || ids.length === 0) return of([]).pipe(delay(this.latency));

    const idSet = new Set(ids);
    const matched = this.locations
      .filter(l => idSet.has(l.id))
      .map(this.toSummary);

    return of(matched).pipe(delay(this.latency));
  }

  getLocationById(id: string): Observable<Location> {
    const location = this.locations.find(l => l.id === id);
    if (!location) {
      return throwError(() => new Error(`Location not found: ${id}`))
        .pipe(delay(this.latency));
    }
    return of(location).pipe(delay(this.latency));
  }

  // ─── Writes ───────────────────────────────────────────────

  createLocation(request: LocationRequest): Observable<Location> {
    const now = new Date().toISOString();
    const newLocation: Location = {
      id: crypto.randomUUID(),
      vendorId: 'mock-vendor',
      vendorBusinessName: 'Mock Vendor',
      cityId: "ebolowa",
      city: { id: 'c17a0000-0000-4000-8000-000000000001', "name": "Ebolowa","region": "Sud" , countryCode: 'CM' },
      name: request.name,
      address: request.address,
      phone: request.phone ?? null,
      latitude: request.latitude,
      longitude: request.longitude,
      deliveryRadius: request.deliveryRadius ?? 10,
      moderationStatus: 'PENDING',
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    this.locations = [...this.locations, newLocation];
    return of(newLocation).pipe(delay(this.latency));
  }

  updateLocation(
    id: string,
    request: Partial<LocationRequest>
  ): Observable<Location> {
    const index = this.locations.findIndex(l => l.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Location not found: ${id}`))
        .pipe(delay(this.latency));
    }
    const updated: Location = {
      ...this.locations[index],
      ...request,
      id,
      updatedAt: new Date().toISOString(),
    } as Location;
    this.locations = [
      ...this.locations.slice(0, index),
      updated,
      ...this.locations.slice(index + 1),
    ];
    return of(updated).pipe(delay(this.latency));
  }

  deleteLocation(id: string): Observable<void> {
    this.locations = this.locations.filter(l => l.id !== id);
    return of(void 0).pipe(delay(this.latency));
  }

  // ─── Helpers ──────────────────────────────────────────────

  private toSummary = (location: Location): LocationSummary => ({
    id: location.id,
    name: location.name,
     city: { id: 'c17a0000-0000-4000-8000-000000000001', "name": "Ebolowa","region": "Sud" , countryCode: 'CM' },
    address: location.address,
    moderationStatus: location.moderationStatus,
    latitude: 3.8480,
    longitude: 11.5021,
    vendorId: "c17a0000-0000-4000-8000-000000000001",
    vendorBusinessName: "The vendor"
  });

  /** Haversine distance in km. */
  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private buildPage<T>(
    content: T[],
    page: number,
    size: number,
    totalElements: number
  ): DataPage<T> {
    const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
    return {
      content,
      page,
      size,
      totalElements,
      totalPages,
      first: page === 0,
      last: page >= totalPages - 1 || totalPages === 0,
      empty: content.length === 0,
    };
  }
}
