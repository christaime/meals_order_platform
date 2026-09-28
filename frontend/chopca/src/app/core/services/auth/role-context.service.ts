import { Injectable, inject, signal, computed } from '@angular/core';
import Keycloak from 'keycloak-js';

/**
 * Roles a user can hold. A user can hold MULTIPLE of these simultaneously
 * (e.g., a vendor who is also a customer).
 */
export type AppRole = 'ADMIN' | 'VENDOR' | 'CUSTOMER';

/**
 * Centralized source of truth for "who is the current user?".
 *
 * The user's roles are exposed as a Set. Capability queries
 * (isAdmin, isVendor, canManageX, ...) are derived from that set.
 *
 * The role set is reactive: it refreshes on login, logout, and token refresh.
 */
@Injectable({ providedIn: 'root' })
export class RoleContext {
  private readonly keycloak = inject(Keycloak);

  // ─── Reactive state ───────────────────────────────────────
  private readonly _roles = signal<ReadonlySet<AppRole>>(new Set());

  /** The set of roles the current user holds. */
  readonly roles = this._roles.asReadonly();

  /** Whether the user has a valid session. */
  readonly isAuthenticated = computed(() => this._roles().size > 0);

  /** Whether the user has NO roles (anonymous). */
  readonly isAnonymous = computed(() => this._roles().size === 0);

  // ─── Capability queries ───────────────────────────────────
  // These read the role set. They are the API the rest of the app uses.

  readonly isAdmin = computed(() => this._roles().has('ADMIN'));
  readonly isVendor = computed(() => this._roles().has('VENDOR'));
  readonly isCustomer = computed(() => this._roles().has('CUSTOMER'));

  /** Convenience: does the user hold at least one of these roles? */
  hasAnyRole(...roles: AppRole[]): boolean {
    const current = this._roles();
    return roles.some(r => current.has(r));
  }

  /** Convenience: does the user hold all of these roles? */
  hasAllRoles(...roles: AppRole[]): boolean {
    const current = this._roles();
    return roles.every(r => current.has(r));
  }

  // ─── Lifecycle ────────────────────────────────────────────

  constructor() {
    this.reload();

    this.keycloak.onAuthSuccess        = () => this.reload();
    this.keycloak.onAuthLogout         = () => this._roles.set(new Set());
    this.keycloak.onTokenExpired       = () => this.reload();
    this.keycloak.onAuthRefreshSuccess = () => this.reload();
  }

  // ─── Public API ───────────────────────────────────────────

  /** Re-reads roles from the current JWT. Safe to call anytime. */
  reload(): void {
    this._roles.set(this.extractRoles());
  }

  // ─── Internal ─────────────────────────────────────────────

  private refresh(): void {
    this._roles.set(this.extractRoles());
  }

  private extractRoles(): Set<AppRole> {
    if (!this.keycloak.authenticated) return new Set();

    const parsed = this.keycloak.tokenParsed as
      | { realm_access?: { roles?: string[] } }
      | undefined;

    const raw = parsed?.realm_access?.roles ?? [];

    // Filter to the roles we care about
    const known: AppRole[] = ['ADMIN', 'VENDOR', 'CUSTOMER'];
    const result = new Set<AppRole>();
    for (const r of raw) {
      if ((known as string[]).includes(r)) {
        result.add(r as AppRole);
      }
    }
    return result;
  }
}
