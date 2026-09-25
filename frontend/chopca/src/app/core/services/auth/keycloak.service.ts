import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';
import { AuthIntentStore } from '../../storage/auth-intent';

@Injectable({ providedIn: 'root' })
export class KeycloakService {

  private readonly keycloak = inject(Keycloak);

  async loginWithIntent(intent: 'vendor-registration' | 'customer-registration',
                        idpHint?: string): Promise<void> {
    AuthIntentStore.set(intent);
    await this.keycloak!.login({
      idpHint,
      redirectUri: window.location.origin + '/auth/callback',
    });
  }

  async login(idpHint?: string): Promise<void> {
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
    await this.keycloak!.logout({ redirectUri: window.location.origin });
  }

  getUserEmail(): string | undefined {
    return this.keycloak?.tokenParsed? this.keycloak?.tokenParsed['email'] : undefined;
  }

  getUserName(): string | undefined {
    return this.keycloak?.tokenParsed? this.keycloak?.tokenParsed['name'] : undefined;
  }
}
