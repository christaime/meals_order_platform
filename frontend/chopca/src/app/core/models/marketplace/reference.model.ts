
/**
 * A daily-preparation capacity range for a vendor.
 *
 * Used on the vendor registration form to let a vendor declare
 * how many meals they can prepare per day.
 */
export interface CapacityRange {
  readonly value: string;        // e.g. "SMALL" | "MEDIUM" | "LARGE"
  readonly label: string;        // e.g. "10 à 30"
  readonly description: string;  // e.g. "Idéal pour chefs à domicile"
}

/**
 * Public meal statistics shown on the landing page filter.
 * Backend source: GET /api/v1/reference/meal-stats
 */
export interface MealStatFilter {
  readonly mostDemandedCuisines: StatEntry[];
  readonly mostDemandedDish: StatEntry[];
  readonly expressPrepTimeInMinutes: TimeStat;
  readonly minMealPrice: PriceStat;
}

export interface StatEntry {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}

export interface TimeStat {
  readonly time: number;
  readonly count: number;
}

export interface PriceStat {
  readonly price: number;
  readonly count: number;
}
