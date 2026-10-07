import { ModerationStatus } from './enum-type.model';
import { CategorySummary } from './category.model';
import { IngredientSummary } from './ingredient.model';
import { LocationSummary } from './location.model';
import { SearchRequest } from '@app/core/models/shared';

/**
 * Full meal — returned by detail endpoints.
 * Mirror of backend `MealResponse`.
 */
export interface Meal {
  readonly id: string;
  readonly vendorId: string;
  readonly vendorBusinessName: string;

  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly imageUrl: string | null;
  readonly imageStorageRef: string | null;

  readonly isAvailable: boolean;
  readonly averageRating: number;
  readonly totalRatings: number;
  readonly prepTimeMinutes: number | null;

  readonly cuisines: CategorySummary[];
  readonly dishTypes: CategorySummary[];
  readonly ingredients: IngredientSummary[];
  readonly distributionLocations: LocationSummary[];
  readonly supplements: MealSummary[];
  readonly ingredientCount?: number;
  readonly distributionLocationCount?: number;
  readonly allergenIngredientCount?: number;

  readonly moderationStatus: ModerationStatus;
  readonly isActive: boolean;

  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Lightweight meal — used in listing pages and carousels.
 * Also reused as the shape for supplements (a meal with the SUPPLEMENT category).
 */
export interface MealSummary {
  readonly id: string;
  readonly vendorId: string;
  readonly vendorBusinessName: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly imageUrl: string | null;
  readonly isAvailable?: boolean;
  readonly averageRating: number;
  readonly totalRatings: number;
  readonly prepTimeMinutes: number | null;
  readonly moderationStatus: ModerationStatus;
  readonly cuisines: CategorySummary[];
  readonly dishTypes: CategorySummary[];
  readonly ingredients?: IngredientSummary[];
  readonly distributionLocations?: LocationSummary[];
  // ─── Composition & distribution counts (for the management table) ──
  readonly ingredientCount?: number;
  readonly allergenIngredientCount?: number;
  readonly distributionLocationCount?: number;
}

/**
 * Request payload for creating or updating a meal.
 *
 * On CREATE: name, price are required. isAvailable is NOT sent —
 * the backend decides the initial value.
 * On UPDATE: use Partial<MealRequest>.
 */
export interface MealRequest {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  prepTimeMinutes?: number;
  isAvailable?: boolean;              // only sent on update
  categoryIds?: string[];             // cuisines + dish types combined
  ingredientIds?: string[];
  distributionLocationIds?: string[];
  supplementIds?: string[];
  imageStorageRef: string | null;
}

export interface MealSearchRequest extends SearchRequest {

  readonly vendorId?: string;

  readonly businessName?: string;
  readonly availableOnly?: boolean;
  readonly categoryIds?: string[];
  readonly cuisineIds?: string[];
  readonly dishTypeIds?: string[];
  readonly excludeIngredientIds?: string[];
  readonly minPrice?: number;
  readonly maxPrice?: number;
  readonly minRating?: number;

  readonly minPrepTime?: number;
  readonly maxPrepTime?: number;

  readonly distributionLocationIds?: string[];
  readonly cityId?: string;

  readonly moderationStatus?: ModerationStatus;
  readonly loadFull?: boolean;
  readonly withCount?: boolean;
}
