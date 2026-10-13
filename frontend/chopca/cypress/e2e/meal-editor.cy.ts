import { visitAs } from '../support/auth';
import { MOCK_USERS } from '../support/mock-user';

const NEW_MEAL = '/vendor/meals/new';
const VENDOR_MEALS = '/vendor/meals';
const DEFAULT_CITY_ID = 'city-douala';

// ═══════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════

function openEditor(): void {
  visitAs(NEW_MEAL, MOCK_USERS.vendor);
  cy.get('[data-testid=meal-editor-content]', { timeout: 10_000 }).should('exist');
}

function goToComposition(): void {
  cy.get('[data-testid=meal-editor-next-composition]').click();
}

function goToPricing(): void {
  cy.get('[data-testid=meal-editor-next-pricing]').click();
}

/** Fills step 1 with the minimum required for a valid form. */
function fillIdentity(name: string): void {
  cy.get('[data-testid=step-identity-name]').type(name);
  cy.get('[data-testid=step-identity-cuisines] [data-testid^=category-pill-CUISINE-]')
    .first()
    .click();
  cy.get('[data-testid=step-identity-dish-types] [data-testid^=category-pill-DISH_TYPE-]')
    .first()
    .click();
}

function selectCity(cityId: string): void {
  cy.get('[data-testid=location-form-city]').click();
  cy.get(`[data-testid=location-form-city-option-${cityId}]`, { timeout: 3000 })
    .should('exist')
    .click();
}

function createNewIngredient(name: string): void {
  cy.get('[data-testid=ingredient-input]').clear().type(name);
  cy.get('[data-testid=ingredient-create]', { timeout: 3000 })
    .should('exist')
    .click();
  cy.get('[data-testid=new-ingredient-dialog]', { timeout: 3000 }).should('exist');
  cy.get('[data-testid=ingredient-form-name]').clear().type(name);
  cy.get('[data-testid=ingredient-form-submit]').click();
  cy.get('[data-testid=new-ingredient-dialog]').should('not.exist');
}

function createNewLocation(
  name: string,
  address: string,
  cityId: string = DEFAULT_CITY_ID,
): void {
  cy.get('[data-testid=step-pricing-location-input]').clear().type(name);
  cy.get('[data-testid=location-create]', { timeout: 3000 })
    .should('exist')
    .click();
  cy.get('[data-testid=new-location-dialog]', { timeout: 3000 }).should('exist');

  selectCity(cityId);

  cy.get('[data-testid=location-form-name]').clear().type(name);
  cy.get('[data-testid=location-form-address]').clear().type(address);
  cy.get('[data-testid=location-form-submit]').click();
  cy.get('[data-testid=new-location-dialog]').should('not.exist');
}

function submitAndWaitForRedirect(): void {
  cy.get('[data-testid=meal-editor-submit]').click();
  cy.location('pathname', { timeout: 10_000 }).should('eq', VENDOR_MEALS);
}

function searchMealsList(keyword: string): void {
  cy.get('[data-testid=meal-filters-name-input]').clear().type(`${keyword}{enter}`);
}

// ═══════════════════════════════════════════════════════════════
//  Journey — create a meal with all-new entities
// ═══════════════════════════════════════════════════════════════

describe('Meal editor — create a meal with brand-new ingredients and locations', () => {
  const MEAL_NAME = 'Plat Tout Nouveau';
  const INGREDIENT_NAME = 'Ingrédient Nouveau';
  const LOCATION_NAME = 'Zone Nouvelle';
  const LOCATION_ADDRESS = 'Rue Nouvelle, Akwa, Douala';

  beforeEach(openEditor);

  it('creates the meal and finds it in the list with the correct data', () => {
    fillIdentity(MEAL_NAME);
    cy.get('[data-testid=step-identity-description]').type('Un plat créé par un test.');

    goToComposition();
    createNewIngredient(INGREDIENT_NAME);
    cy.get('[data-testid^=ingredient-chip-]')
      .first()
      .should('have.attr', 'data-ingredient-name', INGREDIENT_NAME);

    goToPricing();
    cy.get('[data-testid=step-pricing-price]').clear().type('3500');
    createNewLocation(LOCATION_NAME, LOCATION_ADDRESS);
    cy.get('[data-testid^=location-chip-]')
      .first()
      .should('have.attr', 'data-location-name', LOCATION_NAME);

    submitAndWaitForRedirect();
    searchMealsList(MEAL_NAME);

    cy.get('[data-testid^=meal-table-row-]', { timeout: 5000 })
      .should('have.length', 1)
      .first()
      .within(() => {
        cy.get('[data-testid=meal-table-name]').should('contain.text', MEAL_NAME);
        cy.get('[data-testid=meal-table-price]').should('have.attr', 'data-amount', '3500');
      });
  });
});

// ═══════════════════════════════════════════════════════════════
//  Journey — create a meal with mixed existing/new entities
// ═══════════════════════════════════════════════════════════════

describe('Meal editor — create a meal with mixed entities', () => {
  const MEAL_NAME = 'Plat Mixte';

  beforeEach(openEditor);

  it('creates the meal with one existing and one new ingredient', () => {
    fillIdentity(MEAL_NAME);

    goToComposition();
    cy.get('[data-testid=ingredient-input]').type('arachide');
    cy.get('[data-testid^=ingredient-option-]', { timeout: 3000 }).first().click();
    createNewIngredient('Ingrédient Mixte');

    cy.get('[data-testid^=ingredient-chip-]').should('have.length', 2);

    goToPricing();
    cy.get('[data-testid=step-pricing-price]').clear().type('5000');

    submitAndWaitForRedirect();
    searchMealsList(MEAL_NAME);

    cy.get('[data-testid^=meal-table-row-]', { timeout: 5000 })
      .should('have.length', 1)
      .first()
      .within(() => {
        cy.get('[data-testid=meal-table-name]').should('contain.text', MEAL_NAME);
        cy.get('[data-testid=meal-table-price]').should('have.attr', 'data-amount', '5000');
      });
  });

  it('creates the meal with one existing and one new location', () => {
    fillIdentity(MEAL_NAME);

    goToComposition();
    cy.get('[data-testid=ingredient-input]').type('arachide');
    cy.get('[data-testid^=ingredient-option-]', { timeout: 3000 }).first().click();

    goToPricing();
    cy.get('[data-testid=step-pricing-price]').clear().type('5000');

    cy.get('[data-testid=step-pricing-location-input]').type('akwa');
    cy.get('[data-testid^=location-option-]', { timeout: 3000 }).first().click();
    createNewLocation('Zone Mixte', 'Rue Mixte, Akwa');

    cy.get('[data-testid^=location-chip-]').should('have.length', 2);

    submitAndWaitForRedirect();
    searchMealsList(MEAL_NAME);

    cy.get('[data-testid^=meal-table-row-]', { timeout: 5000 })
      .should('have.length', 1)
      .first()
      .within(() => {
        cy.get('[data-testid=meal-table-name]').should('contain.text', MEAL_NAME);
        cy.get('[data-testid=meal-table-price]').should('have.attr', 'data-amount', '5000');
      });
  });
});

// ═══════════════════════════════════════════════════════════════
//  Journey — edit a just-created ingredient, save and cancel
// ═══════════════════════════════════════════════════════════════

describe('Meal editor — edit a just-created ingredient', () => {
  beforeEach(() => {
    openEditor();
    goToComposition();
  });

  it('saves the edit and updates the chip label', () => {
    const ORIGINAL = 'Ingrédient À Modifier';
    const UPDATED = 'Ingrédient Modifié';

    createNewIngredient(ORIGINAL);
    cy.get('[data-testid^=ingredient-chip-]')
      .first()
      .should('have.attr', 'data-ingredient-name', ORIGINAL);

    cy.get('[data-testid^=edit-ingredient-chip-]').first().click();
    cy.get('[data-testid=new-ingredient-dialog]', { timeout: 3000 }).should('exist');
    cy.get('[data-testid=ingredient-form-name]').clear().type(UPDATED);
    cy.get('[data-testid=ingredient-form-submit]').click();
    cy.get('[data-testid=new-ingredient-dialog]').should('not.exist');

    cy.get('[data-testid^=ingredient-chip-]')
      .first()
      .should('have.attr', 'data-ingredient-name', UPDATED);
    cy.get(`[data-testid^=ingredient-chip-][data-ingredient-name="${ORIGINAL}"]`)
      .should('not.exist');
  });

  it('cancels the edit and keeps the original chip label', () => {
    const ORIGINAL = 'Ingrédient Inchangé';
    const ATTEMPTED = 'Ce Nom Ne Doit Pas Être Sauvegardé';

    createNewIngredient(ORIGINAL);
    cy.get('[data-testid^=ingredient-chip-]')
      .first()
      .should('have.attr', 'data-ingredient-name', ORIGINAL);

    cy.get('[data-testid^=edit-ingredient-chip-]').first().click();
    cy.get('[data-testid=new-ingredient-dialog]', { timeout: 3000 }).should('exist');
    cy.get('[data-testid=ingredient-form-name]').clear().type(ATTEMPTED);
    cy.get('[data-testid=ingredient-form-reset]').click();
    cy.get('[data-testid=new-ingredient-dialog]').should('not.exist');

    cy.get('[data-testid^=ingredient-chip-]')
      .first()
      .should('have.attr', 'data-ingredient-name', ORIGINAL);
    cy.get(`[data-testid^=ingredient-chip-][data-ingredient-name="${ATTEMPTED}"]`)
      .should('not.exist');
  });
});

// ═══════════════════════════════════════════════════════════════
//  Journey — edit a just-created location, save and cancel
// ═══════════════════════════════════════════════════════════════

describe('Meal editor — edit a just-created location', () => {
  beforeEach(() => {
    openEditor();
    goToComposition();
    cy.get('[data-testid=ingredient-input]').type('arachide');
    cy.get('[data-testid^=ingredient-option-]', { timeout: 3000 }).first().click();
    goToPricing();
  });

  it('saves the edit and updates the chip label', () => {
    const ORIGINAL = 'Zone À Modifier';
    const UPDATED = 'Zone Modifiée';

    createNewLocation(ORIGINAL, 'Rue Test, Akwa');
    cy.get('[data-testid^=location-chip-]')
      .first()
      .should('have.attr', 'data-location-name', ORIGINAL);

    cy.get('[data-testid^=edit-location-chip-]').first().click();
    cy.get('[data-testid=new-location-dialog]', { timeout: 3000 }).should('exist');
    cy.get('[data-testid=location-form-name]').clear().type("0");
    cy.get('[data-testid=location-form-name]').clear().type(UPDATED);
    cy.get('[data-testid=location-form-submit]').click();
    cy.get('[data-testid=new-location-dialog]').should('not.exist');

    cy.get('[data-testid^=location-chip-]')
      .first()
      .should('have.attr', 'data-location-name', UPDATED);
    cy.get(`[data-testid^=location-chip-][data-location-name="${ORIGINAL}"]`)
      .should('not.exist');
  });

  it('cancels the edit and keeps the original chip label', () => {
    const ORIGINAL = 'Zone Inchangée';
    const ATTEMPTED = 'Ce Nom Ne Doit Pas Être Sauvegardé';

    createNewLocation(ORIGINAL, 'Rue Test, Akwa');
    cy.get('[data-testid^=location-chip-]')
      .first()
      .should('have.attr', 'data-location-name', ORIGINAL);

    cy.get('[data-testid^=edit-location-chip-]').first().click();
    cy.get('[data-testid=new-location-dialog]', { timeout: 3000 }).should('exist');
    cy.get('[data-testid=location-form-name]').clear().type(ATTEMPTED);
    cy.get('[data-testid=location-form-cancel]').click();
    cy.get('[data-testid=new-location-dialog]').should('not.exist');

    cy.get('[data-testid^=location-chip-]')
      .first()
      .should('have.attr', 'data-location-name', ORIGINAL);
    cy.get(`[data-testid^=location-chip-][data-location-name="${ATTEMPTED}"]`)
      .should('not.exist');
  });
});
