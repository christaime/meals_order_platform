import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { MealStatFilter } from '@core/models/marketplace/reference.model';
import { ReferenceService } from './reference.service';

@Injectable({ providedIn: 'root' })
export class ReferenceApiService implements ReferenceService{

  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/reference`;

  getMealStatsFilters(): Observable<MealStatFilter> {
    return this.http.get<MealStatFilter>(`${this.base}/meal-stats-filter`);
  }
}
