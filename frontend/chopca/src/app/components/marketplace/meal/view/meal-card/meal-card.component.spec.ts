import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { MealCardComponent } from './meal-card.component';
import { MealSummary } from '@core/models/marketplace';

describe('MealCardComponent', () => {
  let fixture: ComponentFixture<MealCardComponent>;
  let component: MealCardComponent;

  const MEAL: MealSummary = {
    id: 'meal-42',
    name: 'Taro sauce jaune',
    description: 'Un plat traditionnel camerounais',
    price: 4500,
    imageUrl: 'https://example.com/taro.jpg',
    vendorId: 'vendor-1',
    vendorBusinessName: 'Le Chaudron',
    averageRating: 4.5,
    totalRatings: 20,
    prepTimeMinutes: 60,
    moderationStatus: 'APPROVED',
    cuisines: [{ id: 'c1', name: 'Camerounaise', iconUrl: null } as any],
    dishTypes: [],
    isAvailable: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MealCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('meal', MEAL);
    fixture.detectChanges();
  });

  describe('rendering', () => {
    it('renders the meal name', () => {
      expect(text('[data-testid=meal-card-name]')).toBe('Taro sauce jaune');
    });

    it('renders the vendor business name', () => {
      expect(text('[data-testid=meal-card-vendor]')).toBe('Le Chaudron');
    });

    it('renders the cuisine badge when cuisines are present', () => {
      expect(query('[data-testid=meal-card-cuisine]')).toBeTruthy();
    });

    it('renders the description when present', () => {
      expect(query('[data-testid=meal-card-description]')).toBeTruthy();
    });

    it('renders the prep time row when present', () => {
      expect(query('[data-testid=meal-card-prep-time]')).toBeTruthy();
    });

    it('does not render the unavailable badge when the meal is available', () => {
      expect(query('[data-testid=meal-card-unavailable]')).toBeFalsy();
    });

    it('renders the unavailable badge when the meal is not available', () => {
      fixture.componentRef.setInput('meal', { ...MEAL, isAvailable: false });
      fixture.detectChanges();
      expect(query('[data-testid=meal-card-unavailable]')).toBeTruthy();
    });
  });

  describe('readonly mode', () => {
    it('hides the order and details buttons when readonly', () => {
      fixture.componentRef.setInput('readonly', true);
      fixture.detectChanges();
      expect(query('[data-testid=meal-card-order]')).toBeFalsy();
      expect(query('[data-testid=meal-card-details]')).toBeFalsy();
    });

    it('hides the quick-add button when readonly', () => {
      fixture.componentRef.setInput('readonly', true);
      fixture.detectChanges();
      expect(query('[data-testid=meal-card-quick-add]')).toBeFalsy();
    });

    it('shows the buttons in the default mode', () => {
      expect(query('[data-testid=meal-card-order]')).toBeTruthy();
      expect(query('[data-testid=meal-card-details]')).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('emits addToCart when the order button is clicked', () => {
      const spy = jasmine.createSpy('addToCart');
      component.addToCart.subscribe(spy);

      click('[data-testid=meal-card-order]');

      expect(spy).toHaveBeenCalledOnceWith(MEAL);
    });

    it('emits addToCart when the quick-add button is clicked', () => {
      const spy = jasmine.createSpy('addToCart');
      component.addToCart.subscribe(spy);

      click('[data-testid=meal-card-quick-add]');

      expect(spy).toHaveBeenCalledOnceWith(MEAL);
    });

    it('does not emit addToCart when the meal is unavailable', () => {
      fixture.componentRef.setInput('meal', { ...MEAL, isAvailable: false });
      fixture.detectChanges();

      const spy = jasmine.createSpy('addToCart');
      component.addToCart.subscribe(spy);

      // The order button is disabled; clicking it does nothing.
      click('[data-testid=meal-card-order]');

      expect(spy).not.toHaveBeenCalled();
    });

    it('emits viewDetails when the details button is clicked', () => {
      const spy = jasmine.createSpy('viewDetails');
      component.viewDetails.subscribe(spy);

      click('[data-testid=meal-card-details]');
      expect(spy).toHaveBeenCalledOnceWith(MEAL);
    });

    it('emits viewDetails when the card is clicked', () => {
      const spy = jasmine.createSpy('viewDetails');
      component.viewDetails.subscribe(spy);

      click(`[data-testid=meal-card-${MEAL.id}]`);

      expect(spy).toHaveBeenCalledOnceWith(MEAL);
    });

    it('does not emit viewDetails when readonly and the card is clicked', () => {
      fixture.componentRef.setInput('readonly', true);
      fixture.detectChanges();

      const spy = jasmine.createSpy('viewDetails');
      component.viewDetails.subscribe(spy);

      click(`[data-testid=meal-card-${MEAL.id}]`);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ─── Helpers ───
  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }
  function text(sel: string): string {
    return query(sel)?.textContent?.trim() ?? '';
  }
  function click(sel: string): void {
    const el = query(sel);
    expect(el).toBeTruthy("Element to click on was not found "+ sel);
    el?.click();
    fixture.detectChanges();
  }
});
