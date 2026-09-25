/**
 * Navigation menu models for the app header.
 *
 * The header resolves the active menu from the current user's role.
 * Menus are plain data, defined once and reused everywhere.
 */

/**
 * A leaf nav item — a direct link.
 */
export interface NavLink {
  readonly kind: 'link';
  readonly label: string;
  readonly route: string;
  readonly exact?: boolean;
  /** Optional icon (Material Symbols name). */
  readonly icon?: string;
  /**
   * Optional badge. When `type` is `'count'`, the parent supplies the value
   * (e.g. live order count). When `'dot'`, a small dot is shown.
   */
  readonly badge?: { readonly type: 'dot' } | { readonly type: 'count'; readonly value: number };
}

/**
 * A nav group — a dropdown with child links.
 */
export interface NavGroup {
  readonly kind: 'group';
  readonly label: string;
  readonly icon?: string;
  readonly children: readonly NavLink[];
  /** Whether any child is currently the active route (used for highlight). */
  readonly showActiveHighlight?: boolean;
}

/**
 * Any nav item — either a direct link or a dropdown group.
 */
export type NavItem = NavLink | NavGroup;
