import { visitAs } from '../support/auth';
import { MOCK_USERS } from '../support/mock-user';

const VENDOR_DASHBOARD = '/vendor/meals';
const ADMIN_DASHBOARD = '/admin/meals';

// ═══════════════════════════════════════════════════════════════
//  Vendor workspace
// ═══════════════════════════════════════════════════════════════

describe('Meals page — vendor workspace', () => {
  beforeEach(() => {
    visitAs(VENDOR_DASHBOARD, MOCK_USERS.vendor);
    cy.get('[data-testid=meals-page]', { timeout: 10_000 }).should('exist');
    cy.get('[data-testid=meal-table]', { timeout: 10_000 }).should('exist');
  });

  // ─── Static rendering ─────────────────────────────────────

  describe('rendering', () => {
    it('renders the vendor title', () => {
      cy.get('[data-testid=meals-page-title]').should('contain.text', 'Mes Plats');
    });

    it('renders the meal table', () => {
      cy.get('[data-testid=meal-table]').should('exist');
    });

    it('shows the "new meal" button', () => {
      cy.get('[data-testid=meals-page-new-button]').should('exist');
    });

    it('shows the filter bar with its three controls', () => {
      cy.get('app-meal-filters').should('exist');
      cy.get('[data-testid=meal-filters-name-input]').should('exist');
      cy.get('[data-testid=meal-filters-status-select]').should('exist');
      cy.get('[data-testid=meal-filters-sort-select]').should('exist');
    });

    it('shows the location selector', () => {
      cy.get('app-inline-location-selector').should('exist');
    });

    it('renders the edit and delete buttons on each row', () => {
      cy.get('[data-testid^=meal-table-row-]').should('have.length.greaterThan', 0);
      cy.get('[data-testid^=meal-table-edit-]').should('have.length.greaterThan', 0);
      cy.get('[data-testid^=meal-table-delete-]').should('have.length.greaterThan', 0);
    });

    it('does not render the admin moderation controls', () => {
      cy.get('[data-testid=moderation-panel]').should('not.exist');
      cy.get('[data-testid^=meal-table-select-]').should('not.exist');
    });
  });

  // ─── Table data ───────────────────────────────────────────

  describe('table data', () => {
    it('renders the name of the first row', () => {
      cy.get('[data-testid^=meal-table-row-]').first().within(() => {
        cy.get('[data-testid=meal-table-name]').should('not.be.empty');
      });
    });

    it('renders the price of the first row as a number', () => {
      cy.get('[data-testid=meal-table-price]').first().then(($el) => {
        const amount = Number($el.attr('data-amount'));
        expect(amount).to.be.a('number').and.greaterThan(0);
      });
    });

    it('renders the ingredient and location counts', () => {
      cy.get('[data-testid=meal-table-ingredient-count]').first().then(($el) => {
        expect(Number($el.attr('data-ingredient-count'))).to.be.at.least(0);
        expect(Number($el.attr('data-allergen-count'))).to.be.at.least(0);
      });

      cy.get('[data-testid=meal-table-location-count]').first().then(($el) => {
        expect(Number($el.attr('data-location-count'))).to.be.at.least(0);
      });
    });

    it('renders the status badge for the first row', () => {
      cy.get('[data-testid^=meal-table-status-]').first().should('not.be.empty');
    });
  });

  // ─── Filters ──────────────────────────────────────────────

  describe('filters', () => {
    it('filters the list by keyword', () => {
      cy.get('[data-testid=meal-filters-name-input]').type('taro{enter}');
      cy.get('[data-testid^=meal-table-row-]').should('have.length.at.least', 1);
      cy.get('[data-testid=meal-table-name]').should('contain.text', 'Taro');
    });

    it('filters by status', () => {
      cy.get('[data-testid=meal-filters-status-select]').select('APPROVED');
      cy.get('[data-testid^=meal-table-status-]').should('have.length.greaterThan', 0);
      cy.get('[data-testid^=meal-table-status-]').each(($el) => {
        expect($el.text().trim()).to.contain('Approuvé');
      });
    });

    it('changes the sort and orders the prices', () => {
      cy.get('[data-testid=meal-filters-sort-select]').select('price-asc');
      cy.get('[data-testid=meal-table-price]').should(($els) => {
        const prices = [...$els].map((el) => Number(el.getAttribute('data-amount')));
        const sorted = [...prices].sort((a, b) => a - b);
        expect(prices).to.deep.equal(sorted);
      });
    });

    it('combines keyword and sort', () => {
      cy.get('[data-testid=meal-filters-name-input]').type('poulet{enter}');
      cy.get('[data-testid=meal-filters-sort-select]').select('price-asc');
      cy.get('[data-testid^=meal-table-row-]').should('have.length.at.least', 1);
      cy.get('[data-testid=meal-table-price]').should(($els) => {
        const prices = [...$els].map((el) => Number(el.getAttribute('data-amount')));
        const sorted = [...prices].sort((a, b) => a - b);
        expect(prices).to.deep.equal(sorted);
      });
    });

    it('applies an advanced filter (max price)', () => {
      cy.get('[data-testid=advanced-filter-trigger]').click();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 3000)
        .trigger('input');
      cy.get('[data-testid=advanced-filter-apply]').click();

      cy.get('[data-testid^=meal-table-row-]').should('have.length', 3);

      cy.get('[data-testid=meal-table-price]').each(($el) => {
        expect(Number($el.attr('data-amount'))).to.be.at.most(3000);
      });
    });
  });

  // ─── Delete ───────────────────────────────────────────────

  describe('delete', () => {
    it('opens the delete dialog with the meal name', () => {
      cy.get('[data-testid^=meal-table-row-]').first().within(() => {
        cy.get('[data-testid=meal-table-name]').invoke('text').as('mealName');
      });
      cy.get('[data-testid^=meal-table-delete-]').first().click();

      cy.get('[data-testid=delete-entity-dialog]', { timeout: 5000 }).should('exist');
       cy.get('@mealName').then((name) => {
         cy.get('[data-testid=delete-entity-dialog-title]').should(($el) => {
           const title = $el.text().trim();
           expect(title).to.contain((name as string).trim());
         });
       });
    });

    it('does nothing on cancel', () => {
      cy.get('[data-testid^=meal-table-row-]').then(($rows) => {
        const beforeCount = $rows.length;
        cy.wrap(beforeCount).as('beforeCount');
      });

      cy.get('[data-testid^=meal-table-delete-]').first().click();
      cy.get('[data-testid=delete-entity-dialog-cancel]').click();
      cy.get('[data-testid=delete-entity-dialog]').should('not.exist');

      cy.get('@beforeCount').then((beforeCount) => {
        cy.get('[data-testid^=meal-table-row-]').should('have.length', beforeCount as any);
      });
    });

    it('removes the row when a reason is typed and Supprimer is clicked', () => {
      // Capture the meal name so we can assert it's gone afterwards.
      cy.get('[data-testid^=meal-table-row-]').first().within(() => {
        cy.get('[data-testid=meal-table-name]').invoke('text').then((text) => {
          cy.wrap(text.trim()).as('deletedName');
        });
      });

      cy.get('[data-testid^=meal-table-row-]').then(($rows) => {
        cy.wrap($rows.length).as('beforeCount');
      });

      cy.get('[data-testid^=meal-table-delete-]').first().click();
      cy.get('[data-testid=delete-entity-dialog]').should('exist');

      cy.get('[data-testid=delete-entity-dialog-reason]').type('Plat obsolète');
      cy.get('[data-testid=delete-entity-dialog-confirm]').click();

      cy.get('[data-testid=delete-entity-dialog]').should('not.exist');

      cy.get('@deletedName').then((name) => {
        cy.get('[data-testid=meal-table-name]').should('not.contain.text', name as any);
      });
    });

    it('keeps the confirm button disabled until a reason is typed', () => {
      cy.get('[data-testid^=meal-table-delete-]').first().click();
      cy.get('[data-testid=delete-entity-dialog-confirm]').should('be.disabled');
      cy.get('[data-testid=delete-entity-dialog-reason]').type('x');
      cy.get('[data-testid=delete-entity-dialog-confirm]').should('be.enabled');
    });
  });

  // ─── Edit ─────────────────────────────────────────────────

  describe('edit', () => {
    it('navigates to the meal editor', () => {
      cy.get('[data-testid^=meal-table-row-]').first().then(($row) => {
        const mealId = $row.attr('data-meal-id');
        cy.wrap(mealId).as('mealId');
      });

      cy.get('[data-testid^=meal-table-edit-]').first().click();

      cy.get('@mealId').then((mealId) => {
        cy.location('pathname').should('include', `/vendor/meals/edit/${mealId}`);
      });
    });
  });

  // ─── New meal ─────────────────────────────────────────────

  describe('new meal', () => {
    it('navigates to the meal creation page', () => {
      cy.get('[data-testid=meals-page-new-button]').click();
      cy.location('pathname').should('eq', '/vendor/meals/new');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//  Admin workspace
// ═══════════════════════════════════════════════════════════════

describe('Meals page — admin workspace', () => {
  beforeEach(() => {
    visitAs(ADMIN_DASHBOARD, MOCK_USERS.admin);
    cy.get('[data-testid=meals-page]', { timeout: 10_000 }).should('exist');
  });

  describe('initial state', () => {
    it('renders the admin title', () => {
      cy.get('[data-testid=meals-page-title]').should('contain.text', 'Modération des Plats');
    });

    it('shows the "select a vendor" state', () => {
      cy.get('[data-testid=meals-page-admin-no-vendor]').should('exist');
    });

    it('shows the vendor picker', () => {
      cy.get('app-vendor-picker').should('exist');
    });

    it('shows the two-column admin layout', () => {
      cy.get('[data-testid=meals-page-admin-left]').should('exist');
      cy.get('[data-testid=meals-page-admin-right]').should('exist');
    });

    it('does not render the vendor new-meal button', () => {
      cy.get('[data-testid=meals-page-new-button]').should('not.exist');
    });
  });

  describe('after selecting a vendor', () => {
    beforeEach(() => {
      cy.get('[data-testid=vendor-picker-search]')
        .scrollIntoView()
        .should('be.visible')
        .clear()
        .type('ch');

      cy.get('[data-testid^=vendor-picker-option-]', { timeout: 10_000 })
        .should('have.length.greaterThan', 0);

      cy.get('[data-testid^=vendor-picker-option-]').first().click();

      cy.get('[data-testid=meal-table]', { timeout: 10_000 }).should('exist');
    });

    it('renders the meal table', () => {
      cy.get('[data-testid=meal-table]').should('exist');
    });

    it('renders select buttons only (no edit/delete)', () => {
      cy.get('[data-testid^=meal-table-select-]').should('have.length.greaterThan', 0);
      cy.get('[data-testid^=meal-table-edit-]').should('not.exist');
      cy.get('[data-testid^=meal-table-delete-]').should('not.exist');
    });

    it('renders a chip for the selected vendor', () => {
      cy.get('[data-testid^=vendor-picker-chip-]').should('have.length', 1);
    });

    it('shows the moderation hint before a row is selected', () => {
      cy.get('[data-testid=meals-page-admin-hint]').should('exist');
      cy.get('[data-testid=moderation-panel]').should('not.exist');
    });
  });

  describe('moderation flow', () => {
    beforeEach(() => {
      cy.get('[data-testid=vendor-picker-search]')
        .scrollIntoView()
        .should('be.visible')
        .clear()
        .type('ch');

      cy.get('[data-testid^=vendor-picker-option-]', { timeout: 10_000 })
        .should('have.length.greaterThan', 0);

      cy.get('[data-testid^=vendor-picker-option-]').first().click();

      cy.get('[data-testid=meal-table]', { timeout: 10_000 }).should('exist');
    });

    it('opens the moderation panel and references panel on row select', () => {
      cy.get('[data-testid^=meal-table-select-]').first().click();
      cy.get('[data-testid=moderation-panel]', { timeout: 5000 }).should('exist');
      cy.get('[data-testid=meal-references-panel]').should('exist');
    });

    it('exposes the current status on the moderation panel', () => {
      cy.get('[data-testid^=meal-table-select-]').first().click();
      cy.get('[data-testid=moderation-panel-status]')
        .should('exist')
        .and('have.attr', 'data-status')
        .and('match', /^(PENDING|APPROVED|REJECTED|DISABLED)$/);
    });

    it('shows decisions appropriate to the current status', () => {
      cy.get('[data-testid^=meal-table-select-]').first().click();

      cy.get('[data-testid=moderation-panel-status]').then(($status) => {
        const status = $status.attr('data-status');

        if (status === 'PENDING') {
          cy.get('[data-testid=moderation-panel-decision-APPROVE]').should('exist');
          cy.get('[data-testid=moderation-panel-decision-REJECT]').should('exist');
        } else if (status === 'APPROVED') {
          cy.get('[data-testid=moderation-panel-decision-DISABLE]').should('exist');
          cy.get('[data-testid=moderation-panel-decision-REVOKE]').should('exist');
        } else if (status === 'DISABLED') {
          cy.get('[data-testid=moderation-panel-decision-REACTIVATE]').should('exist');
        } else if (status === 'REJECTED') {
          cy.get('[data-testid=moderation-panel-no-decision]').should('exist');
        }
      });
    });

    it('requires a reason for decisions that mandate one', () => {
      cy.get('[data-testid^=meal-table-select-]').first().click();

      // Only meaningful if the selected meal is PENDING or APPROVED.
      cy.get('[data-testid=moderation-panel-status]').then(($status) => {
        const status = $status.attr('data-status');

        if (status === 'PENDING') {
          // Try to reject without a reason.
          cy.get('[data-testid=moderation-panel-decision-REJECT]').click();
          cy.get('[data-testid=moderation-panel-error]').should('exist');
        } else if (status === 'APPROVED') {
          cy.get('[data-testid=moderation-panel-decision-DISABLE]').click();
          cy.get('[data-testid=moderation-panel-error]').should('exist');
        }
      });
    });

    it('hides the hint once a row is selected', () => {
      cy.get('[data-testid=meals-page-admin-hint]').should('exist');
      cy.get('[data-testid^=meal-table-select-]').first().click();
      cy.get('[data-testid=meals-page-admin-hint]').should('not.exist');
    });
  });
});
