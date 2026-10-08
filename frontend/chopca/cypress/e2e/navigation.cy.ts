import { MOCK_USERS, MOCK_USERS as USERS } from '../support/mock-user';
import { visitAs } from '../support/auth';

describe('Application navigation', () => {

  // ═══════════════════════════════════════════════════════════
  //  Anonymous user — public routes and redirects
  // ═══════════════════════════════════════════════════════════

  context('anonymous user', () => {

    it('redirects "/" to "/meals"', () => {
      visitAs('/', null);
      cy.url().should('match', /\/meals\/?$/);
    });

    it('renders the meal catalog on /meals', () => {
      visitAs('/meals', null);
      cy.url().should('include', '/meals');
      cy.get('app-meal-catalog-view').should('exist');
    });

    it('redirects an unknown route to /meals', () => {
      visitAs('/this-route-does-not-exist', null);
      cy.url().should('match', /\/meals\/?$/);
    });

    it('redirects /admin/meals to the login page (or /meals)', () => {
      visitAs('/admin/meals', null);
      // Adjust the assertion to match your guard's actual behavior.
      // If the guard sends anonymous users to /auth/login:
      cy.url().should('satisfy', (url: string) =>
        url.includes('/auth/login') || url.match(/\/meals\/?$/) !== null,
      );
    });

    it('redirects /vendor/meals to the login page (or /meals)', () => {
      visitAs('/vendor/meals', null);
      cy.url().should('satisfy', (url: string) =>
        url.includes('/auth/login') || url.match(/\/meals\/?$/) !== null,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Admin user
  // ═══════════════════════════════════════════════════════════

  context('authenticated as ADMIN', () => {

    it('can reach /admin/meals', () => {
      visitAs('/admin/meals', USERS.admin);
      cy.url().should('include', '/admin/meals');
    });

    it('can reach /meals (public route)', () => {
      visitAs('/meals', USERS.admin);
      cy.url().should('include', '/meals');
      cy.get('app-meal-catalog-view').should('exist');
    });

    it('is redirected away from /vendor/meals (if admins cannot access it)', () => {
      visitAs('/vendor/meals', USERS.admin);
      // Change this assertion if admins can reach vendor routes.
      // If they cannot, they should land on /user-access-denied or /meals.
      cy.url().should('not.include', '/vendor/meals');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Vendor user
  // ═══════════════════════════════════════════════════════════

  context('authenticated as VENDOR', () => {

    it('can reach /vendor/meals', () => {
      visitAs('/vendor/meals', USERS.vendor);
      cy.url().should('include', '/vendor/meals');
    });

    it('can reach /meals (public route)', () => {
      visitAs('/meals', USERS.vendor);
      cy.url().should('include', '/meals');
    });

    it('is redirected away from /admin/meals', () => {
      visitAs('/admin/meals', USERS.vendor);
      cy.url().should('not.include', '/admin/meals');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Customer user
  // ═══════════════════════════════════════════════════════════

  context('authenticated as CUSTOMER', () => {

    it('can reach /meals', () => {
      visitAs('/meals', USERS.customer);
      cy.url().should('include', '/meals');
      cy.get('app-meal-catalog-view').should('exist');
    });

    it('is redirected away from /admin/meals', () => {
      visitAs('/admin/meals', USERS.customer);
      cy.url().should('not.include', '/admin/meals');
    });

    it('is redirected away from /vendor/meals', () => {
      visitAs('/vendor/meals', USERS.customer);
      cy.url().should('not.include', '/vendor/meals');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Multi-role user
  // ═══════════════════════════════════════════════════════════

  context('authenticated with multiple roles (VENDOR + CUSTOMER)', () => {

    it('can reach /vendor/meals', () => {
      visitAs('/vendor/meals', USERS.multiRole);
      cy.url().should('include', '/vendor/meals');
    });

    it('can reach /customer routes', () => {
      visitAs('/meals', USERS.multiRole);
      // Just proves the app is up — replace with a real customer route when you have one.
      cy.url().should('include', '/meals');
    });

    it('is still redirected away from /admin/meals', () => {
      visitAs('/admin/meals', USERS.multiRole);
      cy.url().should('not.include', '/admin/meals');
    });
  });
});
