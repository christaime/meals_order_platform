import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { MealFiltersComponent, MealFiltersValue } from './meal-filters.component';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { City, LocationSummary } from '@app/core/models/marketplace';

const CITIES: City[] = [
  { id: 'city-douala', name: 'Douala', region: 'Littoral', countryCode: 'CM' } as City,
  { id: 'city-bamenda', name: 'Bamenda', region: 'Nord-Ouest', countryCode: 'CM' } as City,
];

const LOCATIONS: LocationSummary[] = [
  { id: 'loc-akwa', name: 'Akwa', city: { id: 'city-douala' } as any } as LocationSummary,
];

describe('MealFiltersComponent', () => {
  let fixture: ComponentFixture<MealFiltersComponent>;
  let component: MealFiltersComponent;
  let cityServiceMock: jasmine.SpyObj<any>;
  let locationServiceMock: jasmine.SpyObj<any>;

  async function setup(inputs: {
    name?: string;
    moderationStatus?: any;
    distributionLocationIds?: string[];
    sort?: any;
    vendorId?: string | null;
  } = {}): Promise<void> {
    cityServiceMock = jasmine.createSpyObj('CityService', ['getCities']);
    cityServiceMock.getCities.and.returnValue(of(CITIES));

    locationServiceMock = jasmine.createSpyObj('LocationService', ['searchLocationsFlat']);
    locationServiceMock.searchLocationsFlat.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [MealFiltersComponent],
      providers: [
        { provide: CITY_SERVICE, useValue: cityServiceMock },
        { provide: LOCATION_SERVICE, useValue: locationServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MealFiltersComponent);
    component = fixture.componentInstance;

    if (inputs.name !== undefined) fixture.componentRef.setInput('name', inputs.name);
    if (inputs.moderationStatus !== undefined) fixture.componentRef.setInput('moderationStatus', inputs.moderationStatus);
    if (inputs.distributionLocationIds !== undefined) fixture.componentRef.setInput('distributionLocationIds', inputs.distributionLocationIds);
    if (inputs.sort !== undefined) fixture.componentRef.setInput('sort', inputs.sort);
    if (inputs.vendorId !== undefined) fixture.componentRef.setInput('vendorId', inputs.vendorId);

    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders the name input', async () => {
      await setup();
      expect(query('[data-testid=meal-filters-name-input]')).toBeTruthy();
    });

    it('renders the status select', async () => {
      await setup();
      expect(query('[data-testid=meal-filters-status-select]')).toBeTruthy();
    });

    it('renders the location selector', async () => {
      await setup();
      expect(query('app-inline-location-selector')).toBeTruthy();
    });

    it('renders the sort select', async () => {
      await setup();
      expect(query('[data-testid=meal-filters-sort-select]')).toBeTruthy();
    });

    it('seeds the name draft from the input', async () => {
      await setup({ name: 'taro' });
      const input = query('[data-testid=meal-filters-name-input]') as HTMLInputElement;
      expect(input.value).toBe('taro');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Name filter
  // ═══════════════════════════════════════════════════════════

  describe('name filter', () => {
    it('emits on Enter with the trimmed keyword', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      typeName('  taro  ');
      pressEnter('[data-testid=meal-filters-name-input]');

      expect(spy).toHaveBeenCalledTimes(1);
      expect((spy.calls.mostRecent().args[0] as MealFiltersValue).name).toBe('taro');
    });

    it('emits on blur with the trimmed keyword', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      typeName('taro');
      blur('[data-testid=meal-filters-name-input]');

      expect(spy).toHaveBeenCalledTimes(1);
      expect((spy.calls.mostRecent().args[0] as MealFiltersValue).name).toBe('taro');
    });

    it('does not emit on typing alone', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      typeName('taro');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Status filter
  // ═══════════════════════════════════════════════════════════

  describe('status filter', () => {
    it('emits the selected status', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      selectOption('[data-testid=meal-filters-status-select]', 'PENDING');

      expect(spy).toHaveBeenCalledTimes(1);
      expect((spy.calls.mostRecent().args[0] as MealFiltersValue).moderationStatus).toBe('PENDING');
    });

    it('emits ALL when the placeholder is chosen', async () => {
      await setup({ moderationStatus: 'APPROVED' });
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      selectOption('[data-testid=meal-filters-status-select]', 'ALL');

      expect((spy.calls.mostRecent().args[0] as MealFiltersValue).moderationStatus).toBe('ALL');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Sort
  // ═══════════════════════════════════════════════════════════

  describe('sort', () => {
    it('emits the selected sort option', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      selectOption('[data-testid=meal-filters-sort-select]', 'price-asc');

      expect((spy.calls.mostRecent().args[0] as MealFiltersValue).sort).toBe('price-asc');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Location selector integration
  // ═══════════════════════════════════════════════════════════

  describe('location selector integration', () => {
    it('emits distributionLocationIds when the selector emits locations', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      component['onLocationsSelected']([
        { id: 'loc-akwa', name: 'Akwa' } as LocationSummary,
        { id: 'loc-bonapriso', name: 'Bonapriso' } as LocationSummary,
      ]);

      const emitted = spy.calls.mostRecent().args[0] as MealFiltersValue;
      expect(emitted.distributionLocationIds).toEqual(['loc-akwa', 'loc-bonapriso']);
    });

    it('emits an empty list when all locations are removed', async () => {
      await setup({ distributionLocationIds: ['loc-akwa'] });
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      component['onLocationsSelected']([]);

      expect((spy.calls.mostRecent().args[0] as MealFiltersValue).distributionLocationIds).toEqual([]);
    });

    it('does not emit on city change', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      component['onCitySelected'](CITIES[0]);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Advanced drawer integration
  // ═══════════════════════════════════════════════════════════

  describe('advanced drawer integration', () => {
    it('emits the advanced filter state on apply', async () => {
      await setup();
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      component['onAdvancedChange']({
        minPrice: 3000,
        maxPrice: 8000,
        cuisineIds: ['cuisine-camerounaise'],
      } as any);

      const emitted = spy.calls.mostRecent().args[0] as MealFiltersValue;
      expect(emitted.advanced.minPrice).toBe(3000);
      expect(emitted.advanced.maxPrice).toBe(8000);
      expect(emitted.advanced.cuisineIds).toEqual(['cuisine-camerounaise']);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Combined emit
  // ═══════════════════════════════════════════════════════════

  describe('combined emit', () => {
    it('emits every field on a single change', async () => {
      await setup({
        name: 'taro',
        moderationStatus: 'APPROVED',
        distributionLocationIds: ['loc-akwa'],
        sort: 'price-asc',
      });
      const spy = jasmine.createSpy('filtersChange');
      component.filtersChange.subscribe(spy);

      selectOption('[data-testid=meal-filters-status-select]', 'PENDING');

      const emitted = spy.calls.mostRecent().args[0] as MealFiltersValue;
      expect(emitted.name).toBe('taro');
      expect(emitted.moderationStatus).toBe('PENDING');
      expect(emitted.distributionLocationIds).toEqual(['loc-akwa']);
      expect(emitted.sort).toBe('price-asc');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function typeName(value: string): void {
    const el = query('[data-testid=meal-filters-name-input]') as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function pressEnter(sel: string): void {
    const el = query(sel) as HTMLElement;
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
  }

  function blur(sel: string): void {
    const el = query(sel) as HTMLElement;
    el.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

  function selectOption(sel: string, value: string): void {
    const el = query(sel) as HTMLSelectElement;
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
});
