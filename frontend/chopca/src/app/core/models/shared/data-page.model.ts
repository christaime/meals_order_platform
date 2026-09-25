/**
 * Paginated result wrapper.
 *
 * Mirrors the backend's `DataPage<T>` record (com.mealmarket.common.pagination).
 * Every paginated endpoint in the API returns this shape.
 *
 * @typeParam T — the type of items in the page
 */
export interface DataPage<T> {
  readonly content: T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
  readonly first: boolean;
  readonly last: boolean;
  readonly empty: boolean;
}
