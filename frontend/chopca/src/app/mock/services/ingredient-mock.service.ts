import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Ingredient,
  IngredientSummary,
  IngredientRequest,
  IngredientSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { IngredientService } from '@app/core/services/marketplace/ingredient.service';
import ingredientsData from '@app/mock/data/ingredients.json';

/**
 * Mock implementation of IngredientService.
 *
 * Implements the same filtering logic as the backend. Returns `DataPage`
 * objects matching the backend's pagination contract.
 */
@Injectable()
export class IngredientMockService implements IngredientService {

  private ingredients: Ingredient[] = ingredientsData as Ingredient[];
  private readonly latency = 300;

  // ─── Reads ────────────────────────────────────────────────

  getIngredients(): Observable<Ingredient[]> {
    return of(this.ingredients).pipe(delay(this.latency));
  }

  searchIngredients(
    request: IngredientSearchRequest
  ): Observable<DataPage<IngredientSummary>> {
    let result = [...this.ingredients];

    // ─── Filters ────────────────────────────────────────────
    if (request.name) {
      const needle = request.name.toLowerCase();
      result = result.filter(i => i.name.toLowerCase() === needle);
    }

    if (request.keyword) {
      const needle = request.keyword.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(needle)
      );
    }

    if (request.isAllergen != null) {
      result = result.filter(i => i.isAllergen === request.isAllergen);
    }

    if (request.moderationStatus) {
      result = result.filter(i => i.moderationStatus === request.moderationStatus);
    }

    if (request.createdByType) {
      result = result.filter(i => i.createdByType === request.createdByType);
    }

    if (request.createdById) {
      result = result.filter(i => i.createdById === request.createdById);
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

  searchIngredientsFlat(request: {
    keyword?: string;
    size?: number;
  }): Observable<IngredientSummary[]> {
    const keyword = request.keyword?.toLowerCase() ?? '';
    const size = request.size ?? 10;

    const matched = this.ingredients
      .filter(i => i.name.toLowerCase().includes(keyword))
      .slice(0, size)
      .map(this.toSummary);

    return of(matched).pipe(delay(this.latency));
  }

  getIngredientsByIds(ids: string[]): Observable<IngredientSummary[]> {
    if (!ids || ids.length === 0) return of([]).pipe(delay(this.latency));

    const idSet = new Set(ids);
    const matched = this.ingredients
      .filter(i => idSet.has(i.id))
      .map(this.toSummary);

    return of(matched).pipe(delay(this.latency));
  }

  getIngredientById(id: string): Observable<Ingredient> {
    const ingredient = this.ingredients.find(i => i.id === id);
    if (!ingredient) {
      return throwError(() => new Error(`Ingredient not found: ${id}`))
        .pipe(delay(this.latency));
    }
    return of(ingredient).pipe(delay(this.latency));
  }

  // ─── Writes ───────────────────────────────────────────────

  createIngredient(request: IngredientRequest): Observable<Ingredient> {
    const now = new Date().toISOString();
    const newIngredient: Ingredient = {
      id: crypto.randomUUID(),
      name: request.name,
      isAllergen: request.isAllergen ?? false,
      createdByType: 'VENDOR',
      createdById: 'mock-vendor',
      moderationStatus: 'PENDING',
      isActive: false,
      createdAt: now,
      updatedAt: now,
    };
    this.ingredients = [...this.ingredients, newIngredient];
    return of(newIngredient).pipe(delay(this.latency));
  }

  updateIngredient(
    id: string,
    request: Partial<IngredientRequest>
  ): Observable<Ingredient> {
    const index = this.ingredients.findIndex(i => i.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Ingredient not found: ${id}`))
        .pipe(delay(this.latency));
    }
    const updated: Ingredient = {
      ...this.ingredients[index],
      ...request,
      id,
      updatedAt: new Date().toISOString(),
    } as Ingredient;
    this.ingredients = [
      ...this.ingredients.slice(0, index),
      updated,
      ...this.ingredients.slice(index + 1),
    ];
    return of(updated).pipe(delay(this.latency));
  }

  deleteIngredient(id: string): Observable<void> {
    this.ingredients = this.ingredients.filter(i => i.id !== id);
    return of(void 0).pipe(delay(this.latency));
  }

  // ─── Helpers ──────────────────────────────────────────────

  private toSummary = (ingredient: Ingredient): IngredientSummary => ({
    id: ingredient.id,
    name: ingredient.name,
    isAllergen: ingredient.isAllergen,
    moderationStatus: ingredient.moderationStatus,
  });

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
