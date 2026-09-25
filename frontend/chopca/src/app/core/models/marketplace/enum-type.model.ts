/**
 * All enums from the backend, expressed as TypeScript union types.
 *
 * Why union types instead of TypeScript `enum`?
 * - Zero runtime overhead (compile to nothing)
 * - Match the wire format exactly (no conversion needed after JSON parse)
 * - Work natively with Angular's HttpClient
 * - Recommended by the Angular style guide
 *
 * The string values MUST match the Java enum names exactly.
 */

// ═══════════════════════════════════════════════════════════════
//  Category
// ═══════════════════════════════════════════════════════════════

/**
 * Classifies the purpose of a Category.
 * - CUISINE:   cultural origin of the food (e.g. "Cameroonian", "Italian")
 * - DISH_TYPE: structural role of the dish (e.g. "Main Dish", "Dessert")
 */
export type CategoryType = 'CUISINE' | 'DISH_TYPE';

// ═══════════════════════════════════════════════════════════════
//  Moderation
// ═══════════════════════════════════════════════════════════════

/**
 * Moderation state of a moderable entity (Category, Ingredient, Meal, Location).
 * Only APPROVED entities are visible to customers.
 */
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISABLED';

/**
 * The kind of entity being moderated.
 * Used in ModerationData audit records.
 */
export type ModerationTargetType =
  | 'CATEGORY'
  | 'INGREDIENT'
  | 'MEAL'
  | 'DISTRIBUTION_LOCATION';

// ═══════════════════════════════════════════════════════════════
//  User / Actor
// ═══════════════════════════════════════════════════════════════

/**
 * The type of user performing an action or owning data.
 */
export type UserType = 'ADMIN' | 'VENDOR' | 'CUSTOMER' | 'SYSTEM';

// ═══════════════════════════════════════════════════════════════
//  Vendor — State
// ═══════════════════════════════════════════════════════════════

/**
 * Current lifecycle status of a vendor.
 * PENDING → ACTIVE → (SUSPENDED | BANNED | INACTIVE)
 * BANNED is terminal.
 */
export type VendorStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'INACTIVE';

/**
 * The origin of a vendor state change.
 * - SYSTEM:        automatic (registration, expiration)
 * - ADMIN_ACTION:  admin banned, suspended, or activated
 * - VENDOR_ACTION: vendor deactivated themselves
 * - AUTOMATIC:     rule-based (e.g. auto-ban after N warnings)
 */
export type StateChangeType =
  | 'SYSTEM'
  | 'ADMIN_ACTION'
  | 'VENDOR_ACTION'
  | 'AUTOMATIC';

// ═══════════════════════════════════════════════════════════════
//  Vendor — Subscription
// ═══════════════════════════════════════════════════════════════

/**
 * Subscription tiers for vendors.
 * Not enforced yet — used by Phase 2 quota logic and the UI.
 */
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
