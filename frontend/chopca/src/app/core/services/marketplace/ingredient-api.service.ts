import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Ingredient,
  IngredientSummary,
  IngredientRequest,
  IngredientSearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { IngredientService } from './ingredient.service';
import { RoleContext } from '@app/core/services/auth/role-context.service';
import { environment } from '@environments/environment';

/**
 * Real implementation of IngredientService.
 * Talks to the backend's ingredient API through the Gateway.
 *
 * Role-aware: admins hit /admin/* (sees all moderation statuses),
 * everyone else hits /public/* (approved only).
 */
@Injectable()
export class IngredientApiService implements IngredientService {

  private http = inject(HttpClient);
  private readonly roleContext = inject(RoleContext);

  private readonly publicUrl = `${environment.apiUrl}/public/ingredients`;
  private readonly adminUrl  = `${environment.apiUrl}/admin/ingredients`;
  private readonly vendorUrl  = `${environment.apiUrl}/vendor/ingredients`;
  // ─── Reads ────────────────────────────────────────────────

  getIngredients(): Observable<Ingredient[]> {
    return new Observable<Ingredient[]>(subscriber => {
      const params = new HttpParams().set('size', '500');
      this.http.get<DataPage<Ingredient>>(this.getReadBaseUrl(), { params }).subscribe({
        next: (page) => {
          subscriber.next(page.content);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  searchIngredients(
    request: IngredientSearchRequest
  ): Observable<DataPage<IngredientSummary>> {
    const params = this.buildSearchParams(request);
    return this.http.get<DataPage<IngredientSummary>>(`${this.roleContext.isAdmin() ? this.adminUrl : (this.roleContext.isVendor() ? this.vendorUrl : this.publicUrl)}`, { params });
  }

  searchIngredientsFlat(request: {
    keyword?: string;
    size?: number;
  }): Observable<IngredientSummary[]> {
    const params = this.buildSearchParams({
      keyword: request.keyword,
      size: request.size ?? 10,
      sortBy: 'name',
      sortDirection: 'ASC',
    });

    return this.http
      .get<DataPage<IngredientSummary>>(`${this.roleContext.isAdmin() ? this.adminUrl : (this.roleContext.isVendor() ? this.vendorUrl : this.publicUrl)}`, { params })
      .pipe(map(page => page.content));
  }

  getIngredientsByIds(ids: string[]): Observable<IngredientSummary[]> {
    if (!ids || ids.length === 0) return new Observable(sub => {
      sub.next([]);
      sub.complete();
    });

    const params = new HttpParams().set('ids', ids.join(','));
    // The endpoint returns a flat list (not paginated)
    return this.http.get<IngredientSummary[]>(`${this.getReadBaseUrl()}/by-ids`, { params });
  }

  getIngredientById(id: string): Observable<Ingredient> {
    return this.http.get<Ingredient>(`${this.roleContext.isAdmin() ? this.adminUrl : (this.roleContext.isVendor() ? this.vendorUrl : this.publicUrl)}/${id}`);
  }

  // ─── Writes ───────────────────────────────────────────────

  createIngredient(request: IngredientRequest): Observable<Ingredient> {
    return this.http.post<Ingredient>(`${this.roleContext.isAdmin() ? this.adminUrl : this.vendorUrl }`, request);
  }

  updateIngredient(
    id: string,
    request: Partial<IngredientRequest>
  ): Observable<Ingredient> {
    return this.http.put<Ingredient>(`${this.roleContext.isAdmin() ? this.adminUrl : this.vendorUrl }/${id}`, request);
  }

  deleteIngredient(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/admin/ingredients/${id}`);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private getReadBaseUrl(): string {
    return this.roleContext.isAdmin() ? this.adminUrl : this.publicUrl;
  }

  private buildSearchParams(request: IngredientSearchRequest): HttpParams {
    let params = new HttpParams();
    if (request.keyword)          params = params.set('keyword', request.keyword);
    if (request.name)             params = params.set('name', request.name);
    if (request.isAllergen != null) params = params.set('isAllergen', request.isAllergen.toString());
    if (request.moderationStatus) params = params.set('moderationStatus', request.moderationStatus);
    if (request.createdByType)    params = params.set('createdByType', request.createdByType);
    if (request.createdById)      params = params.set('createdById', request.createdById);
    if (request.page != null)     params = params.set('page', request.page.toString());
    if (request.size != null)     params = params.set('size', request.size.toString());
    if (request.sortBy)           params = params.set('sortBy', request.sortBy);
    if (request.sortDirection)    params = params.set('sortDirection', request.sortDirection);
    return params;
  }
}
