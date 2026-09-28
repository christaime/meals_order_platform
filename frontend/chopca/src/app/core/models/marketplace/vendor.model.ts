import {
  ModerationStatus,
  StateChangeType,
  SubscriptionTier,
  VendorStatus,
} from './enum-type.model';
import { CategorySummary } from './category.model';
import { LocationSummary } from './location.model';
import { SearchRequest } from '@core/models/shared';

/**
 * Full vendor — returned by detail endpoints.
 * Mirror of backend `VendorResponse`.
 */
export interface Vendor {
  // Identification
  readonly id: string;
  readonly userId: string;

  // Business info
  readonly businessName: string;
  readonly description: string | null;
  readonly address: string;
  readonly email: string;
  readonly phone: string;

  // Ratings
  readonly ratingAvg: number;
  readonly totalRatings: number;

  // Current state
  readonly status: VendorStatus;
  readonly statusReason: string | null;
  readonly statusChangedAt: string | null;
  readonly statusChangedBy: string | null;
  readonly statusChangeType: StateChangeType | null;

  // Subscription
  readonly subscriptionTier: SubscriptionTier;

  // Delivery
  readonly deliveryRadius: number | null;
  readonly pickupAddress: string | null;

  // Profile
  readonly profileImageUrl: string | null;
  readonly coverImageUrl: string | null;

  // Relationships
  readonly cuisines: CategorySummary[];
  readonly distributionLocations: LocationSummary[];

  // Timestamps
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Lightweight vendor — used in listings, meal cards, search results.
 * Mirror of backend `VendorSummaryResponse`.
 */
export interface VendorSummary {
  readonly id: string;
  readonly businessName: string;
  readonly description: string | null;
  readonly address?: string;
  readonly email?: string;
  readonly ratingAvg: number;
  readonly totalRatings: number;
  readonly subscriptionTier: SubscriptionTier;
  readonly status: VendorStatus;
  readonly cuisines: CategorySummary[];
  readonly profileImageUrl: string | null;

  // Supplementary marketplace UI properties
  readonly bannerUrl?: string | null;
  readonly isOpen?: boolean;
  readonly estimatedDeliveryTimeMinutes?: number | null;
  readonly minimumOrderAmount?: number | null;
  readonly primaryCuisine?: string | null;
}

/**
 * Request payload for creating or updating a vendor.
 *
 * On CREATE: use `VendorRequest` — businessName, address, email, phone, password required.
 * On UPDATE: use `Partial<VendorRequest>` — password is never sent on update.
 *
 * Note: userId is assigned by the backend after Keycloak registration.
 * Status is managed via VendorState transitions, not via this request.
 */
export interface VendorRequest {
  businessName: string;
  description?: string;
  address: string;
  email: string;
  phone: string;
  password?: string;              // present on create only
  deliveryRadius?: number;
  pickupAddress?: string;
  cuisineCategoryIds?: string[];
}

// ═══════════════════════════════════════════════════════════════
//  Vendor — State History
// ═══════════════════════════════════════════════════════════════

/**
 * Full audit record of a vendor state change.
 * Mirror of backend `VendorStateChangeResponse`.
 */
export interface VendorStateChange {
  readonly id: string;
  readonly vendorId: string;
  readonly fromStatus: VendorStatus | null;   // null for initial state
  readonly toStatus: VendorStatus;
  readonly reason: string | null;
  readonly changedBy: string;
  readonly changeType: StateChangeType;
  readonly changedAt: string;
}

/**
 * Lightweight state change summary.
 * Mirror of backend `VendorStateChangeSummaryResponse`.
 */
export interface VendorStateChangeSummary {
  readonly toStatus: VendorStatus;
  readonly reason: string | null;
  readonly changeType: StateChangeType;
  readonly changedAt: string;
}

// ═══════════════════════════════════════════════════════════════
//  Vendor — Dashboard
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregated statistics for a vendor's dashboard home page.
 * Mirror of backend `VendorDashboardResponse`.
 */
export interface VendorDashboard {
  // Menu stats
  readonly totalMealsCount: number;
  readonly approvedMealsCount: number;
  readonly pendingMealsCount: number;
  readonly availableMealsCount: number;

  // Ratings
  readonly averageRating: number;
  readonly totalRatings: number;
  readonly negativeRatingsCount: number;

  // Trust metrics (from state history)
  readonly banCount: number;
  readonly suspensionCount: number;

  // Top meals
  readonly topSellingMeals: TopMeal[];

  // Weekly trend
  readonly weeklyTrend: DailyOrderVolume[];
}

/**
 * A single entry in the vendor's top-selling meals list.
 * Flattened from `VendorDashboardResponse.TopMealDto`.
 */
export interface TopMeal {
  readonly mealId: string;
  readonly mealName: string;
  readonly orderCount: number;
  readonly totalRevenue: number;
}

/**
 * A single day's order volume in the weekly trend chart.
 * Flattened from `VendorDashboardResponse.DailyOrderVolumeDto`.
 */
export interface DailyOrderVolume {
  readonly date: string;          // ISO date (yyyy-MM-dd)
  readonly orderCount: number;
  readonly revenue: number;
}

/**
 * Request payload for vendor registration.
 *
 * Mirrors the backend's `CreateVendorRequest` record exactly:
 *   - `phone`                matches `^\+?[0-9]{8,15}$`
 *   - `cuisineCategoryIds`   is a list of CUISINE category UUIDs
 *   - `description`, `deliveryRadius`, `pickupAddress`, both image
 *     storage refs, and both CNI storage refs are nullable on the
 *     backend. The frontend form enforces stricter rules (CNI
 *     required, radius in 1..25) as a business policy — the backend
 *     accepts null for those fields.
 *
 * Storage refs are MinIO object keys returned by POST /api/v1/media.
 * Only the refs are sent; the backend resolves URLs at read time.
 */
export interface CreateVendorRequest {
  businessName: string;
  ownerName: string;
  description: string | null;
  address: string;
  phone: string;
  deliveryRadius: number | null;
  pickupAddress: string | null;
  profileImageStorageRef: string | null;
  coverImageStorageRef: string | null;
  idCardFrontStorageRef: string | null;
  idCardBackStorageRef: string | null;
  cuisineCategoryIds: string[];
}

export interface VendorSearchRequest extends SearchRequest {
  readonly keyword?: string;
  readonly businessName?: string;
  readonly email?: string;
  readonly status?: VendorStatus;
  readonly minRating?: number;
  readonly maxRating?: number;
  readonly categoryIds?: string[];
}
