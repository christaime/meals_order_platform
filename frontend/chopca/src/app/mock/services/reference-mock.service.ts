import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { MealStatFilter } from '@core/models/marketplace/reference.model';
import { ReferenceService } from '@app/core/services/marketplace/reference.service';
import filterData from '@app/mock/data/meal-stats-filter.json';

/**
 * Mock implementation of ReferenceService.
 * Loads data from a JSON file at startup (bundled into the build).
 */
@Injectable()
export class ReferenceMockService implements ReferenceService {

  private readonly filters: MealStatFilter = filterData as MealStatFilter;
  private readonly latency = 200;

  getMealStatsFilters(): Observable<MealStatFilter> {
    return of(this.filters).pipe(delay(this.latency));
  }
}
