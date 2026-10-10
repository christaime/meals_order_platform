import { visitAs } from '../support/auth';

// ═══════════════════════════════════════════════════════════════
//  Vendor detail view
//
//  Clicking a vendor card navigates to /meals/vendor/directory/:id
//  and the detail view loads only that vendor's meals.
// ═══════════════════════════════════════════════════════════════

describe('Vendor detail view', () => {
  beforeEach(() => {
    visitAs('/meals/vendor/directory', null);
    cy.get('app-vendor-card', { timeout: 10_000 })
      .should('have.length.greaterThan', 0);
  });

  it('navigates to the vendor detail page when a card is clicked', () => {
    cy.get('[data-testid=vendor-card-vendor-chaudron]').click();

    cy.location('pathname').should('eq', '/meals/vendor/directory/vendor-chaudron');
  });

  it('renders the vendor details in the header', () => {
    cy.get('[data-testid=vendor-card-vendor-chaudron]').click();

    cy.get('[data-testid=vendor-detail-view-name]', { timeout: 10_000 })
      .should('contain.text', 'Le Chaudron du bon gout');

    cy.get('[data-testid=vendor-detail-view-address]')
      .should('contain.text', 'Rue Joss');

    cy.get('[data-testid=vendor-detail-view-status]').should('exist');
  });

  it('renders only meals belonging to that vendor', () => {
    cy.get('[data-testid=vendor-card-vendor-chaudron]').click();

    cy.get('app-meal-card', { timeout: 10_000 })
      .should('have.length.greaterThan', 0);

    cy.get('app-meal-card div[data-vendor-id]').each(($article) => {
      expect($article.attr('data-vendor-id')).to.eq('vendor-chaudron');
    });
  });

  it('shows the vendor name on every meal card', () => {
    cy.get('[data-testid=vendor-card-vendor-chaudron]').click();

    cy.get('[data-testid=meal-card-vendor]', { timeout: 10_000 })
      .should('have.length.greaterThan', 0)
      .each(($el) => {
        expect($el.text().trim()).to.eq('Le Chaudron du bon gout');
      });
  });

  it('loads the meals of the clicked vendor, not the previous one', () => {
    cy.get('[data-testid=vendor-card-vendor-chaudron]').click();
    cy.get('app-meal-card', { timeout: 10_000 }).should('have.length.greaterThan', 0);
    cy.get('app-meal-card div[data-vendor-id]').each(($article) => {
      expect($article.attr('data-vendor-id')).to.eq('vendor-chaudron');
    });

    cy.go('back');
    cy.get('app-vendor-card', { timeout: 10_000 }).should('have.length.greaterThan', 0);

    cy.get('[data-testid=vendor-card-vendor-mama]').click();
    cy.get('app-meal-card', { timeout: 10_000 }).should('have.length.greaterThan', 0);
    cy.get('app-meal-card div[data-vendor-id]').each(($article) => {
      expect($article.attr('data-vendor-id')).to.eq('vendor-mama');
    });
  });
});
