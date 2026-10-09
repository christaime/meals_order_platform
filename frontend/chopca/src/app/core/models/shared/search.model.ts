/**
 * Filters for the category search endpoint.
 *
 * Mirrors the backend's `CategorySearchRequest`.
 * All fields are optional — the backend applies defaults.
 */
export interface SearchRequest {
  /** Keyword search in name or description. */
  readonly keyword?: string;

  /** Page number (0-indexed). */
  readonly page?: number;

  /** Page size. */
  readonly size?: number;

  /** Sort field (e.g. 'name', 'createdAt'). */
  readonly sortBy?: string;

  /** Sort direction. */
  readonly sortDirection?: SortDirection;
}

export type SortDirection = 'ASC' | 'DESC';
