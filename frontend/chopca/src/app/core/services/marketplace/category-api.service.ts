import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Category,
  CategoryRequest,
  CategorySearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { CategoryService } from './category.service';
import { environment } from '@environments/environment';
import { RoleContext } from '@app/core/services/role-context.service';

/**
 * Real implementation of CategoryService.
 * Talks to the backend's category API through the Gateway.
 */
@Injectable()
export class CategoryApiService implements CategoryService {

  private http = inject(HttpClient);

  private readonly roleContext = inject(RoleContext);

  /** Public read endpoints (no auth). */
  private readonly publicUrl = `${environment.apiUrl}/public/categories`;

  /** Admin search + management endpoints (JWT required). */
  private readonly adminUrl = `${environment.apiUrl}/admin/categories`;

  // ─── Reads ────────────────────────────────────────────────

  getCategories(): Observable<Category[]> {
    // Public endpoint returns a DataPage — we unwrap to a flat array
    return new Observable<Category[]>(subscriber => {
      const params = new HttpParams().set('size', '200');
      this.http.get<DataPage<Category>>(`${this.roleContext.isAdmin() ? this.adminUrl : this.publicUrl}`, { params }).subscribe({
        next: (page) => {
          subscriber.next(page.content);
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }

  searchCategories(
    request: CategorySearchRequest
  ): Observable<DataPage<Category>> {
    const params = this.buildSearchParams(request);

    console.log("searchCategories",{params});
    return this.http.get<DataPage<Category>>(`${this.roleContext.isAdmin() ? this.adminUrl : this.publicUrl}`, { params });
  }

  getCategoryById(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.adminUrl}/${id}`);
  }

  // ─── Writes (admin) ───────────────────────────────────────

  createCategory(request: CategoryRequest): Observable<Category> {
    return this.http.post<Category>(this.adminUrl, request);
  }

  updateCategory(id: string, request: Partial<CategoryRequest>): Observable<Category> {
    return this.http.patch<Category>(`${this.adminUrl}/${id}`, request);
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private buildSearchParams(request: CategorySearchRequest): HttpParams {
    let params = new HttpParams();
    if (request.keyword)          params = params.set('keyword', request.keyword);
    if (request.name)             params = params.set('name', request.name);
    if (request.type)             params = params.set('type', request.type);
    if (request.moderationStatus) params = params.set('moderationStatus', request.moderationStatus);
    if (request.page != null)     params = params.set('page', request.page.toString());
    if (request.size != null)     params = params.set('size', request.size.toString());
    if (request.sortBy)           params = params.set('sortBy', request.sortBy);
    if (request.sortDirection)    params = params.set('sortDirection', request.sortDirection);
    return params;
  }
}
