import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import Keycloak from 'keycloak-js';
import { UserContextService } from '@app/core/services/auth/user-context.service';
import { RoleContext } from '@app/core/services/auth/role-context.service';

const AUTHENTICATED_PREFIXES = ['/registration', '/admin', '/vendor', '/customer'] as const;
const ADMIN_PREFIXES         = ['/admin'] as const;
const VENDOR_PREFIXES        = ['/vendor'] as const;
const CUSTOMER_PREFIXES      = ['/customer'] as const;
const VENDOR_REG_PREFIXES    = ['/registration/vendor'] as const;
const CUSTOMER_REG_PREFIXES  = ['/registration/customer'] as const;

const VENDOR_REGISTRATION   = '/registration/vendor';
const CUSTOMER_REGISTRATION = '/registration/customer';

const VENDOR_HOME   = '/registration/dashboard';
const CUSTOMER_HOME = '/registration/dashboard';

const ACCESS_DENIED_ROUTE = '/user-access-denied';

type DeniedReason = 'role-missing' | 'context-missing';
type DeniedRole   = 'ADMIN' | 'VENDOR' | 'CUSTOMER';

function matches(url: string, prefixes: readonly string[]): boolean {
  const path = url.split(/[?#]/)[0];
  return prefixes.some(p => path === p || path.startsWith(p + '/'));
}

function accessDenied(
  router: Router,
  reason: DeniedReason,
  role: DeniedRole,
  attemptedUrl: string,
) {
  return router.createUrlTree([ACCESS_DENIED_ROUTE], {
    queryParams: { reason, role, from: attemptedUrl },
  });
}

export const appGuard: CanActivateFn = async (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const keycloak = inject(Keycloak);
  const router   = inject(Router);
  const roles    = inject(RoleContext);
  const ctx      = inject(UserContextService);

  const url = state.url;

  // ─── 1. Public route ──────────────────────────────────────
  if (!matches(url, AUTHENTICATED_PREFIXES)) return true;

  // ─── 2. Auth required ─────────────────────────────────────
  if (!keycloak.authenticated) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: url },
    });
  }

  // ─── 3. /admin/* ──────────────────────────────────────────
  if (matches(url, ADMIN_PREFIXES)) {
    if (!roles.isAdmin()) {
      return accessDenied(router, 'role-missing', 'ADMIN', url);
    }
    return true;
  }

  // ─── 4. /vendor/* and /customer/* ────────────────────────
  const needsVendor   = matches(url, VENDOR_PREFIXES);
  const needsCustomer = matches(url, CUSTOMER_PREFIXES);

  if (needsVendor || needsCustomer) {
    let context = null;
    try {
      context = await ctx.ensureLoaded();
    } catch {
      context = null;
    }

    if (needsVendor && !context?.vendor) {
      return router.parseUrl(VENDOR_REGISTRATION);
    }
    if (needsCustomer && !context?.customer) {
      return router.parseUrl(CUSTOMER_REGISTRATION);
    }

    if (needsVendor && !roles.isVendor()) {
      return accessDenied(router, 'role-missing', 'VENDOR', url);
    }
    if (needsCustomer && !roles.isCustomer()) {
      return accessDenied(router, 'role-missing', 'CUSTOMER', url);
    }
  }

  // ─── 5. /registration/* — auth + already-registered redirect ──
  const needsVendorReg   = matches(url, VENDOR_REG_PREFIXES);
  const needsCustomerReg = matches(url, CUSTOMER_REG_PREFIXES);

  if (needsVendorReg || needsCustomerReg) {
    let context = null;
    try {
      context = await ctx.ensureLoaded();
    } catch {
      context = null;
    }

    if (needsVendorReg && context?.vendor) {
      return router.parseUrl(VENDOR_HOME);
    }
    if (needsCustomerReg && context?.customer) {
      return router.parseUrl(CUSTOMER_HOME);
    }
  }

  return true;
};
