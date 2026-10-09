import { visitAs } from '../support/auth';

// ═══════════════════════════════════════════════════════════════
//  Dataset constants
//
//  Kept in sync with src/app/mock/data/meals.json.
//  Every count below is derived from the actual fixture.
// ═══════════════════════════════════════════════════════════════

const PAGE_SIZE = 8;

const TOTAL_MEALS = 19;

const CAMEROUNAISE_MEALS = 10;
const LIBANAISE_MEALS = 3;

const PLAT_MEALS = 10;
const GRILLADES_MEALS = 3;

const ARACHIDE_EXCLUDED_MEALS = 16;

const MAX_PRICE_3000_MEALS = 8;

const CAMEROUNAISE_NO_ARACHIDE_MEALS = 7;
const CAMEROUNAISE_UNDER_3000_MEALS = 3;

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

/** Count of meals shown on the first page for a given total. */
function firstPageCount(total: number): number {
  return Math.min(total, PAGE_SIZE);
}

/** Count of meals shown on the last page for a given total. */
function lastPageCount(total: number): number {
  const remainder = total % PAGE_SIZE;
  return remainder === 0 ? PAGE_SIZE : remainder;
}

/**
 * Reads `data-amount` from a collection of price-tag elements.
 *
 * Throws when the attribute is missing. Without this guard,
 * `Number(null)` is `0`, every price reads as zero, and the sort
 * assertions pass trivially. A false green is worse than a red test.
 */
function readPrices($els: JQuery<HTMLElement>): number[] {
  return [...$els].map((el) => {
    const raw = el.getAttribute('data-amount');
    if (raw === null) {
      throw new Error('price-tag is missing its data-amount attribute');
    }
    return Number(raw);
  });
}

/** Opens the advanced-filter drawer and waits for it to render. */
function openDrawer(): void {
  cy.get('[data-testid=advanced-filter-trigger]').click();
  cy.get('[data-testid=advanced-filter-drawer]').should('exist');
}

/** Clicks Apply and waits for the drawer to close. */
function applyDrawer(): void {
  cy.get('[data-testid=advanced-filter-apply]').click();
  cy.get('[data-testid=advanced-filter-drawer]').should('not.exist');
}

/**
 * Drives the ingredient autocomplete: types the keyword, waits for
 * the option, selects it with mousedown.
 *
 * `mousedown` (not `click`) is required — the option handler is
 * `(mousedown)="$event.preventDefault(); add(ing)"`, and the input's
 * 150 ms blur timeout closes the dropdown between mousedown and
 * mouseup in a normal `.click()` sequence.
 */
function excludeIngredient(id: string, keyword: string): void {
  cy.get('[data-testid=ingredient-autocomplete-input]').clear().type(keyword);
  cy.get(`[data-testid=ingredient-option-${id}]`, { timeout: 3000 })
    .should('exist')
    .trigger('mousedown');
  cy.get(`[data-testid=ingredient-chip-${id}]`).should('exist');
}

/**
 * Locates an active-filter badge.
 *
 * The component renders:
 *   [attr.data-testid]="'active-filter-' + filter.key"
 *   [attr.data-key]="filter.key"
 *   [attr.data-value]="filter.value"
 */
function badgeFor(
  key: string,
  value?: string | number | boolean,
): Cypress.Chainable<JQuery<HTMLElement>> {
  const selector =
    value === undefined
      ? `[data-testid=active-filter-${key}][data-key="${key}"]`
      : `[data-testid=active-filter-${key}][data-key="${key}"][data-value="${value}"]`;
  return cy.get(selector);
}

/** Selects a cuisine chip in the catalog's shortcut row. */
function selectCuisineChip(id: string): void {
  cy.get(`[data-testid=subcategory-chip-CUISINE-${id}]`).should('exist').click();
}

/** Selects a dish-type chip in the catalog's shortcut row. */
function selectDishTypeChip(id: string): void {
  cy.get(`[data-testid=subcategory-chip-DISH_TYPE-${id}]`).should('exist').click();
}

/**
 * Selects a category pill inside the drawer.
 *
 * The testid casing follows the `CategoryType` enum value verbatim
 * (CUISINE / DISH_TYPE), matching the catalog chip row.
 */
function clickDrawerPill(type: 'CUISINE' | 'DISH_TYPE', id: string): void {
  cy.get(`[data-testid=category-pill-${type}-${id}]`).should('exist').click();
}

// ═══════════════════════════════════════════════════════════════
//  Suite
// ═══════════════════════════════════════════════════════════════

describe('Meal catalog — filtering & sorting', () => {

  beforeEach(() => {
    visitAs('/meals', null);
    cy.get('app-meal-card', { timeout: 10_000 })
      .should('have.length.greaterThan', 0);
  });

  // ═══════════════════════════════════════════════════════════
  //  Baseline
  // ═══════════════════════════════════════════════════════════

  describe('baseline', () => {
    it('renders 8 meals on the first page', () => {
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });

    it('renders a paginator with 3 pages', () => {
      cy.get('[data-testid=pagination]').should('exist');
      cy.get('[data-testid=pagination-page-1]').should('exist');
      cy.get('[data-testid=pagination-page-2]').should('exist');
      cy.get('[data-testid=pagination-page-3]').should('exist');
    });

    it('shows 3 meals on the last page', () => {
      cy.get('[data-testid=pagination-page-3]').click();
      cy.get('app-meal-card').should('have.length', lastPageCount(TOTAL_MEALS));
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Keyword search
  // ═══════════════════════════════════════════════════════════

  describe('keyword search', () => {
    it('shows only Taro for "taro"', () => {
      cy.get('[data-testid=search-bar-input]').type('taro{enter}');
      cy.get('app-meal-card').should('have.length', 1);
      cy.get('[data-testid=meal-card-name]').should('contain.text', 'Taro sauce jaune');
    });

    it('shows both Salade de fruits and Taboulé for "salade"', () => {
      cy.get('[data-testid=search-bar-input]').type('salade{enter}');
      cy.get('app-meal-card').should('have.length', 2);
      cy.get('[data-testid=meal-card-name]').should('contain.text', 'Salade de fruits');
      cy.get('[data-testid=meal-card-name]').should('contain.text', 'Taboulé');
    });

    it('shows the 2 poulet meals for "poulet"', () => {
      cy.get('[data-testid=search-bar-input]').type('poulet{enter}');
      cy.get('app-meal-card').should('have.length', 2);
    });

    it('hides the paginator for single-page results', () => {
      cy.get('[data-testid=search-bar-input]').type('taro{enter}');
      cy.get('[data-testid=pagination]').should('not.exist');
    });

    it('restores the first page after clearing the search', () => {
      cy.get('[data-testid=search-bar-input]').type('taro{enter}');
      cy.get('app-meal-card').should('have.length', 1);

      cy.get('[data-testid=search-bar-clear]').click();
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
      cy.get('[data-testid=pagination]').should('exist');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Cuisine chip (catalog-level shortcut chips)
  // ═══════════════════════════════════════════════════════════

  describe('cuisine chip', () => {
    it('shows 2 pages for 10 Camerounaise meals', () => {
      selectCuisineChip('cuisine-camerounaise');

      cy.get('app-meal-card').should('have.length', firstPageCount(CAMEROUNAISE_MEALS));
      cy.get('[data-testid=pagination]').should('exist');
      cy.get('[data-testid=pagination-page-2]').should('exist');
      cy.get('[data-testid=pagination-page-3]').should('not.exist');
    });

    it('shows 2 Camerounaise meals on the second page', () => {
      selectCuisineChip('cuisine-camerounaise');

      cy.get('[data-testid=pagination-page-2]').click();
      cy.get('app-meal-card').should('have.length', lastPageCount(CAMEROUNAISE_MEALS));
    });

    it('filters to the 3 Libanaise meals', () => {
      selectCuisineChip('cuisine-libanaise');
      cy.get('app-meal-card').should('have.length', LIBANAISE_MEALS);
    });

    it('restores the first page when the chip is toggled off', () => {
      selectCuisineChip('cuisine-camerounaise');
      cy.get('app-meal-card').should('have.length', firstPageCount(CAMEROUNAISE_MEALS));

      selectCuisineChip('cuisine-camerounaise');
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Dish-type chip
  //
  //  The stats endpoint returns a "top 2" for dish types, so the
  //  only chips that ever render are dish-main and dish-grill.
  // ═══════════════════════════════════════════════════════════

  describe('dish-type chip', () => {
    it('filters to the 10 main dishes across 2 pages', () => {
      selectDishTypeChip('dish-main');

      cy.get('app-meal-card').should('have.length', firstPageCount(PLAT_MEALS));
      cy.get('[data-testid=pagination]').should('exist');
      cy.get('[data-testid=pagination-page-2]').should('exist');
      cy.get('[data-testid=pagination-page-3]').should('not.exist');
    });

    it('shows the remaining 2 main dishes on the second page', () => {
      selectDishTypeChip('dish-main');

      cy.get('[data-testid=pagination-page-2]').click();
      cy.get('app-meal-card').should('have.length', lastPageCount(PLAT_MEALS));
    });

    it('filters to the 3 grillades', () => {
      selectDishTypeChip('dish-grill');
      cy.get('app-meal-card').should('have.length', GRILLADES_MEALS);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Sort
  // ═══════════════════════════════════════════════════════════

  describe('sort', () => {
    it('orders the first page by price ascending', () => {
      cy.get('[data-testid=sort-dropdown-trigger]').click();
      cy.get('[data-testid=sort-dropdown-option-price-asc]').click();

      cy.get('[data-testid=meal-card-price] [data-testid=price-tag]')
        .then(($els) => {
          const prices = readPrices($els);
          const sorted = [...prices].sort((a, b) => a - b);
          expect(prices).to.deep.equal(sorted);
        });
    });

    it('orders the first page by price descending', () => {
      cy.get('[data-testid=sort-dropdown-trigger]').click();
      cy.get('[data-testid=sort-dropdown-option-price-desc]').click();

      cy.get('[data-testid=meal-card-price] [data-testid=price-tag]')
        .then(($els) => {
          const prices = readPrices($els);
          const sorted = [...prices].sort((a, b) => b - a);
          expect(prices).to.deep.equal(sorted);
        });
    });

    it('puts an 800-priced meal first when sorting ascending', () => {
      cy.get('[data-testid=sort-dropdown-trigger]').click();
      cy.get('[data-testid=sort-dropdown-option-price-asc]').click();

      cy.get('[data-testid=meal-card-price] [data-testid=price-tag]')
        .first()
        .should('have.attr', 'data-amount', '800');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Advanced filter drawer — scalar controls
  // ═══════════════════════════════════════════════════════════

  describe('advanced filter — max price', () => {
    it('shows 8 meals at or below 3000', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 3000)
        .trigger('input');
      applyDrawer();

      cy.get('app-meal-card').should('have.length', MAX_PRICE_3000_MEALS);
      cy.get('[data-testid=pagination]').should('not.exist');
    });
  });

  describe('advanced filter — exclude Arachide', () => {
    it('removes the 3 meals containing Arachide and shows 2 pages', () => {
      openDrawer();
      excludeIngredient('ing-arachide', 'arachide');
      applyDrawer();

      cy.get('app-meal-card').should('have.length', firstPageCount(ARACHIDE_EXCLUDED_MEALS));
      cy.get('[data-testid=pagination]').should('exist');
      cy.get('[data-testid=pagination-page-2]').should('exist');
      cy.get('[data-testid=pagination-page-3]').should('not.exist');
    });

    it('walks both pages and confirms the arachide meals are gone', () => {
      openDrawer();
      excludeIngredient('ing-arachide', 'arachide');
      applyDrawer();

      const names: string[] = [];

      cy.get('[data-testid=meal-card-name]').each(($el) => {
        names.push($el.text().trim());
      });
      cy.get('[data-testid=pagination-page-2]').click();
      cy.get('[data-testid=meal-card-name]').each(($el) => {
        names.push($el.text().trim());
      });

      cy.then(() => {
        expect(names).to.have.length(ARACHIDE_EXCLUDED_MEALS);
        expect(names).to.not.include('Poulet braisé');
        expect(names).to.not.include('Ndolé');
        expect(names).to.not.include('Okok');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Drawer is authoritative on Apply — every committed value
  //  surfaces as an active-filter badge.
  // ═══════════════════════════════════════════════════════════

  describe('advanced filter — committed values appear as badges', () => {
    it('shows a maxPrice badge after applying only the max-price slider', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 5000)
        .trigger('input');
      applyDrawer();

      badgeFor('maxPrice').should('exist');
    });

    it('shows a minPrice badge after applying only the min-price slider', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-min-price]')
        .invoke('val', 3000)
        .trigger('input');
      applyDrawer();

      badgeFor('minPrice').should('exist');
    });

    it('shows a maxPrepTime badge after applying the prep-time slider', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-prep-time]')
        .invoke('val', 30)
        .trigger('input');
      applyDrawer();

      badgeFor('maxPrepTime').should('exist');
    });

    it('shows a minRating badge after selecting a rating', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-rating-4]').click();
      applyDrawer();

      badgeFor('minRating').should('exist');
    });

    it('shows an excludeIngredient badge after excluding Arachide', () => {
      openDrawer();
      excludeIngredient('ing-arachide', 'arachide');
      applyDrawer();

      badgeFor('excludeIngredient', 'ing-arachide').should('exist');
    });

    it('shows every committed drawer value as a badge in one apply', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-min-price]')
        .invoke('val', 2000).trigger('input');
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 6000).trigger('input');
      cy.get('[data-testid=advanced-filter-max-prep-time]')
        .invoke('val', 45).trigger('input');
      cy.get('[data-testid=advanced-filter-rating-4]').click();
      excludeIngredient('ing-arachide', 'arachide');
      applyDrawer();

      badgeFor('minPrice').should('exist');
      badgeFor('maxPrice').should('exist');
      badgeFor('maxPrepTime').should('exist');
      badgeFor('minRating').should('exist');
      badgeFor('excludeIngredient', 'ing-arachide').should('exist');
    });

    it('discards drawer edits when the backdrop is clicked instead of Apply', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-rating-4]').click();
      applyDrawer();
      badgeFor('minRating').should('exist');

      openDrawer();
      cy.get('[data-testid=advanced-filter-min-price]')
        .invoke('val', 5000).trigger('input');
      cy.get('[data-testid=advanced-filter-backdrop]').click({ force: true });
      cy.get('[data-testid=advanced-filter-drawer]').should('not.exist');

      badgeFor('minRating').should('exist');
      badgeFor('minPrice').should('not.exist');
    });

    it('clear all + apply removes every drawer badge', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-min-price]')
        .invoke('val', 3000).trigger('input');
      cy.get('[data-testid=advanced-filter-rating-4]').click();
      applyDrawer();

      badgeFor('minPrice').should('exist');
      badgeFor('minRating').should('exist');

      openDrawer();
      cy.get('[data-testid=clear-all-advanced-filter]').click();
      applyDrawer();

      badgeFor('minPrice').should('not.exist');
      badgeFor('minRating').should('not.exist');
    });

    it('clear all does not commit until Apply is clicked', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-rating-4]').click();
      applyDrawer();
      badgeFor('minRating', 4).should('exist');

      openDrawer();
      cy.get('[data-testid=clear-all-advanced-filter]').click();
      cy.get('[data-testid=advanced-filter-close]').click();
      cy.get('[data-testid=advanced-filter-drawer]').should('not.exist');

      // The badge survives because clear-all is a draft edit.
      badgeFor('minRating', 4).should('exist');
    });

    it('replaces, not doubles, the badge when the same filter is re-applied', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 5000).trigger('input');
      applyDrawer();
      badgeFor('maxPrice', 5000).should('have.length', 1);

      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 7000).trigger('input');
      applyDrawer();

      badgeFor('maxPrice', 7000).should('have.length', 1);
      badgeFor('maxPrice', 5000).should('not.exist');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Untouched sliders must not commit as filters
  // ═══════════════════════════════════════════════════════════

  describe('advanced filter — untouched sliders are not committed', () => {
    it('does not commit minPrice, maxPrepTime, or minRating when only maxPrice is moved', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 3000)
        .trigger('input');
      applyDrawer();

      badgeFor('maxPrice').should('exist');
      badgeFor('minPrice').should('not.exist');
      badgeFor('maxPrepTime').should('not.exist');
      badgeFor('minRating').should('not.exist');
    });

    it('does not commit maxPrice or maxPrepTime when only minPrice is moved', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-min-price]')
        .invoke('val', 4000)
        .trigger('input');
      applyDrawer();

      badgeFor('minPrice').should('exist');
      badgeFor('maxPrice').should('not.exist');
      badgeFor('maxPrepTime').should('not.exist');
      badgeFor('minRating').should('not.exist');
    });

    it('does not commit anything when Apply is clicked without touching a control', () => {
      openDrawer();
      applyDrawer();

      badgeFor('minPrice').should('not.exist');
      badgeFor('maxPrice').should('not.exist');
      badgeFor('maxPrepTime').should('not.exist');
      badgeFor('minRating').should('not.exist');

      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Chip ↔ drawer reconciliation
  //
  //  Cuisine / dish-type chips are shortcuts for the drawer's
  //  pill selection. They must stay in sync in BOTH directions:
  //  the drawer can drop a chip, and it can also add one — but
  //  only for categories present in the curated shortcut set.
  // ═══════════════════════════════════════════════════════════

  describe('chip ↔ drawer reconciliation', () => {
    it('keeps a cuisine chip selected when the drawer is opened and applied untouched', () => {
      selectCuisineChip('cuisine-camerounaise');

      openDrawer();
      applyDrawer();

      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]')
        .should('exist')
        .and('have.attr', 'aria-pressed', 'true');
    });

    it('keeps a dish-type chip selected when the drawer is opened and applied untouched', () => {
      selectDishTypeChip('dish-main');

      openDrawer();
      applyDrawer();

      cy.get('[data-testid=subcategory-chip-DISH_TYPE-dish-main]')
        .should('exist')
        .and('have.attr', 'aria-pressed', 'true');
    });

    it('adds a chip when a KNOWN cuisine is selected inside the drawer', () => {
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]')
        .should('exist')
        .and('not.have.attr', 'aria-pressed', 'true');

      openDrawer();
      clickDrawerPill('CUISINE', 'cuisine-camerounaise');
      applyDrawer();

      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]')
        .should('exist')
        .and('have.attr', 'aria-pressed', 'true');
    });

    it('adds a chip when a KNOWN dish type is selected inside the drawer', () => {
      openDrawer();
      clickDrawerPill('DISH_TYPE', 'dish-main');
      applyDrawer();

      cy.get('[data-testid=subcategory-chip-DISH_TYPE-dish-main]')
        .should('exist')
        .and('have.attr', 'aria-pressed', 'true');
    });

    it('does NOT add a chip when an UNKNOWN cuisine is selected inside the drawer', () => {
      // Wait for the chip row to render so the "not.exist" below is
      // meaningful and not just "the page has not loaded yet".
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]')
        .should('exist');

      openDrawer();
      // Italienne is a real category (categories.json) but is not in
      // mostDemandedCuisines, so it has no chip definition.
      clickDrawerPill('CUISINE', 'cuisine-italienne');
      applyDrawer();

      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-italienne]')
        .should('not.exist');

      // But the badge IS rendered, because drawerSelection has it.
      badgeFor('cuisine', 'cuisine-italienne').should('exist');
    });

    it('does NOT add a chip for a dish type outside the curated set', () => {
      cy.get('[data-testid=subcategory-chip-DISH_TYPE-dish-main]')
        .should('exist');

      openDrawer();
      // dish-dessert is a real DISH_TYPE but not in mostDemandedDish.
      clickDrawerPill('DISH_TYPE', 'dish-dessert');
      applyDrawer();

      cy.get('[data-testid=subcategory-chip-DISH_TYPE-dish-dessert]')
        .should('not.exist');

      badgeFor('dishType', 'dish-dessert').should('exist');
    });

    it('removes a chip when the corresponding cuisine is deselected inside the drawer', () => {
      selectCuisineChip('cuisine-camerounaise');

      openDrawer();
      clickDrawerPill('CUISINE', 'cuisine-camerounaise');
      applyDrawer();

      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]')
        .should('not.have.attr', 'aria-pressed', 'true');
    });

    it('chip selection adds the corresponding badge on apply', () => {
      selectCuisineChip('cuisine-camerounaise');
      badgeFor('cuisine', 'cuisine-camerounaise').should('exist');
    });

    it('drawer pill selection adds the corresponding badge on apply', () => {
      openDrawer();
      clickDrawerPill('CUISINE', 'cuisine-camerounaise');
      applyDrawer();

      badgeFor('cuisine', 'cuisine-camerounaise').should('exist');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Combined filters
  // ═══════════════════════════════════════════════════════════

  describe('combined filters', () => {
    it('shows 7 Camerounaise meals without arachide', () => {
      selectCuisineChip('cuisine-camerounaise');
      openDrawer();
      excludeIngredient('ing-arachide', 'arachide');
      applyDrawer();

      cy.get('app-meal-card').should('have.length', CAMEROUNAISE_NO_ARACHIDE_MEALS);
      cy.get('[data-testid=pagination]').should('not.exist');
    });

    it('shows 3 Camerounaise meals under 3000', () => {
      selectCuisineChip('cuisine-camerounaise');
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 3000)
        .trigger('input');
      applyDrawer();

      cy.get('app-meal-card').should('have.length', CAMEROUNAISE_UNDER_3000_MEALS);
    });

    it('applies chip + sort and orders the first page', () => {
      selectCuisineChip('cuisine-camerounaise');
      cy.get('[data-testid=sort-dropdown-trigger]').click();
      cy.get('[data-testid=sort-dropdown-option-price-asc]').click();

      cy.get('[data-testid=meal-card-price] [data-testid=price-tag]')
        .should(($els) => {
          const prices = readPrices($els);
          const sorted = [...prices].sort((a, b) => a - b);
          expect(prices).to.deep.equal(sorted);
        });
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Badge removal
  // ═══════════════════════════════════════════════════════════

  describe('badge removal', () => {
    it('removes the search badge and restores the full catalog', () => {
      cy.get('[data-testid=search-bar-input]').type('taro{enter}');
      cy.get('app-meal-card').should('have.length', 1);
      badgeFor('query').should('exist');

      cy.get('[data-testid=remove-active-filter-query]').click();

      badgeFor('query').should('not.exist');
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });

    it('removes a maxPrice badge applied from the drawer', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 3000).trigger('input');
      applyDrawer();

      badgeFor('maxPrice', 3000).should('exist');
      cy.get('app-meal-card').should('have.length', MAX_PRICE_3000_MEALS);

      cy.get('[data-testid=remove-active-filter-maxPrice]').click();

      badgeFor('maxPrice', 3000).should('not.exist');
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });

    it('removes a minRating badge applied from the drawer', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-rating-4]').click();
      applyDrawer();

      badgeFor('minRating', 4).should('exist');

      cy.get('[data-testid=remove-active-filter-minRating]').click();

      badgeFor('minRating', 4).should('not.exist');
    });

    it('removes a cuisine badge and deselects the matching chip', () => {
      selectCuisineChip('cuisine-camerounaise');
      badgeFor('cuisine', 'cuisine-camerounaise').should('exist');
      cy.get('app-meal-card').should('have.length', firstPageCount(CAMEROUNAISE_MEALS));

      cy.get('[data-testid=remove-active-filter-cuisine]').click();

      badgeFor('cuisine', 'cuisine-camerounaise').should('not.exist');
      cy.get('[data-testid=subcategory-chip-CUISINE-cuisine-camerounaise]')
        .should('not.have.attr', 'aria-pressed', 'true');
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });

    it('removes a dish-type badge and deselects the matching chip', () => {
      selectDishTypeChip('dish-main');
      badgeFor('dishType', 'dish-main').should('exist');

      cy.get('[data-testid=remove-active-filter-dishType]').click();

      badgeFor('dishType', 'dish-main').should('not.exist');
      cy.get('[data-testid=subcategory-chip-DISH_TYPE-dish-main]')
        .should('not.have.attr', 'aria-pressed', 'true');
    });

    it('removes an excludeIngredient badge and restores the hidden meals', () => {
      openDrawer();
      excludeIngredient('ing-arachide', 'arachide');
      applyDrawer();

      badgeFor('excludeIngredient', 'ing-arachide').should('exist');
      cy.get('app-meal-card').should('have.length', firstPageCount(ARACHIDE_EXCLUDED_MEALS));

      cy.get('[data-testid=remove-active-filter-excludeIngredient][data-value="ing-arachide"]').click();

      badgeFor('excludeIngredient', 'ing-arachide').should('not.exist');
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });

    it('removes only the targeted excludeIngredient badge when two are present', () => {
      openDrawer();
      excludeIngredient('ing-arachide', 'arachide');
      excludeIngredient('ing-riz', 'riz');
      applyDrawer();

      badgeFor('excludeIngredient', 'ing-arachide').should('exist');
      badgeFor('excludeIngredient', 'ing-riz').should('exist');

      cy.get('[data-testid=remove-active-filter-excludeIngredient][data-value="ing-arachide"]').click();

      badgeFor('excludeIngredient', 'ing-arachide').should('not.exist');
      badgeFor('excludeIngredient', 'ing-riz').should('exist');
    });

    it('the badge removal button carries the same key and value as its badge', () => {
      openDrawer();
      cy.get('[data-testid=advanced-filter-max-price]')
        .invoke('val', 3000).trigger('input');
      applyDrawer();

      cy.get('[data-testid=remove-active-filter-maxPrice]')
        .should('have.attr', 'data-key', 'maxPrice')
        .and('have.attr', 'data-value', '3000');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Search badge removal
  // ═══════════════════════════════════════════════════════════

  describe('search badge removal', () => {
    it('restores the first page when the keyword is cleared via the search bar', () => {
      cy.get('[data-testid=search-bar-input]').type('taro{enter}');
      cy.get('app-meal-card').should('have.length', 1);

      cy.get('[data-testid=search-bar-clear]').click();
      cy.get('app-meal-card').should('have.length', firstPageCount(TOTAL_MEALS));
    });
  });
});
