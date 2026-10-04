
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
