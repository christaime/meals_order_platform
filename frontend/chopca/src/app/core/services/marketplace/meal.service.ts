import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Meal,
  MealSummary,
  MealRequest,
  MealSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';

/**
 * Abstract contract for the Meal service.
 *
 * Components inject {@link MEAL_SERVICE} — never a concrete implementation.
 * The DI container resolves it based on `environment.useMockServices`.
 */
export abstract class MealService {
  /**
   * List all meals (no filter).
   * Prefer {@link search} when filtering — the backend handles it efficiently.
   */
  abstract getMeals(): Observable<MealSummary[]>;

  /**
   * Search meals with optional filters.
   * Returns a paginated result.
   */
  abstract search(request: MealSearchRequest): Observable<DataPage<MealSummary>>;
  abstract getMealsByIds(ids:string[]): Observable<MealSummary[]>;
  abstract getMealById(id: string): Observable<Meal>;
  abstract createMeal(request: MealRequest): Observable<Meal>;
  abstract updateMeal(id: string, request: Partial<MealRequest>): Observable<Meal>;
  abstract deleteMeal(id: string): Observable<void>;

}

export const MEAL_SERVICE = new InjectionToken<MealService>('MealService');
