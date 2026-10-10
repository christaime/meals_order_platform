import { Injectable, inject , computed, signal} from '@angular/core';
import Keycloak from 'keycloak-js';
import { KeycloakService, AppRole, APP_ROLES, ADMIN_ROLE, VENDOR_ROLE, CUSTOMER_ROLE } from './keycloak.service';
import { AppSessionStore, RETURN_URL_KEY, IDP_HINT_KEY } from '../../storage/app.store';
import { ActivatedRoute, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class KeycloakApiService implements KeycloakService {

  private readonly keycloak = inject(Keycloak);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly _roles = signal<ReadonlySet<AppRole>>(new Set());

  private readonly _logoutRequested = signal<number>(0);
  readonly logoutRequested = this._logoutRequested.asReadonly();

  readonly roles = this._roles.asReadonly();
  readonly isAuthenticated = computed(() => this.keycloak.authenticated );
  readonly isAnonymous = computed(() => !this.keycloak.authenticated);
  readonly isAdmin = computed(() => this._roles().has(ADMIN_ROLE));
  readonly isVendor = computed(() => this._roles().has(VENDOR_ROLE));
  readonly isCustomer = computed(() => this._roles().has(CUSTOMER_ROLE));
  readonly hasAnyRole = computed(() => this._roles().size != 0);

  constructor() {
    this.reload();
    this.keycloak.onAuthSuccess        = () => this.reload();
    this.keycloak.onAuthLogout         = () => this._roles.set(new Set());
    this.keycloak.onTokenExpired       = () => this.reload();
    this.keycloak.onAuthRefreshSuccess = () => this.reload();
  }

  async login(idpHint?: string): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) AppSessionStore.set(RETURN_URL_KEY, returnUrl);
    if(idpHint) AppSessionStore.set(IDP_HINT_KEY, idpHint);

    await this.keycloak.login({
      idpHint,
      redirectUri: window.location.origin + '/auth/callback',
    });
  }

  async logout(): Promise<void> {
    // Notify observers (SessionManager) so they can clean up.
    this._logoutRequested.update(n => n + 1);
    await this.keycloak.logout({ redirectUri: window.location.origin });
    this.router.navigate(['/meals']);
  }

  async refreshToken(): Promise<void> {
    await this.keycloak.updateToken(0);
  }

  getUserEmail(): string | undefined {
    return this.keycloak.tokenParsed?.['email'];
  }

  getUserName(): string | undefined {
    return this.keycloak.tokenParsed?.['name'];
  }

  reload(): void {
    this._roles.set(this.extractRoles());
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }

  async updateToken(thresholdSeconds: number): Promise<boolean> {
    return this.keycloak.updateToken(thresholdSeconds);
  }

  private extractRoles(): Set<AppRole> {
    if (!this.keycloak.authenticated) return new Set();

    const parsed = this.keycloak.tokenParsed as
      | { realm_access?: { roles?: string[] } }
      | undefined;

    const raw = parsed?.realm_access?.roles ?? [];
    const known: AppRole[] = APP_ROLES;

    const result = new Set<AppRole>();
    for (const r of raw) {
      if ((known as string[]).includes(r)) result.add(r as AppRole);
    }
    return result;
  }
}
