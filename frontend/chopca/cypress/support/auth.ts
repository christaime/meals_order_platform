import type { MockUser } from '@mock/services/keycloak-mock.service';

/**
 * Storage key the mock KeycloakService reads on boot. Must match
 * the constant used inside KeycloakMockService.
 */
const MOCK_USER_KEY = 'e2e-mock-user';

/**
 * Visits a URL with the mock auth seeded, so the app boots with
 * a session already established.
 *
 * Usage:
 *   visitAs('/meals', MOCK_USERS.vendor);
 *   visitAs('/admin/meals', MOCK_USERS.admin);
 *   visitAs('/meals', null);   // anonymous
 */
export function visitAs(url: string, user: MockUser | null): void {
  cy.visit(url, {
    onBeforeLoad(win) {
      if (user) {
        win.sessionStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
      } else {
        win.sessionStorage.removeItem(MOCK_USER_KEY);
      }
    },
  });
}

/**
 * Navigates (via the address bar, not router) with the mock auth
 * seeded. Use this when you need to test the browser entry point
 * rather than SPA navigation — i.e. typing the URL directly.
 */
export function navigateAs(url: string, user: MockUser | null): void {
  visitAs(url, user);
}
