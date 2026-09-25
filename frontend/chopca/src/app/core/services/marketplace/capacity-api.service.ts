import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CapacityRange } from '@app/core/models/marketplace';
import { CapacityService } from './capacity.service';
import { environment } from '@environments/environment';

/**
 * Real implementation of CapacityService.
 * Talks to the backend's reference API through the Gateway.
 */
@Injectable()
export class CapacityApiService implements CapacityService {

  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/reference/capacity-ranges`;

  getCapacityRanges(): Observable<CapacityRange[]> {
    return this.http.get<CapacityRange[]>(this.baseUrl);
  }
}
