/**
 * Reference / lookup data used across the app.
 *
 * These are read-only lists served by the backend under
 * /api/v1/reference/*. They rarely change and are cached on
 * the frontend by the services that fetch them.
 */

/**
 * A Cameroonian city where vendors can operate.
 */
export interface City {
  readonly id: string;       // e.g. "douala"
  readonly name: string;     // e.g. "Douala"
  readonly region: string;   // e.g. "Littoral"
}

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
