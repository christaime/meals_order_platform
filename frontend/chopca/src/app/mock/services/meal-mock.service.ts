import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Meal,
  MealSummary,
  MealRequest,
  MealSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { MealService } from '@app/core/services/marketplace/meal.service';
import mealsData from '@app/mock/data/meals.json';

@Injectable()
export class MealMockService implements MealService {

  private meals: Meal[] = (mealsData as unknown as Meal[]).map((meal) => ({
    ...meal,
    ingredients: (meal.ingredients ?? []).map((ing) => ({
      ...ing,
      moderationStatus: ing.moderationStatus ?? meal.moderationStatus?? 'PENDING',
    }))
  }));
  private readonly latency = 300;

  // ─── Reads ────────────────────────────────────────────────

  getMeals(): Observable<MealSummary[]> {
    const summaries: MealSummary[] = this.meals.map(this.toSummary);
    return of(summaries).pipe(delay(this.latency));
  }

  search(request: MealSearchRequest): Observable<DataPage<MealSummary>> {
    let result = [...this.meals];

    // ─── Filters ────────────────────────────────────────────
    if (request.keyword) {
      const needle = request.keyword.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(needle) ||
        (m.description?.toLowerCase().includes(needle) ?? false)
      );
    }

    if (request.vendorId) {
      result = result.filter(m => m.vendorId === request.vendorId);
    }

    if (request.businessName) {
      const needle = request.businessName.toLowerCase();
      result = result.filter(m =>
        m.vendorBusinessName.toLowerCase().includes(needle)
      );
    }

    if (request.cuisineIds?.length) {
      const ids = new Set(request.cuisineIds);
      result = result.filter(m =>
        m.cuisines.some(c => ids.has(c.id))
      );
    }

    if (request.dishTypeIds?.length) {
      const ids = new Set(request.dishTypeIds);
      result = result.filter(m =>
        m.dishTypes.some(c => ids.has(c.id))
      );
    }

    if (request.excludeIngredientIds?.length) {
      const excluded = new Set(request.excludeIngredientIds);
      result = result.filter(m =>
        !m.ingredients.some(i => excluded.has(i.id))
      );
    }

    if (request.minPrice != null) {
      result = result.filter(m => m.price >= request.minPrice!);
    }
    if (request.maxPrice != null) {
      result = result.filter(m => m.price <= request.maxPrice!);
    }
    if (request.minRating != null) {
      result = result.filter(m => m.averageRating >= request.minRating!);
    }

    if (request.distributionLocationIds && request.distributionLocationIds.length > 0) {
      const locIds = request.distributionLocationIds;
      result = result.filter(m =>
        m.distributionLocations.some(l => locIds.includes(l.id ))
      );
    }

    // ─── Sort ───────────────────────────────────────────────
    const sortBy = request.sortBy ?? 'averageRating';
    const dir = request.sortDirection ?? 'DESC';
    result.sort((a, b) => {
      const av = (a as any)[sortBy] ?? 0;
      const bv = (b as any)[sortBy] ?? 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'ASC' ? cmp : -cmp;
    });

    // ─── Paginate ───────────────────────────────────────────
    const page = request.page ?? 0;
    const size = request.size ?? 20;
    const totalElements = result.length;
    const content = result
      .slice(page * size, page * size + size)
      .map(this.toSummary);

    return of(this.buildPage(content, page, size, totalElements))
      .pipe(delay(this.latency));
  }

  getMealById(id: string): Observable<Meal> {
    const meal = this.meals.find(m => m.id === id);
    if (!meal) {
      return throwError(() => new Error(`Meal not found: ${id}`)).pipe(delay(this.latency));
    }
    return of(meal).pipe(delay(this.latency));
  }

  getMealsByIds(ids:string[]): Observable<MealSummary[]>{
    const meals = this.meals.filter(m => ids.includes(m.id));
     if (!meals) {
       return throwError(() => new Error(`Meals not found: ${ids}`)).pipe(delay(this.latency));
     }
     return of(meals).pipe(delay(this.latency));
  }
  // ─── Writes ───────────────────────────────────────────────
  // (unchanged — keep your existing implementations)

  createMeal(request: MealRequest): Observable<Meal> {
    const newMeal: Meal = {
      id: crypto.randomUUID(),
      vendorId: 'mock-vendor',
      vendorBusinessName: 'Mock Vendor',
      name: request.name,
      description: request.description ?? null,
      price: request.price,
      imageUrl: request.imageUrl ?? null,
      imageStorageRef: request.imageStorageRef ?? null,
      isAvailable: request.isAvailable ?? true,
      averageRating: 0,
      totalRatings: 0,
      prepTimeMinutes: request.prepTimeMinutes ?? null,
      cuisines: [],
      dishTypes: [],
      ingredients: [],
      supplements: [],
      distributionLocations: [],
      moderationStatus: 'PENDING',
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.meals = [...this.meals, newMeal];
    return of(newMeal).pipe(delay(this.latency));
  }

  updateMeal(id: string, request: Partial<MealRequest>): Observable<Meal> {
    const index = this.meals.findIndex(m => m.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Meal not found: ${id}`)).pipe(delay(this.latency));
    }
    const updated: Meal = {
      ...this.meals[index],
      ...request,
      id,
      updatedAt: new Date().toISOString(),
    } as Meal;
    this.meals = [
      ...this.meals.slice(0, index),
      updated,
      ...this.meals.slice(index + 1),
    ];
    return of(updated).pipe(delay(this.latency));
  }

  deleteMeal(id: string): Observable<void> {
    this.meals = this.meals.filter(m => m.id !== id);
    return of(void 0).pipe(delay(this.latency));
  }

  // ─── Helpers ──────────────────────────────────────────────

  private toSummary(meal: Meal): MealSummary {
    return {
      id: meal.id,
      vendorId: meal.vendorId,
      vendorBusinessName: meal.vendorBusinessName,
      name: meal.name,
      description: meal.description,
      price: meal.price,
      imageUrl: meal.imageUrl,
      isAvailable: meal.isAvailable,
      averageRating: meal.averageRating,
      totalRatings: meal.totalRatings,
      prepTimeMinutes: meal.prepTimeMinutes,
      cuisines: meal.cuisines,
      dishTypes: meal.dishTypes,
      moderationStatus: meal.moderationStatus,
    };
  }

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
