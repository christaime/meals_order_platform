import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';
import { AppSessionStore, RETURN_URL_KEY } from '../../storage/app.store';
import { SessionManager } from '../session/session-manager.service';
import { ActivatedRoute } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class KeycloakService {

  private readonly keycloak = inject(Keycloak);
  private readonly route = inject(ActivatedRoute);

  async login(idpHint?: string): Promise<void> {
    // Remember where the user was headed before the guard bounced them
    // to /auth/login. The callback will read this after Keycloak redirects back.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      AppSessionStore.set(RETURN_URL_KEY,returnUrl);
    }
    await this.keycloak!.login({
      idpHint,// 'google' | 'outlook' | 'yahoo'
      redirectUri: window.location.origin + '/auth/callback',
    });
  }

  /**
   * Forces a token refresh. Pass 0 to refresh if the token is expired OR
   * within the default 5s of expiry. Use after any role change.
   * See §11 — this is not optional.
   */
  async refreshToken(): Promise<void> {
    await this.keycloak!.updateToken(0);
  }

  getRealmRoles(): string[] {
    return this.keycloak?.realmAccess?.roles ?? [];
  }

  isAuthenticated(): boolean {
    return this.keycloak?.authenticated ?? false;
  }

  async logout(): Promise<void> {
    inject(SessionManager).shutdown();   // broadcast LOGOUT to other tabs first
    await this.keycloak.logout({ redirectUri: window.location.origin });
  }

  getUserEmail(): string | undefined {
    return this.keycloak?.tokenParsed? this.keycloak?.tokenParsed['email'] : undefined;
  }

  getUserName(): string | undefined {
    return this.keycloak?.tokenParsed? this.keycloak?.tokenParsed['name'] : undefined;
  }
}
