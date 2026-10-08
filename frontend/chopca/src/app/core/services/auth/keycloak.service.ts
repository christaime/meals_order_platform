import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Injectable, Signal } from '@angular/core';

export type AppRole = 'ADMIN' | 'VENDOR' | 'CUSTOMER';
export const APP_ROLES: AppRole[] = ['ADMIN', 'VENDOR', 'CUSTOMER'];
export const ADMIN_ROLE = 'ADMIN';
export const VENDOR_ROLE = 'VENDOR';
export const CUSTOMER_ROLE = 'CUSTOMER';

export abstract class KeycloakService {
  // ─── Auth actions ──────────────────────────────────────────
  abstract login(idpHint?: string): Promise<void>;
  abstract logout(): Promise<void>;
  abstract refreshToken(): Promise<void>;

  // ─── Reactive state ────────────────────────────────────────
  abstract readonly roles: Signal<ReadonlySet<AppRole>>;
  abstract readonly isAuthenticated: Signal<boolean>;
  abstract readonly isAnonymous: Signal<boolean>;
  abstract readonly isAdmin: Signal<boolean>;
  abstract readonly isVendor: Signal<boolean>;
  abstract readonly isCustomer: Signal<boolean>;
  abstract readonly hasAnyRole: Signal<boolean>;

  /** Increments on every logout request. */
  abstract readonly logoutRequested: Signal<number>;

  // ─── User info ─────────────────────────────────────────────
  abstract getUserEmail(): string | undefined;
  abstract getUserName(): string | undefined;

  // ─── Lifecycle ─────────────────────────────────────────────
  /**
   * Re-reads roles from the current token. Called on app init and
   * on any auth event. Implementations wire their own listeners.
   */
  abstract reload(): void;

  /** The current access token, or null. */
  abstract getToken(): string | undefined;

  /**
   * Refresh the token if it expires within `thresholdSeconds`.
   * Returns `true` if a refresh happened, `false` otherwise.
   * Throws if the refresh token is dead.
   */
  abstract updateToken(thresholdSeconds: number): Promise<boolean>;
}

export const KEYCLOAK_SERVICE = new InjectionToken<KeycloakService>('KeycloakService');
