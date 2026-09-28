import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  Category,
  CategoryRequest,
  CategorySearchRequest,
  ModerationStatus,
} from '@app/core/models/marketplace';
import { DataPage } from '@app/core/models/shared';
import { CategoryService } from '@app/core/services/marketplace/category.service';
import categoriesData from '@app/mock/data/categories.json';

/**
 * Mock implementation of CategoryService.
 *
 * Implements the same filtering logic as the backend so that switching
 * to the real API changes nothing for the caller. Returns `DataPage`
 * objects matching the backend's pagination contract.
 */
@Injectable()
export class CategoryMockService implements CategoryService {

  private categories: Category[] = categoriesData as Category[];
  private readonly latency = 300;

  // ─── Reads ────────────────────────────────────────────────

  getCategories(): Observable<Category[]> {
    return of(this.categories).pipe(delay(this.latency));
  }

  searchCategories(
    request: CategorySearchRequest
  ): Observable<DataPage<Category>> {
    let result = [...this.categories];

    if (request.type) {
      result = result.filter(c => c.type === request.type);
    }

    if (request.moderationStatus) {
      // Mock data has no moderationStatus field — skip for now.
      // Add filtering here when the field is present in categories.json.
    }

    if (request.name) {
      const needle = request.name.toLowerCase();
      result = result.filter(c => c.name.toLowerCase() === needle);
    }

    if (request.keyword) {
      const needle = request.keyword.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(needle) ||
        (c.description?.toLowerCase().includes(needle) ?? false)
      );
    }

    // Sort
    const sortBy = request.sortBy ?? 'name';
    const dir = request.sortDirection ?? 'ASC';
    result.sort((a, b) => {
      const av = (a as any)[sortBy] ?? '';
      const bv = (b as any)[sortBy] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'ASC' ? cmp : -cmp;
    });

    // Paginate
    const page = request.page ?? 0;
    const size = request.size ?? 20;
    const totalElements = result.length;
    const content = result.slice(page * size, page * size + size);

    return of(this.buildPage(content, page, size, totalElements))
      .pipe(delay(this.latency));
  }

  getCategoryById(id: string): Observable<Category> {
    const category = this.categories.find(c => c.id === id);
    if (!category) {
      return throwError(() => new Error(`Category not found: ${id}`)).pipe(delay(this.latency));
    }
    return of(category).pipe(delay(this.latency));
  }

  // ─── Writes ───────────────────────────────────────────────

  createCategory(request: CategoryRequest): Observable<Category> {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name: request.name,
      description: request.description ?? null,
      iconUrl: request.iconUrl ?? null,
      type: request.type,
      isActive: false,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.categories = [...this.categories, newCategory];
    return of(newCategory).pipe(delay(this.latency));
  }

  updateCategory(id: string, request: Partial<CategoryRequest>): Observable<Category> {
    const index = this.categories.findIndex(c => c.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Category not found: ${id}`)).pipe(delay(this.latency));
    }
    const updated: Category = {
      ...this.categories[index],
      ...request,
      id,
      updatedAt: new Date().toISOString(),
    } as Category;
    this.categories = [
      ...this.categories.slice(0, index),
      updated,
      ...this.categories.slice(index + 1),
    ];
    return of(updated).pipe(delay(this.latency));
  }

  deleteCategory(id: string): Observable<void> {
    this.categories = this.categories.filter(c => c.id !== id);
    return of(void 0).pipe(delay(this.latency));
  }

  // ─── Helpers ──────────────────────────────────────────────

  /**
   * Constructs a `DataPage<T>` that mirrors the backend's record,
   * including the derived fields (totalPages, first, last, empty).
   */
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
