import {
  Category,
  CategorySummary,
  IngredientSummary,
  LocationSummary,
  Meal,
  MealSummary,
  Vendor,
  VendorSummary,
} from '@app/core/models/marketplace';

// ═══════════════════════════════════════════════════════════
//  Categories
// ═══════════════════════════════════════════════════════════

export function aCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    name: 'Cuisine Sawa',
    description: null,
    iconUrl: 'restaurant',
    type: 'CUISINE',
    status: 'APPROVED',
    createdByType: 'ADMIN',
    createdById: 'admin-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Category;
}

export function aCategorySummary(overrides: Partial<CategorySummary> = {}): CategorySummary {
  return {
    id: 'cat-1',
    name: 'Cuisine Sawa',
    iconUrl: 'restaurant',
    type: 'CUISINE',
    ...overrides,
  } as CategorySummary;
}

// ═══════════════════════════════════════════════════════════
//  Ingredients
// ═══════════════════════════════════════════════════════════

export function anIngredientSummary(overrides: Partial<IngredientSummary> = {}): IngredientSummary {
  return {
    id: 'ing-1',
    name: 'Arachide',
    isAllergen: false,
    moderationStatus: 'APPROVED',
    ...overrides,
  } as IngredientSummary;
}

// ═══════════════════════════════════════════════════════════
//  Locations
// ═══════════════════════════════════════════════════════════

export function aLocationSummary(overrides: Partial<LocationSummary> = {}): LocationSummary {
  return {
    id: 'loc-1',
    name: 'Akwa rue 1',
    address: 'Akwa',
    moderationStatus: 'APPROVED',
    ...overrides,
  } as LocationSummary;
}

// ═══════════════════════════════════════════════════════════
//  Meals
// ═══════════════════════════════════════════════════════════

export function aMealSummary(overrides: Partial<MealSummary> = {}): MealSummary {
  return {
    id: 'meal-1',
    vendorId: 'vendor-1',
    vendorBusinessName: 'Le Chaudron',
    name: 'Taro sauce jaune',
    description: 'Taro pilé avec sauce jaune',
    price: 4500,
    imageUrl: null,
    isAvailable: true,
    averageRating: 4.5,
    totalRatings: 12,
    prepTimeMinutes: 60,
    moderationStatus: 'APPROVED',
    cuisines: [aCategorySummary()],
    dishTypes: [aCategorySummary({ id: 'dt-1', name: 'Plat principal', type: 'DISH_TYPE' })],
    ...overrides,
  } as MealSummary;
}

export function aMeal(overrides: Partial<Meal> = {}): Meal {
  return {
    ...aMealSummary(),
    imageStorageRef: null,
    ingredients: [anIngredientSummary()],
    distributionLocations: [aLocationSummary()],
    supplements: [],
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Meal;
}

// ═══════════════════════════════════════════════════════════
//  Vendors
// ═══════════════════════════════════════════════════════════

export function aVendorSummary(overrides: Partial<VendorSummary> = {}): VendorSummary {
  return {
    id: 'vendor-1',
    businessName: 'Le Chaudron du bon gout',
    description: 'Recettes traditionnelles',
    address: 'Akwa de la roulette',
    email: 'vendor@example.com',
    ratingAvg: 4.2,
    totalRatings: 30,
    subscriptionTier: 'FREE',
    status: 'ACTIVE',
    cuisines: [aCategorySummary()],
    profileImageUrl: null,
    ...overrides,
  } as VendorSummary;
}

export function aVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    ...aVendorSummary(),
    userId: 'user-1',
    ownerName: 'Maman Pauline',
    phone: '+237695282983',
    statusReason: null,
    statusChangedAt: null,
    statusChangedBy: null,
    statusChangeType: null,
    deliveryRadius: 8,
    pickupAddress: null,
    coverImageUrl: null,
    distributionLocations: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Vendor;
}
