import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Meal,
  MealSummary,
  MealRequest,
  MealSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { MealService } from './meal.service';
import { environment } from '@environments/environment';
import { RoleContext } from '@app/core/services/auth/role-context.service';
import { WorkspaceService } from './workspace.service';
/**
 * Real implementation of MealService.
 * Talks to the backend's meal API through the Gateway.
 */
@Injectable()
export class MealApiService implements MealService {

  private http = inject(HttpClient);
  private readonly roleContext = inject(RoleContext);
  private readonly workspace = inject(WorkspaceService);

  /** Public meal browsing endpoints. */
  private readonly publicUrl = `${environment.apiUrl}/public/meals`;

  /** Vendor meal browsing endpoints. */
  private readonly vendorUrl = `${environment.apiUrl}/vendor/meals`;

  /** Admin / vendor management endpoints. */
  private readonly adminUrl = `${environment.apiUrl}/admin/meals`;

  // ─── Reads ────────────────────────────────────────────────

  getMeals(): Observable<MealSummary[]> {
    // Fallback: fetch a large page and return just the content
    const params = new HttpParams().set('size', '200');
    return new Observable<MealSummary[]>(subscriber => {
      this.http.get<DataPage<MealSummary>>(this.getReadBaseUrl(), { params }).subscribe({
        next: (page) => {
          subscriber.next(page.content);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  getMealsByIds(ids: string[]): Observable<MealSummary[]> {
    const params = new HttpParams().set('ids', ids.join(','));
    return this.http.get<MealSummary[]>(this.getReadBaseUrl(), { params });
  }

  search(request: MealSearchRequest): Observable<DataPage<MealSummary>> {
    console.log("[MealApiService] search", request);
    const params = this.buildSearchParams(request);
    return this.http.get<DataPage<MealSummary>>(this.getReadBaseUrl(), { params });
  }

  getMealById(id: string): Observable<Meal> {
    return this.http.get<Meal>(`${this.getReadBaseUrl()}/${id}`);
  }

  // ─── Writes ───────────────────────────────────────────────

  createMeal(request: MealRequest): Observable<Meal> {
    return this.http.post<Meal>(this.vendorUrl, request);
  }

  updateMeal(id: string, request: Partial<MealRequest>): Observable<Meal> {
    return this.http.put<Meal>(`${this.vendorUrl}/${id}`, request);
  }

  deleteMeal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.vendorUrl}/${id}`);
  }

  // ─── Helpers ──────────────────────────────────────────────
  private getReadBaseUrl(): string {
      return this.workspace.isAdminWorkspace() && this.roleContext.isAdmin() ? this.adminUrl : (this.workspace.isVendorWorkspace() && this.roleContext.isVendor() ? this.vendorUrl : this.publicUrl);
  }

  /**
   * Maps a `MealSearchRequest` to HTTP query params, matching
   * the backend's `@RequestParam` expectations exactly.
   *
   * Array filters are sent as comma-separated values, e.g.
   * `cuisineIds=abc,def,ghi` — Spring binds this to `List<UUID>`
   * automatically.
   */
  private buildSearchParams(request: MealSearchRequest): HttpParams {
    let params = new HttpParams();

    if (request.keyword)               params = params.set('keyword', request.keyword);
    if (request.vendorId)              params = params.set('vendorId', request.vendorId);
    if (request.businessName)          params = params.set('businessName', request.businessName);

    if (request.loadFull)              params = params.set('loadFull', request.loadFull);
    if (request.withCount)          params = params.set('withCount', request.withCount);

    if (request.categoryIds?.length)    params = params.set('categoryIds', request.categoryIds.join(','));
    if (request.cuisineIds?.length)    params = params.set('cuisineIds', request.cuisineIds.join(','));
    if (request.dishTypeIds?.length)   params = params.set('dishTypeIds', request.dishTypeIds.join(','));
    if (request.excludeIngredientIds?.length)
      params = params.set('excludeIngredientIds', request.excludeIngredientIds.join(','));

    if (request.minPrice != null)      params = params.set('minPrice', request.minPrice.toString());
    if (request.maxPrice != null)      params = params.set('maxPrice', request.maxPrice.toString());
    if (request.minRating != null)     params = params.set('minRating', request.minRating.toString());

    if (request.minPrepTime != null)      params = params.set('minPrepTime', request.minPrepTime.toString());
    if (request.maxPrepTime != null)      params = params.set('maxPrepTime', request.maxPrepTime.toString());

    if (request.cityId != null)      params = params.set('cityId', request.cityId);

    if (request.distributionLocationIds?.length)
      params = params.set('distributionLocationIds', request.distributionLocationIds.join(","));

    if (request.page != null)          params = params.set('page', request.page.toString());
    if (request.size != null)          params = params.set('size', request.size.toString());
    if (request.sortBy)                params = params.set('sortBy', request.sortBy);
    if (request.sortDirection)         params = params.set('sortDirection', request.sortDirection);

    return params;
  }
}
