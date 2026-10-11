import {
  AppRole
} from '@core/services/auth/keycloak.service';
/**
 * Storage key the mock KeycloakService reads on boot. Must match
 * the constant used inside KeycloakMockService.
 */
export const E2E_MOCK_USER_KEY = 'e2e-mock-user';

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
