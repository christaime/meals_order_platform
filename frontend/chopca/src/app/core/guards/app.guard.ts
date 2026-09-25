import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import Keycloak from 'keycloak-js';

export const appGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const keycloak = inject(Keycloak);
  const router = inject(Router);
  const data = route.data as any;

  // 1. Public route
  if (!data.requiresAuth) return true;

  // 2. Not authenticated -> redirect
  if (!keycloak.authenticated) {
    return router.parseUrl(data.fallbackRoute ?? '/meals');
  }

  // 3. Role check from the token (no backend call)
  if (data.roles && data.roles.length > 0) {
    const userRoles = keycloak.tokenParsed?.['realm_access']?.['roles'] as string[] | undefined ?? [];

    const hasAllRoles = data.roles.every((role: string) => userRoles.includes(role));

    if (!hasAllRoles) {
      return router.parseUrl(data.fallbackRoute ?? '/meals');
    }
  }

  // 4. All good
  return true;
};
