import { visitAs } from '../support/auth';
import { MOCK_USERS } from '../support/mock-user';

// ═══════════════════════════════════════════════════════════════
//  Authenticated header — per workspace, per role
// ═══════════════════════════════════════════════════════════════

describe('Auth header — admin workspace', () => {
  beforeEach(() => {
    visitAs('/admin/categories', MOCK_USERS.admin);
    cy.get('[data-testid=header-portal-label]').should('contain.text', 'Espace Admin');
  });

  it('shows the admin menu groups', () => {
    cy.get('[data-testid=header-menu-item-label]').then(($els) => {
      const labels = [...$els].map((el) => el.textContent!.trim());
      expect(labels).to.include('Catalogue de mets');
      expect(labels).to.include('Vendeurs & lieux');
    });
  });

  it('does not show Modération or Paramètres', () => {
    cy.get('[data-testid=header-menu-item-label]').then(($els) => {
      const labels = [...$els].map((el) => el.textContent!.trim());
      expect(labels).to.not.include('Modération');
      expect(labels).to.not.include('Paramètres');
    });
  });

  it('opens a group dropdown and shows its children', () => {
    cy.get('[data-testid=header-menu-item-0]').click();
    cy.get('[data-testid=header-menu-dropdown-0]').should('exist');
    cy.get('[data-route="/admin/meals"]').should('exist');
    cy.get('[data-route="/admin/categories"]').should('exist');
  });

  it('shows the admin name in the profile trigger', () => {
    cy.get('[data-testid=header-profile-initials]').should('contain.text', 'AU');
  });

  it('shows the admin name in the dropdown header', () => {
    cy.get('[data-testid=header-profile-trigger]').click();
    cy.get('[data-testid=header-profile-name]').should('not.be.empty');
  });

  it('renders the admin settings link in the dropdown', () => {
    cy.get('[data-testid=header-profile-trigger]').click();
    cy.get('[data-testid=header-profile-admin-settings]').should('exist');
  });

  it('renders the logout button', () => {
    cy.get('[data-testid=header-profile-trigger]').click();
    cy.get('[data-testid=header-profile-logout]').should('exist');
  });

  it('does not render the vendor link for an admin-only user', () => {
    cy.get('[data-testid=header-profile-trigger]').click();
    cy.get('[data-testid=header-profile-vendor-profile]').should('not.exist');
  });
});

describe('Auth header — vendor workspace', () => {
  beforeEach(() => {
    visitAs('/vendor/profile', MOCK_USERS.vendor);
    cy.get('[data-testid=header-portal-label]').should('contain.text', 'Espace Vendeur');
  });

  it('shows the vendor menu group', () => {
    cy.get('[data-testid=header-menu-item-label]').then(($els) => {
      const labels = [...$els].map((el) => el.textContent!.trim());
      expect(labels).to.include('Gestion des Plats');
    });
  });

  it('does not show Statistiques or order-related menus', () => {
    cy.get('[data-testid=header-menu-item-label]').then(($els) => {
      const labels = [...$els].map((el) => el.textContent!.trim());
      expect(labels).to.not.include('Statistiques');
      expect(labels).to.not.include('Gestion des Commandes');
    });
  });

  it('renders the vendor status pill', () => {
    cy.get('[data-testid=header-vendor-status]').should('exist');
  });

  it('shows the vendor link in the dropdown', () => {
    cy.get('[data-testid=header-profile-trigger]').click();
    cy.get('[data-testid=header-profile-vendor-profile]').should('exist');
  });

  it('does not render the vendor settings item', () => {
    cy.get('[data-testid=header-profile-trigger]').click();
    cy.get('[data-testid=header-profile-vendor-settings]').should('not.exist');
  });
});

describe('Auth header — anonymous', () => {
  it('does not render the authenticated header on /meals', () => {
    visitAs('/meals', null);
    cy.get('[data-testid=header-profile-trigger]').should('not.exist');
  });
});
