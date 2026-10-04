import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { DataPage } from '@app/core/models/shared/data-page.model';
import {
  City,
  CityRequest,
  CitySearchRequest,
} from '@app/core/models/marketplace';
import { CityService } from '@app/core/services/marketplace/city.service';

@Injectable()
export class CityMockService implements CityService {

  private cities: City[] = [
    { id: 'c17a0000-0000-4000-8000-000000000001', name: 'Douala',    region: 'Littoral', countryCode: 'CM' },
    { id: 'c17a0000-0000-4000-8000-000000000002', name: 'Yaoundé',   region: 'Centre',   countryCode: 'CM' },
    { id: 'c17a0000-0000-4000-8000-000000000003', name: 'Bafoussam', region: 'Ouest',    countryCode: 'CM' },
    // …
  ];

  getCities(): Observable<City[]> {
    return of(this.cities);
  }

  getCityById(id: string): Observable<City> {
    const found = this.cities.find(c => c.id === id);
    return found ? of(found) : throwError(() => new Error('City not found'));
  }

  searchCities(request: CitySearchRequest): Observable<DataPage<City>> {
    let filtered = this.cities;

    if (request.keyword) {
      const k = request.keyword.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(k) ||
        (c.region ?? '').toLowerCase().includes(k));
    }
    if (request.region)      filtered = filtered.filter(c => c.region === request.region);
    if (request.countryCode) filtered = filtered.filter(c => c.countryCode === request.countryCode);

    const page = request.page ?? 0;
    const size = request.size ?? 20;
    const start = page * size;
    const content = filtered.slice(start, start + size);
    const totalElements = filtered.length;

    return of({
      content,
      page,
      size,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
    } as DataPage<City>);
  }

  createCity(request: CityRequest): Observable<City> {
    const city: City = {
      id: crypto.randomUUID(),
      name: request.name,
      region: request.region,
      countryCode: request.countryCode,
    };
    this.cities = [...this.cities, city];
    return of(city);
  }

  updateCity(id: string, request: CityRequest): Observable<City> {
    this.cities = this.cities.map(c =>
      c.id === id
        ? { id, name: request.name, region: request.region, countryCode: request.countryCode }
        : c);
    return this.getCityById(id);
  }

  deleteCity(id: string): Observable<void> {
    this.cities = this.cities.filter(c => c.id !== id);
    return of(void 0);
  }
}
