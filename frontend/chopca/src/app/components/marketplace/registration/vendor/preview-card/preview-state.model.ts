/**
 * Display-only snapshot of the vendor registration wizard.
 *
 * Built by the page from the form + resolved category labels, and
 * consumed by `PreviewCardComponent`. Contains everything the phone
 * preview needs to render, and nothing the card shouldn't know about
 * (no form controls, no raw UUIDs, no storage refs — only what's shown).
 *
 * Fields are all optional-ish (nullable/empty) because the user fills
 * the wizard progressively. The card renders sensible defaults for
 * each empty state.
 */
export interface PreviewState {
  /** Business name from Section A. Empty string if not yet entered. */
  readonly businessName: string;

  /** Description from Section A. Empty string if not yet entered. */
  readonly description: string;

  /** Delivery radius in km from Section D. Null if not yet set. */
  readonly deliveryRadius: number | null;

  /** Resolved logo preview URL, or null. */
  readonly logoUrl: string | null;

  /** Resolved banner preview URL, or null. */
  readonly coverUrl: string | null;

  /** Human-readable labels for the selected cuisines (already resolved from IDs). */
  readonly cuisineLabels: readonly string[];
}

/**
 * The empty/default state used before the user has typed anything.
 * Keeps the card rendering meaningful placeholders instead of blanks.
 */
export const EMPTY_PREVIEW_STATE: PreviewState = {
  businessName: '',
  description: '',
  deliveryRadius: null,
  logoUrl: null,
  coverUrl: null,
  cuisineLabels: [],
};
