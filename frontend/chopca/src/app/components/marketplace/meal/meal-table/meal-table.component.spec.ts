import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealTableComponent } from './meal-table.component';
import { MealSummary } from '@app/core/models/marketplace';
import { IconComponent, BadgeComponent } from '@components/shared';

const MEAL_A: MealSummary = {
  id: 'meal-taro',
  name: 'Taro sauce jaune',
  description: 'Taro frais',
  price: 4500,
  imageUrl: null,
  averageRating: 4.5,
  totalRatings: 20,
  prepTimeMinutes: 120,
  isAvailable: true,
  moderationStatus: 'APPROVED',
  vendorId: 'vendor-chaudron',
  vendorBusinessName: 'Le Chaudron du bon gout',
  cuisines: [{ id: 'cuisine-camerounaise', name: 'Camerounaise' } as any],
  dishTypes: [{ id: 'dish-main', name: 'Plat de résistance' } as any],
  ingredientCount: 3,
  allergenIngredientCount: 1,
  distributionLocationCount: 2,
} as MealSummary;

const MEAL_B: MealSummary = { ...MEAL_A, id: 'meal-ndole', name: 'Ndolé', price: 5000 };

describe('MealTableComponent', () => {
  let fixture: ComponentFixture<MealTableComponent>;
  let component: MealTableComponent;

  async function setup(inputs: {
    meals?: MealSummary[];
    loading?: boolean;
    editingId?: string | null;
    scope?: 'vendor' | 'admin';
  } = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [MealTableComponent, IconComponent, BadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MealTableComponent);
    component = fixture.componentInstance;

    if (inputs.meals !== undefined) fixture.componentRef.setInput('meals', inputs.meals);
    if (inputs.loading !== undefined) fixture.componentRef.setInput('loading', inputs.loading);
    if (inputs.editingId !== undefined) fixture.componentRef.setInput('editingId', inputs.editingId);
    if (inputs.scope !== undefined) fixture.componentRef.setInput('scope', inputs.scope);

    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders one row per meal', async () => {
      await setup({ meals: [MEAL_A, MEAL_B], scope: 'vendor' });
      expect(queryAll('[data-testid^=meal-table-row-]').length).toBe(2);
    });

    it('sets data-meal-id on each row', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      const row = query('[data-testid=meal-table-row-meal-taro]');
      expect(row!.getAttribute('data-meal-id')).toBe('meal-taro');
    });

    it('shows the loading row when loading', async () => {
      await setup({ loading: true, meals: [], scope: 'vendor' });
      expect(query('[data-testid=meal-table-loading]')).toBeTruthy();
      expect(queryAll('[data-testid^=meal-table-row-]').length).toBe(0);
    });

    it('shows the empty row when no meals', async () => {
      await setup({ loading: false, meals: [], scope: 'vendor' });
      expect(query('[data-testid=meal-table-empty]')).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Cells
  // ═══════════════════════════════════════════════════════════

  describe('cells', () => {
    it('renders the meal name', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      expect(query('[data-testid=meal-table-name]')!.textContent).toContain('Taro sauce jaune');
    });

    it('exposes the price as a data attribute', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      const price = query('[data-testid=meal-table-price]');
      expect(price!.getAttribute('data-amount')).toBe('4500');
    });

    it('exposes the ingredient and allergen counts', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      const ing = query('[data-testid=meal-table-ingredient-count]');
      expect(ing!.getAttribute('data-ingredient-count')).toBe('3');
      expect(ing!.getAttribute('data-allergen-count')).toBe('1');
    });

    it('exposes the location count', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      const loc = query('[data-testid=meal-table-location-count]');
      expect(loc!.getAttribute('data-location-count')).toBe('2');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Scope — vendor
  // ═══════════════════════════════════════════════════════════

  describe('vendor scope', () => {
    it('renders edit and delete buttons', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      expect(query('[data-testid=meal-table-edit-meal-taro]')).toBeTruthy();
      expect(query('[data-testid=meal-table-delete-meal-taro]')).toBeTruthy();
      expect(query('[data-testid=meal-table-select-meal-taro]')).toBeFalsy();
    });

    it('emits edit on click', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      const spy = jasmine.createSpy('edit');
      component.edit.subscribe(spy);
      click('[data-testid=meal-table-edit-meal-taro]');
      expect(spy).toHaveBeenCalledOnceWith(MEAL_A);
    });

    it('emits delete on click', async () => {
      await setup({ meals: [MEAL_A], scope: 'vendor' });
      const spy = jasmine.createSpy('delete');
      component.delete.subscribe(spy);
      click('[data-testid=meal-table-delete-meal-taro]');
      expect(spy).toHaveBeenCalledOnceWith(MEAL_A);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Scope — admin
  // ═══════════════════════════════════════════════════════════

  describe('admin scope', () => {
    it('renders the select button only', async () => {
      await setup({ meals: [MEAL_A], scope: 'admin' });
      expect(query('[data-testid=meal-table-select-meal-taro]')).toBeTruthy();
      expect(query('[data-testid=meal-table-edit-meal-taro]')).toBeFalsy();
      expect(query('[data-testid=meal-table-delete-meal-taro]')).toBeFalsy();
    });

    it('emits select on click', async () => {
      await setup({ meals: [MEAL_A], scope: 'admin' });
      const spy = jasmine.createSpy('select');
      component.select.subscribe(spy);
      click('[data-testid=meal-table-select-meal-taro]');
      expect(spy).toHaveBeenCalledOnceWith(MEAL_A);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function queryAll(sel: string): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll(sel)];
  }

  function click(sel: string): void {
    const el = query(sel);
    expect(el).withContext('not found: ' + sel).toBeTruthy();
    el!.click();
    fixture.detectChanges();
  }
});
