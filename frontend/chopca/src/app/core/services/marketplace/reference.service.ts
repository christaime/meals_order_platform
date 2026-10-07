import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { MealStatFilter } from '@core/models/marketplace/reference.model';

/**
 * Abstract contract for reference/parameters datas.
 *
 * {@link REFERENCE_SERVICE} — never a concrete implementation.
 */
export abstract class ReferenceService {
  /**
   * Fetch meal stat used for meal search.
   * Results are typically cached by the implementation.
   */
  abstract getMealStatsFilters(): Observable<MealStatFilter>
}

export const REFERENCE_SERVICE = new InjectionToken<ReferenceService>('ReferenceService');
