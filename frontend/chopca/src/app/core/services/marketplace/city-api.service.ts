import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { City } from '@app/core/models/marketplace';
import { CityService } from './city.service';
import { environment } from '@environments/environment';

/**
 * Real implementation of CityService.
 * Talks to the backend's reference API through the Gateway.
 */
@Injectable()
export class CityApiService implements CityService {

  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reference/cities`;

  getCities(): Observable<City[]> {
    return this.http.get<City[]>(this.baseUrl);
  }

  getCityById(id: string): Observable<City> {
    return this.http.get<City>(`${this.baseUrl}/${id}`);
  }
}
