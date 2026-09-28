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

// ─── Path prefixes ─────────────────────────────────────────
const AUTHENTICATED_PREFIXES = ['/registration', '/admin', '/vendor', '/customer'] as const;
const ADMIN_PREFIXES         = ['/admin'] as const;
const VENDOR_PREFIXES        = ['/vendor'] as const;
const CUSTOMER_PREFIXES      = ['/customer'] as const;

// ─── Registration destinations ─────────────────────────────
const VENDOR_REGISTRATION   = '/registration/vendor';
const CUSTOMER_REGISTRATION = '/registration/customer';

// ─── Access-denied page ────────────────────────────────────
const ACCESS_DENIED_ROUTE = '/user-access-denied';

type DeniedReason = 'role-missing' | 'context-missing';
type DeniedRole   = 'ADMIN' | 'VENDOR' | 'CUSTOMER';

function matches(url: string, prefixes: readonly string[]): boolean {
  const path = url.split(/[?#]/)[0];
  return prefixes.some(p => path === p || path.startsWith(p + '/'));
}

/**
 * Redirects to `/user-access-denied` with everything the component needs
 * to render a specific message.
 *
 * Query params:
 *   - reason: `role-missing` | `context-missing`
 *   - role:   the role the user lacks
 *   - from:   the URL they tried to reach
 */
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

  // ─── 1. Public route — nothing to enforce. ────────────────
  if (!matches(url, AUTHENTICATED_PREFIXES)) return true;

  // ─── 2. Requires auth — remember where they were going. ──
  if (!keycloak.authenticated) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: url },
    });
  }
  console.log("appGuard", url);
  // ─── 3. /admin/* — role-only, no context entity. ─────────
  if (matches(url, ADMIN_PREFIXES)) {
    console.log("match admin", url);
    if (!roles.isAdmin()) {
      return accessDenied(router, 'role-missing', 'ADMIN', url);
    }
    return true;
  }

  // ─── 4. /vendor/* and /customer/* — context first, ───────
  //        then role. Context is cached by ensureLoaded().
  const needsVendor   = matches(url, VENDOR_PREFIXES);
  const needsCustomer = matches(url, CUSTOMER_PREFIXES);

  if (needsVendor || needsCustomer) {
    let context = null;
    try {
      context = await ctx.ensureLoaded();
    } catch {
      context = null;
    }
    console.log("needsVendor", needsVendor, context?.vendor );
    // 4a. Context missing → registration wizard.
    if (needsVendor && !context?.vendor) {
      return router.parseUrl(VENDOR_REGISTRATION);
    }
    console.log("needsCustomer", needsVendor, context?.customer );
    if (needsCustomer && !context?.customer) {
      return router.parseUrl(CUSTOMER_REGISTRATION);
    }

    console.log("access denied?");
    // 4b. Context present — the JWT must carry the matching role.
    if (needsVendor && !roles.isVendor()) {
      return accessDenied(router, 'role-missing', 'VENDOR', url);
    }
    if (needsCustomer && !roles.isCustomer()) {
      return accessDenied(router, 'role-missing', 'CUSTOMER', url);
    }
  }

  // ─── 5. /registration/* — auth-only. ─────────────────────
  return true;
};
