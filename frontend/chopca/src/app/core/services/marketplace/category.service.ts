import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Category,
  CategoryRequest,
  CategorySearchRequest,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';

/**
 * Abstract contract for the Category service.
 *
 * Components inject {@link CATEGORY_SERVICE} — never a concrete implementation.
 * The DI container resolves it to either CategoryMockService (dev) or
 * CategoryApiService (prod) based on `environment.useMockServices`.
 */
export abstract class CategoryService {

  /**
   * Fetch all categories (no filter).
   * Prefer {@link searchCategories} when you need to filter — the backend
   * handles filtering efficiently instead of shipping the full list.
   */
  abstract getCategories(): Observable<Category[]>;

  /**
   * Search categories with optional filters.
   *
   * Returns a paginated result. Use `page`/`size` on the request to
   * control pagination.
   */
  abstract searchCategories(
    request: CategorySearchRequest
  ): Observable<DataPage<Category>>;

  abstract getCategoryById(id: string): Observable<Category>;
  abstract createCategory(request: CategoryRequest): Observable<Category>;
  abstract updateCategory(id: string, request: Partial<CategoryRequest>): Observable<Category>;
  abstract deleteCategory(id: string): Observable<void>;
}

export const CATEGORY_SERVICE = new InjectionToken<CategoryService>('CategoryService');
