import { CategoryType, ModerationStatus } from './enum-type.model';
import { SearchRequest } from '../shared';

/**
 * Full category — returned by admin and detail endpoints.
 * Mirror of backend `CategoryResponse`.
 */
export interface Category {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly iconUrl: string | null;
  readonly type: CategoryType;
  readonly isActive: boolean;
  readonly createdAt: string;      // ISO 8601
  readonly updatedAt: string;      // ISO 8601
}

/**
 * Lightweight category — used inside Meal, Vendor, etc.
 * Mirror of backend `CategorySummaryResponse`.
 */
export interface CategorySummary {
  readonly id: string;
  readonly name: string;
  readonly iconUrl: string | null;
  readonly type: CategoryType;
}

/**
 * Request payload for creating or updating a category.
 *
 * On CREATE: use `CategoryRequest` directly — `name` and `type` are required.
 * On UPDATE: use `Partial<CategoryRequest>` — every field is optional.
 *
 *     createCategory(req: CategoryRequest): ...
 *     updateCategory(id: string, req: Partial<CategoryRequest>): ...
 */
export interface CategoryRequest {
  name: string;
  description?: string;
  iconUrl?: string;
  type: CategoryType;
}

/**
 * Filters for the category search endpoint.
 *
 * Mirrors the backend's `CategorySearchRequest`.
 * All fields are optional — the backend applies defaults.
 */
export interface CategorySearchRequest extends SearchRequest{

  /** Exact name match (case-insensitive). */
  readonly name?: string;

  /** Filter by category type (CUISINE, DISH_TYPE). */
  readonly type?: CategoryType;

  /** Filter by moderation status (PENDING, APPROVED, REJECTED, DISABLED). */
  readonly moderationStatus?: ModerationStatus;
}
