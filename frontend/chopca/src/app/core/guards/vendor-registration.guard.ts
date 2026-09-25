import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { KeycloakService } from '../services/auth/keycloak.service';
import { UserContextService } from '../services/auth';
import { AuthIntentStore } from '../storage/auth-intent';

export const vendorRegistrationGuard: CanActivateFn = async () => {
  const keycloak = inject(KeycloakService);
  const ctx = inject(UserContextService);
  const router = inject(Router);

  if (!keycloak.isAuthenticated()) {
    await keycloak.loginWithIntent('vendor-registration');
    return false;
  }

  // If the vendor already exists, the wizard is pointless.
  const context = await ctx.ensureLoaded();
  if (context?.vendor) {
    AuthIntentStore.clear();
    await router.navigate(['/vendor/dashboard']);
    return false;
  }

  // Intent must be present. If the user navigated here cold, send them
  // through login with the intent set.
  if (AuthIntentStore.get() !== 'vendor-registration') {
    await keycloak.loginWithIntent('vendor-registration');
    return false;
  }

  return true;
};
