import { ModerationStatus, UserType } from './enum-type.model';
import { SearchRequest } from '@app/core/models/shared';

/**
 * Full ingredient — returned by detail endpoints.
 * Mirror of backend `IngredientResponse`.
 */
export interface Ingredient {
  readonly id: string;
  readonly name: string;
  readonly isAllergen: boolean;

  // Origin
  readonly createdByType: UserType;
  readonly createdById: string;

  // Moderation
  readonly moderationStatus: ModerationStatus;
  readonly isActive: boolean;

  // Timestamps
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Lightweight ingredient — used inside Meal responses.
 * Mirror of backend `IngredientSummaryResponse`.
 */
export interface IngredientSummary {
  readonly id: string;
  readonly name: string;
  readonly isAllergen: boolean;
  readonly moderationStatus: ModerationStatus;   // ← add
}

/**
 * Request payload for creating or updating an ingredient.
 *
 * On CREATE: use `IngredientRequest` — `name` is required.
 * On UPDATE: use `Partial<IngredientRequest>`.
 *
 * Note: origin (creator) and moderation status are NOT in the request —
 * they are derived from the security context and lifecycle rules.
 */
export interface IngredientRequest {
  name: string;
  isAllergen?: boolean;
}

/**
 * Filters for the ingredient search endpoint.
 *
 * Extends the generic {@link SearchRequest} with ingredient-specific filters.
 */
export interface IngredientSearchRequest extends SearchRequest {
  /** Exact name match (case-insensitive). */
  readonly name?: string;

  /** Filter by allergen flag. */
  readonly isAllergen?: boolean;

  /** Filter by moderation status. */
  readonly moderationStatus?: ModerationStatus;

  /** Filter by creator type. */
  readonly createdByType?: string;

  /** Filter by creator ID. */
  readonly createdById?: string;
}
