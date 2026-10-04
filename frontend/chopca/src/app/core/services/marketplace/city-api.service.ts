import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataPage } from '@app/core/models/shared/data-page.model';
import {
  City,
  CityRequest,
  CitySearchRequest,
} from '@app/core/models/marketplace';
import { CityService } from './city.service';
import { WorkspaceService } from '@app/core/services/marketplace/workspace.service';
import { environment } from '@environments/environment';

@Injectable()
export class CityApiService implements CityService {

  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceService);

  private readonly publicUrl = `${environment.apiUrl}/reference/cities`;
  private readonly adminUrl  = `${environment.apiUrl}/admin/cities`;

  private getReadBaseUrl(): string {
    return this.workspace.isAdminWorkspace() ? this.adminUrl : this.publicUrl;
  }

  // ═══════════════════════════════════════════════════════════
  //  Reads
  // ═══════════════════════════════════════════════════════════

  getCities(): Observable<City[]> {
    if (this.workspace.isAdminWorkspace()) {
      const params = new HttpParams()
        .set('page', '0')
        .set('size', '1000')
        .set('sortBy', 'name')
        .set('sortDir', 'asc');
      return this.http
        .get<DataPage<City>>(this.adminUrl, { params })
        .pipe(map(page => page.content));
    }
    return this.http.get<City[]>(this.publicUrl);
  }

  getCityById(id: string): Observable<City> {
    return this.http.get<City>(`${this.getReadBaseUrl()}/${id}`);
  }

  // ═══════════════════════════════════════════════════════════
  //  Admin — search + CRUD
  // ═══════════════════════════════════════════════════════════

  searchCities(request: CitySearchRequest): Observable<DataPage<City>> {
    let params = new HttpParams();

    if (request.keyword)     params = params.set('keyword',     request.keyword);
    if (request.region)      params = params.set('region',      request.region);
    if (request.countryCode) params = params.set('countryCode', request.countryCode);

    params = params
      .set('page',  String(request.page ?? 0))
      .set('size',  String(request.size ?? 20));

    if (request.sortBy) {
      params = params
        .set('sortBy',  request.sortBy)
        .set('sortDir', request.sortDirection ?? 'asc');
    }

    return this.http.get<DataPage<City>>(this.adminUrl, { params });
  }

  createCity(request: CityRequest): Observable<City> {
    return this.http.post<City>(this.adminUrl, request);
  }

  updateCity(id: string, request: CityRequest): Observable<City> {
    return this.http.put<City>(`${this.adminUrl}/${id}`, request);
  }

  deleteCity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }
}
