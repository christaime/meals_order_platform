import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { CATEGORY_SERVICE } from '@app/core/services/marketplace';
import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import { Category, IngredientSummary } from '@app/core/models/marketplace';

import {
  AdvancedFilterDrawerComponent,
  DEFAULT_FILTERS,
  FilterState,
  FilterSelection,
} from './advanced-filter-drawer.component';

const CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Camerounaise', iconUrl: 'flag' }   as Category,
  { id: 'cat-2', name: 'Africaine',    iconUrl: 'public' } as Category,
  { id: 'cat-3', name: 'Italienne',    iconUrl: 'pizza' }  as Category,
];

const INGREDIENTS: IngredientSummary[] = [
  { id: 'ing-arachide', name: 'Arachide', isAllergen: true,  moderationStatus: 'APPROVED' },
  { id: 'ing-lait',     name: 'Lait',     isAllergen: true,  moderationStatus: 'APPROVED' },
  { id: 'ing-soja',     name: 'Soja',     isAllergen: false, moderationStatus: 'APPROVED' },
];

const EMPTY_PAGE = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

describe('AdvancedFilterDrawerComponent', () => {
  let fixture: ComponentFixture<AdvancedFilterDrawerComponent>;
  let component: AdvancedFilterDrawerComponent;
  let categoryServiceMock: jasmine.SpyObj<any>;
  let ingredientServiceMock: jasmine.SpyObj<any>;

  beforeEach(async () => {
    categoryServiceMock = jasmine.createSpyObj('CategoryService', ['searchCategories']);
    categoryServiceMock.searchCategories.and.returnValue(
      of({ content: CATEGORIES, page: 0, size: 100, totalElements: 3, totalPages: 1 }),
    );

    // The autocomplete calls searchIngredientsFlat, not search.
    ingredientServiceMock = jasmine.createSpyObj('IngredientService', [
      'searchIngredientsFlat',
      'searchIngredients',
      'getIngredientsByIds',
    ]);
    ingredientServiceMock.searchIngredientsFlat.and.returnValue(of([]));
    ingredientServiceMock.searchIngredients.and.returnValue(of(EMPTY_PAGE));
    ingredientServiceMock.getIngredientsByIds.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AdvancedFilterDrawerComponent, ReactiveFormsModule],
      providers: [
        { provide: CATEGORY_SERVICE, useValue: categoryServiceMock },
        { provide: INGREDIENT_SERVICE, useValue: ingredientServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvancedFilterDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════
  //  Open / close
  // ═══════════════════════════════════════════════════════════

  describe('open/close', () => {
    it('does not render the drawer until opened', () => {
      expect(query('[data-testid=advanced-filter-drawer]')).toBeFalsy();
    });

    it('renders the drawer after the trigger is clicked', () => {
      openDrawer();
      expect(query('[data-testid=advanced-filter-drawer]')).toBeTruthy();
    });

    it('closes the drawer on the close button click', () => {
      openDrawer();
      click('[data-testid=advanced-filter-close]');
      expect(query('[data-testid=advanced-filter-drawer]')).toBeFalsy();
    });

    it('closes the drawer on backdrop click', () => {
      openDrawer();
      click('[data-testid=advanced-filter-backdrop]');
      expect(query('[data-testid=advanced-filter-drawer]')).toBeFalsy();
    });

    it('closes the drawer on Escape', () => {
      openDrawer();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(query('[data-testid=advanced-filter-drawer]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Initialization from initialFilter / initialSelection
  // ═══════════════════════════════════════════════════════════

  describe('initialization', () => {
    it('merges the initialFilter over the defaults', () => {
      fixture.componentRef.setInput('initialFilter', {
        minPrice: 5000,
        maxPrepTime: 30,
      } as FilterState);
      fixture.detectChanges();

      openDrawer();

      expect(draftFilters().minPrice).toBe(5000);
      expect(draftFilters().maxPrepTime).toBe(30);
      // Fields not in initialFilter stay at their default sentinel.
      expect(draftFilters().maxPrice).toBe(DEFAULT_FILTERS.maxPrice);
      expect(draftFilters().minRating).toBe(DEFAULT_FILTERS.minRating);
    });

    it('seeds the selected entities from initialSelection on open', () => {
      fixture.componentRef.setInput('initialSelection', {
        cuisines: [CATEGORIES[0]],
        dishTypes: [],
        ingredients: [INGREDIENTS[0]],
      } as FilterSelection);
     // Set the filter because they have to be in sync
      fixture.componentRef.setInput('initialFilter', {
            cuisineIds: [CATEGORIES[0].id],
            dishTypeIds: [],
            excludeIngredientIds: [INGREDIENTS[0].id],
          } as FilterState);

      fixture.detectChanges();

      openDrawer();
      console.log("draftSelection() ", draftSelection());
      expect(draftSelection().dishTypes.length).withContext("Check the number of dish").toBe(0);
      expect(draftSelection().ingredients.length).withContext("Check the number of excluded ingredients").toBe(1);
      expect(draftSelection().cuisines.length).withContext("Check the number of cuisines").toBe(1);

    });

    it('seeds the cuisine / dish-type form controls so pills render selected', () => {
      fixture.componentRef.setInput('initialFilter', {
        cuisineIds: ['cat-1'],
        dishTypeIds: ['cat-2'],
      } as FilterState);
      fixture.detectChanges();

      openDrawer();

      expect(component['cuisineControl'].value).toEqual(['cat-1']);
      expect(component['dishTypeControl'].value).toEqual(['cat-2']);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Draft editing — nothing emitted
  // ═══════════════════════════════════════════════════════════

  describe('draft editing', () => {
    it('updates the draft min price on slider input', () => {
      openDrawer();
      setSlider('[data-testid=advanced-filter-min-price]', 3000);
      expect(draftFilters().minPrice).toBe(3000);
    });

    it('updates the draft max price on slider input', () => {
      openDrawer();
      setSlider('[data-testid=advanced-filter-max-price]', 8000);
      expect(draftFilters().maxPrice).toBe(8000);
    });

    it('updates the draft prep time', () => {
      openDrawer();
      setSlider('[data-testid=advanced-filter-max-prep-time]', 45);
      expect(draftFilters().maxPrepTime).toBe(45);
    });

    it('sets the rating when a rating button is clicked', () => {
      openDrawer();
      click('[data-testid=advanced-filter-rating-4]');
      expect(draftFilters().minRating).toBe(4);
    });

    it('does not emit applyFilters while editing', () => {
      const spy = jasmine.createSpy('applyFilters');
      component.applyFilters.subscribe(spy);

      openDrawer();
      setSlider('[data-testid=advanced-filter-min-price]', 3000);
      click('[data-testid=advanced-filter-rating-4]');

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not emit applySelection while editing', () => {
      const spy = jasmine.createSpy('applySelection');
      component.applySelection.subscribe(spy);

      openDrawer();
      setSlider('[data-testid=advanced-filter-max-price]', 8000);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Apply — the only commit point
  // ═══════════════════════════════════════════════════════════

  describe('apply', () => {
    it('emits applyFilters with the current draft state', () => {
      const spy = jasmine.createSpy('applyFilters');
      component.applyFilters.subscribe(spy);

      openDrawer();
      setSlider('[data-testid=advanced-filter-min-price]', 3000);
      click('[data-testid=advanced-filter-rating-4]');
      click('[data-testid=advanced-filter-apply]');

      expect(spy).toHaveBeenCalledTimes(1);
      const emitted: FilterState = spy.calls.mostRecent().args[0];
      expect(emitted.minPrice).toBe(3000);
      expect(emitted.minRating).toBe(4);
    });

    it('emits applySelection on apply', () => {
      const spy = jasmine.createSpy('applySelection');
      component.applySelection.subscribe(spy);

      openDrawer();
      click('[data-testid=advanced-filter-apply]');

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('emits BOTH outputs on a single apply click', () => {
      const filtersSpy = jasmine.createSpy('applyFilters');
      const selectionSpy = jasmine.createSpy('applySelection');
      component.applyFilters.subscribe(filtersSpy);
      component.applySelection.subscribe(selectionSpy);

      openDrawer();
      click('[data-testid=advanced-filter-apply]');

      expect(filtersSpy).toHaveBeenCalledTimes(1);
      expect(selectionSpy).toHaveBeenCalledTimes(1);
    });

    it('emits the draft values on apply (not the initial values)', () => {
      fixture.componentRef.setInput('initialFilter', {
        minPrice: 5000,
      } as FilterState);
      fixture.detectChanges();

      const spy = jasmine.createSpy('applyFilters');
      component.applyFilters.subscribe(spy);

      openDrawer();
      setSlider('[data-testid=advanced-filter-min-price]', 9000);
      click('[data-testid=advanced-filter-apply]');

      const emitted: FilterState = spy.calls.mostRecent().args[0];
      expect(emitted.minPrice).toBe(9000);
    });

    it('closes the drawer after applying', () => {
      openDrawer();
      click('[data-testid=advanced-filter-apply]');
      expect(query('[data-testid=advanced-filter-drawer]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Clear all — set every draft to empty, do NOT emit
  // ═══════════════════════════════════════════════════════════

  describe('clear all', () => {
    it('clears the draft filters back to empty', () => {
      openDrawer();
      setSlider('[data-testid=advanced-filter-min-price]', 5000);
      click('[data-testid=clear-all-advanced-filter]');

      expect(draftFilters().minPrice).toBeUndefined();
      expect(draftFilters().maxPrice).toBeUndefined();
      expect(draftFilters().maxPrepTime).toBeUndefined();
      // minRating's sentinel is 0, not undefined — assert against the constant.
      expect(draftFilters().minRating).toBe(DEFAULT_FILTERS.minRating);
    });

    it('clears the draft selection', () => {
      fixture.componentRef.setInput('initialSelection', {
        cuisines: [CATEGORIES[0]],
        dishTypes: [],
        ingredients: [INGREDIENTS[0]],
      } as FilterSelection);
      fixture.detectChanges();

      openDrawer();
      click('[data-testid=clear-all-advanced-filter]');

      expect(draftSelection().cuisines).toEqual([]);
      expect(draftSelection().ingredients).toEqual([]);
    });

    it('clears the cuisine and dish-type form controls', () => {
      openDrawer();
      component['onCuisinesSelected']([CATEGORIES[0]]);
      component['onDishTypesSelected']([CATEGORIES[1]]);
      click('[data-testid=clear-all-advanced-filter]');

      expect(component['cuisineControl'].value).toEqual([]);
      expect(component['dishTypeControl'].value).toEqual([]);
    });

    it('does not emit applyFilters on clear all', () => {
      const spy = jasmine.createSpy('applyFilters');
      component.applyFilters.subscribe(spy);

      openDrawer();
      setSlider('[data-testid=advanced-filter-min-price]', 5000);
      click('[data-testid=clear-all-advanced-filter]');

      expect(spy).not.toHaveBeenCalled();
    });

    it('does not emit applySelection on clear all', () => {
      const spy = jasmine.createSpy('applySelection');
      component.applySelection.subscribe(spy);

      openDrawer();
      setSlider('[data-testid=advanced-filter-min-price]', 5000);
      click('[data-testid=clear-all-advanced-filter]');

      expect(spy).not.toHaveBeenCalled();
    });

    it('commits the cleared state on the next Apply', () => {
      fixture.componentRef.setInput('initialFilter', { minPrice: 5000 } as FilterState);
      fixture.detectChanges();

      const spy = jasmine.createSpy('applyFilters');
      component.applyFilters.subscribe(spy);

      openDrawer();
      click('[data-testid=clear-all-advanced-filter]');
      click('[data-testid=advanced-filter-apply]');

      const emitted: FilterState = spy.calls.mostRecent().args[0];
      expect(emitted.minPrice).toBeUndefined();
      expect(emitted.minRating).toBe(DEFAULT_FILTERS.minRating);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function openDrawer(): void {
    click('[data-testid=advanced-filter-trigger]');
  }

  function draftFilters(): FilterState {
    return component['draftFilters']();
  }

  function draftSelection(): FilterSelection {
    return component['draftSelection']();
  }

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function click(selector: string): void {
    const el = query(selector);
    expect(el).withContext(`Element to click on was not found: ${selector}`).toBeTruthy();
    el?.click();
    fixture.detectChanges();
  }

  function setSlider(selector: string, value: number): void {
    const el = query(selector) as HTMLInputElement;
    el.value = String(value);
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
});
