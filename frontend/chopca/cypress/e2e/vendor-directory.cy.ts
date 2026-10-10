import { visitAs } from '../support/auth';

const TOTAL_VENDORS = 6;
const PAGE_SIZE = 9;             // all vendors fit on one page with the mock

const CAMEROUNAISE_VENDORS = 4;  // chaudron, mama, sea, grill
const LIBANAISE_VENDORS = 1;     // liban
const ITALIENNE_VENDORS = 1;     // pizza

const DOUALA_VENDORS = 2;        // chaudron, liban
const YAOUNDE_VENDORS = 1;       // mama

describe('Vendor directory — filtering, sorting, listing', () => {
  beforeEach(() => {
    visitAs('/meals/vendor/directory', null);
    cy.get('app-vendor-card', { timeout: 10_000 })
      .should('have.length.greaterThan', 0);
  });

  // ═══════════════════════════════════════════════════════════
  //  Baseline
  // ═══════════════════════════════════════════════════════════

  describe('baseline', () => {
    it('renders all vendors on the first page', () => {
      cy.get('app-vendor-card').should('have.length', TOTAL_VENDORS);
    });

    it('renders the vendor name on each card', () => {
      cy.get('[data-testid=vendor-card-name]').should('have.length', TOTAL_VENDORS);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Cuisine filter
  // ═══════════════════════════════════════════════════════════

  describe('cuisine chip', () => {
    it('filters to Camerounaise vendors', () => {
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]')
        .should('exist')
        .click();

      cy.get('app-vendor-card').should('have.length', CAMEROUNAISE_VENDORS);
    });

    it('filters to Libanaise vendors', () => {
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-libanaise]')
        .should('exist')
        .click();

      cy.get('app-vendor-card').should('have.length', LIBANAISE_VENDORS);
    });

    it('filters to Italienne vendors', () => {
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-italienne]')
        .should('exist')
        .click();

      cy.get('app-vendor-card').should('have.length', ITALIENNE_VENDORS);
    });

    it('restores the full list when the chip is toggled off', () => {
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]').click();
      cy.get('app-vendor-card').should('have.length', CAMEROUNAISE_VENDORS);

      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]').click();
      cy.get('app-vendor-card').should('have.length', TOTAL_VENDORS);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Search
  // ═══════════════════════════════════════════════════════════

  describe('search', () => {
    it('filters by keyword', () => {
      cy.get('[data-testid=search-bar-input]').type('chaudron{enter}');
      cy.get('app-vendor-card').should('have.length', 1);
      cy.get('[data-testid=vendor-card-name]').should('contain.text', 'Le Chaudron du bon gout');
    });

    it('shows the empty state when nothing matches', () => {
      cy.get('[data-testid=search-bar-input]').type('zzzzz{enter}');
      cy.get('app-vendor-card').should('have.length', 0);
      cy.get('[data-testid=vendor-directory-empty]').should('exist');
    });

    it('restores the full list when the search is cleared', () => {
      cy.get('[data-testid=search-bar-input]').type('chaudron{enter}');
      cy.get('app-vendor-card').should('have.length', 1);

      cy.get('[data-testid=search-bar-clear]').click();
      cy.get('app-vendor-card').should('have.length', TOTAL_VENDORS);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Sort
  // ═══════════════════════════════════════════════════════════

  describe('sort', () => {
    it('orders vendors alphabetically by default', () => {
      cy.get('[data-testid=vendor-card-name]')
        .then(($els) => {
          const names = [...$els].map((el) => el.textContent!.trim());
          const sorted = [...names].sort((a, b) => a.localeCompare(b));
          expect(names).to.deep.equal(sorted);
        });
    });

    it('orders vendors by rating descending when selected', () => {
      cy.get('[data-testid=sort-dropdown-trigger]').click();
      cy.get('[data-testid=sort-dropdown-option-ratingAvg]').click();

      cy.get('[data-testid=vendor-card-rating]')
        .should(($els) => {
          const ratings = [...$els].map((el) => Number(el.getAttribute('data-rating')));
          const sorted = [...ratings].sort((a, b) => b - a);
          expect(ratings).to.deep.equal(sorted);
        });
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Combined
  // ═══════════════════════════════════════════════════════════

  describe('combined', () => {
    it('filters by cuisine AND keyword', () => {
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]').click();
      cy.get('app-vendor-card').should('have.length', CAMEROUNAISE_VENDORS);

      cy.get('[data-testid=search-bar-input]').type('mama{enter}');
      cy.get('app-vendor-card').should('have.length', 1);
      cy.get('[data-testid=vendor-card-name]').should('contain.text', 'Chez Mama Ngo');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Reset
  // ═══════════════════════════════════════════════════════════

  describe('reset', () => {
    it('restores the full list', () => {
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]').click();
      cy.get('[data-testid=search-bar-input]').type('chaudron{enter}');
      cy.get('app-vendor-card').should('have.length', 1);

      cy.get('[data-testid=search-bar-clear]').click();
      cy.get('app-vendor-card').should('have.length', CAMEROUNAISE_VENDORS);
    });
  });


});
