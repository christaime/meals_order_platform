import { Injectable, computed, signal, inject } from '@angular/core';
import {
  AppRole,
  ADMIN_ROLE,
  APP_ROLES,
  CUSTOMER_ROLE,
  KeycloakService,
  VENDOR_ROLE,
} from '@core/services/auth/keycloak.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AppSessionStore, RETURN_URL_KEY , IDP_HINT_KEY} from '@core/storage/app.store';

/**
 * A synthetic user for tests.
 *
 * Represents everything the app knows about the authenticated user:
 * the identity, the identity provider, and the roles they hold.
 */
export interface MockUser {
  readonly sub: string;
  readonly email: string;
  readonly name: string;
  readonly idp: 'google' | 'outlook' | 'yahoo' | 'local';
  readonly roles: readonly AppRole[];
}

@Injectable()
export class KeycloakMockService implements KeycloakService {

  private readonly _user = signal<MockUser | null>(null);
  private readonly _logoutRequested = signal<number>(0);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly logoutRequested = this._logoutRequested.asReadonly();
  readonly roles = computed<ReadonlySet<AppRole>>(
    () => new Set(this._user()?.roles ?? []),
  );

  readonly isAuthenticated = computed(() => {
    const isAuthenticated = this._user() !== null;
    console.log("isAuthenticated ",isAuthenticated);
    return isAuthenticated;
  });
  readonly isAnonymous     = computed(() => this._user() === null);
  readonly isAdmin         = computed(() => this._user()?.roles.includes(ADMIN_ROLE) ?? false);
  readonly isVendor        = computed(() => this._user()?.roles.includes(VENDOR_ROLE) ?? false);
  readonly isCustomer      = computed(() => this._user()?.roles.includes(CUSTOMER_ROLE) ?? false);
  readonly hasAnyRole      = computed(() => (this._user()?.roles.length ?? 0) > 0);

  // ─── Interface methods ──────────────────────────────────────

  async login(idpHint?: string): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) AppSessionStore.set(RETURN_URL_KEY, returnUrl);
    if(idpHint) AppSessionStore.set(IDP_HINT_KEY, idpHint);

    // Optionally honor the idpHint so tests can simulate
    // "the user picked Google on the login page."
    if (!this._user()) {
      this.signIn(defaultUserFor(idpHint));
    }
    this.router.navigate(['/auth/callback']);
    console.log("Sign in as default user ", this._user());
  }

  async logout(): Promise<void> {
    // Notify observers (SessionManager) first, exactly like the real
    // implementation. Then clear the user.
    this._logoutRequested.update(n => n + 1);
    await Promise.resolve();
    this._user.set(null);
    this.router.navigate(['/meals']);
  }

  async refreshToken(): Promise<void> {
    // No-op.
  }

  reload(): void {
    // No-op.
  }

  getUserEmail(): string | undefined {
    return this._user()?.email;
  }

  getUserName(): string | undefined {
    return this._user()?.name;
  }

  isAuthenticatedNow(): boolean {
    return this._user() !== null;
  }

  getToken(): string | undefined {
    if (!this._user()) return undefined;
    // Return a syntactically valid JWT so anything that parses it
    // (e.g. interceptor, header) doesn't choke. The signature is
    // fake; the payload is what matters.
    return buildFakeJwt(this._user()!);
  }

  async updateToken(_thresholdSeconds: number): Promise<boolean> {
    // Never "refreshes" — there's no real token to refresh.
    return false;
  }

  // ─── Test-only helpers (not on the interface) ──────────────

  /** Sign in as a specific user. */
  signIn(user: MockUser): void {
    this._user.set(user);
  }

  /** Clear the current user without firing a logout request. */
  clear(): void {
    this._user.set(null);
  }

  /** Convenience: sign in as an admin. */
  asAdmin(overrides: Partial<MockUser> = {}): void {
    this.signIn(buildUser('ADMIN', overrides));
  }

  /** Convenience: sign in as a vendor. */
  asVendor(overrides: Partial<MockUser> = {}): void {
    this.signIn(buildUser('VENDOR', overrides));
  }

  /** Convenience: sign in as a customer. */
  asCustomer(overrides: Partial<MockUser> = {}): void {
    this.signIn(buildUser('CUSTOMER', overrides));
  }

  /** Convenience: sign in as a user with multiple roles. */
  as(...roles: AppRole[]): void {
    this.signIn({
      sub: 'multi-role-user',
      email: 'multi@mealmarket.com',
      name: 'Multi Role User',
      idp: 'local',
      roles,
    });
  }

  /** Snapshot the current user. Useful in test assertions. */
  currentUser(): MockUser | null {
    return this._user();
  }
}

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

function buildUser(role: AppRole, overrides: Partial<MockUser>): MockUser {
  const base: Record<AppRole, MockUser> = {
    ADMIN: {
      sub: 'admin-1',
      email: 'admin@mealmarket.com',
      name: 'Admin User',
      idp: 'local',
      roles: ['ADMIN'],
    },
    VENDOR: {
      sub: 'vendor-1',
      email: 'vendor@mealmarket.com',
      name: 'Vendor User',
      idp: 'local',
      roles: ['VENDOR'],
    },
    CUSTOMER: {
      sub: 'customer-1',
      email: 'customer@mealmarket.com',
      name: 'Customer User',
      idp: 'local',
      roles: ['CUSTOMER'],
    },
  };
  return { ...base[role], ...overrides };
}

function defaultUserFor(idpHint?: string): MockUser {
  return {
    sub: 'default-user',
    email: `user@${idpHint ?? 'local'}.com`,
    name: 'Default User',
    idp: (idpHint as MockUser['idp']) ?? 'local',
    roles: ['ADMIN', 'VENDOR', 'CUSTOMER'],
  };
}

/**
 * Builds a JWT with the given user's identity and roles in the
 * payload. The signature is a placeholder; nothing verifies it
 * client-side. Consumers that just decode the payload (interceptors,
 * debug logs, custom guards) will work correctly.
 */
function buildFakeJwt(user: MockUser): string {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    sub: user.sub,
    email: user.email,
    name: user.name,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    realm_access: { roles: user.roles },
  };
  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  return `${encode(header)}.${encode(payload)}.`;
}
