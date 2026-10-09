import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Ingredient,
  IngredientSummary,
  IngredientRequest,
  IngredientSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { ModerationStatus } from '@core/models/marketplace';
import { SortDirection } from '@core/models/shared';

/**
 * Abstract contract for the Ingredient service.
 *
 * Components inject {@link INGREDIENT_SERVICE} — never a concrete implementation.
 * The DI container resolves it to either IngredientMockService (dev) or
 * IngredientApiService (prod) based on `environment.useMockServices`.
 */
export abstract class IngredientService {

  /**
   * Fetch all ingredients (no filter).
   * Prefer {@link searchIngredients} when you need to filter.
   */
  abstract getIngredients(): Observable<Ingredient[]>;

  /**
   * Search ingredients with optional filters.
   * Returns a paginated result.
   */
  abstract searchIngredients(
    request: IngredientSearchRequest
  ): Observable<DataPage<IngredientSummary>>;

  /**
   * Convenience: search ingredients and unwrap the page content.
   *
   * Used by the meal editor picker, which needs a flat list
   * (not paginated) to populate dropdowns and pills.
   */
  abstract searchIngredientsFlat(request: {
    keyword?: string;
    size?: number;
    moderationStatus?: ModerationStatus
  }): Observable<IngredientSummary[]>;

  /**
   * Fetch multiple ingredients by ID in one call.
   *
   * Used by the meal editor picker to hydrate pills when editing
   * an existing meal (the form only stores ingredient IDs).
   */
  abstract getIngredientsByIds(ids: string[]): Observable<IngredientSummary[]>;

  abstract getIngredientById(id: string): Observable<Ingredient>;

  abstract createIngredient(request: IngredientRequest): Observable<Ingredient>;

  abstract updateIngredient(
    id: string,
    request: Partial<IngredientRequest>
  ): Observable<Ingredient>;

  abstract deleteIngredient(id: string): Observable<void>;
}

export const INGREDIENT_SERVICE = new InjectionToken<IngredientService>('IngredientService');
