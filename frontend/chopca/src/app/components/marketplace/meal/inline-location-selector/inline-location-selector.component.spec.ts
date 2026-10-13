import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { InlineLocationSelectorComponent } from './inline-location-selector.component';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { City, LocationSummary } from '@app/core/models/marketplace';

const CITIES: City[] = [
  { id: 'city-douala', name: 'Douala', region: 'Littoral', countryCode: 'CM' } as City,
  { id: 'city-bamenda', name: 'Bamenda', region: 'Nord-Ouest', countryCode: 'CM' } as City,
];

const LOC_AKWA: LocationSummary = {
  id: 'loc-akwa',
  name: 'Akwa',
  city: { id: 'city-douala' } as any,
} as LocationSummary;

const LOC_BONAPRISO: LocationSummary = {
  id: 'loc-bonapriso',
  name: 'Bonapriso',
  city: { id: 'city-douala' } as any,
} as LocationSummary;

const LOC_BAMENDA: LocationSummary = {
  id: 'loc-commercial',
  name: 'Commercial Avenue',
  city: { id: 'city-bamenda' } as any,
} as LocationSummary;

describe('InlineLocationSelectorComponent', () => {
  let fixture: ComponentFixture<InlineLocationSelectorComponent>;
  let component: InlineLocationSelectorComponent;
  let cityServiceMock: jasmine.SpyObj<any>;
  let locationServiceMock: jasmine.SpyObj<any>;

  beforeEach(async () => {
    cityServiceMock = jasmine.createSpyObj('CityService', ['getCities']);
    cityServiceMock.getCities.and.returnValue(of(CITIES));

    locationServiceMock = jasmine.createSpyObj('LocationService', ['searchLocationsFlat']);
    locationServiceMock.searchLocationsFlat.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [InlineLocationSelectorComponent],
      providers: [
        { provide: CITY_SERVICE, useValue: cityServiceMock },
        { provide: LOCATION_SERVICE, useValue: locationServiceMock },
      ],
    }).compileComponents();
  });

  /**
   * Creates the component and applies the given inputs.
   * Safe to call once per test — `beforeEach` already configured
   * the TestBed.
   */
  function setup(inputs: {
    vendorId?: string | null;
    selectedCityId?: string | null;
    selectedLocationIds?: string[];
    maxLocations?: number;
  } = {}): void {
    fixture = TestBed.createComponent(InlineLocationSelectorComponent);
    component = fixture.componentInstance;

    if (inputs.vendorId !== undefined) fixture.componentRef.setInput('vendorId', inputs.vendorId);
    if (inputs.selectedCityId !== undefined) fixture.componentRef.setInput('selectedCityId', inputs.selectedCityId);
    if (inputs.selectedLocationIds !== undefined) fixture.componentRef.setInput('selectedLocationIds', inputs.selectedLocationIds);
    if (inputs.maxLocations !== undefined) fixture.componentRef.setInput('maxLocations', inputs.maxLocations);

    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders the city select', () => {
      setup();
      expect(query('[data-testid=inline-location-selector-city]')).toBeTruthy();
    });

    it('renders the chip input when below the cap', () => {
      setup();
      expect(query('[data-testid=inline-location-selector-input]')).toBeTruthy();
    });

    it('loads cities on init', () => {
      setup();
      const select = query('[data-testid=inline-location-selector-city]') as HTMLSelectElement;
      // 1 placeholder + 2 cities
      expect(select.options.length).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  City change
  // ═══════════════════════════════════════════════════════════

  describe('city change', () => {
    it('emits citySelected with the matching city', () => {
      setup();
      const spy = jasmine.createSpy('citySelected');
      component.citySelected.subscribe(spy);

      selectOption('[data-testid=inline-location-selector-city]', 'city-douala');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.calls.mostRecent().args[0].id).toBe('city-douala');
    });

    it('emits null when the placeholder is chosen', () => {
      setup({ selectedCityId: 'city-douala' });
      const spy = jasmine.createSpy('citySelected');
      component.citySelected.subscribe(spy);

      selectOption('[data-testid=inline-location-selector-city]', '');

      expect(spy.calls.mostRecent().args[0]).toBeNull();
    });

    it('does not emit when the same city is re-selected', () => {
      setup({ selectedCityId: 'city-douala' });
      const spy = jasmine.createSpy('citySelected');
      component.citySelected.subscribe(spy);

      selectOption('[data-testid=inline-location-selector-city]', 'city-douala');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Location search
  // ═══════════════════════════════════════════════════════════

  describe('location search', () => {
    it('calls the service with the trimmed keyword', fakeAsync(() => {
      setup();
      locationServiceMock.searchLocationsFlat.and.returnValue(of([]));

      typeInput('  akwa  ');
      tick(300);

      expect(locationServiceMock.searchLocationsFlat).toHaveBeenCalledTimes(1);
      const req = locationServiceMock.searchLocationsFlat.calls.mostRecent().args[0];
      expect(req.keyword).toBe('akwa');
    }));

    it('passes vendorId when set', fakeAsync(() => {
      setup({ vendorId: 'vendor-chaudron' });
      locationServiceMock.searchLocationsFlat.and.returnValue(of([]));

      typeInput('akwa');
      tick(300);
      fixture.detectChanges();

      const req = locationServiceMock.searchLocationsFlat.calls.mostRecent().args[0];
      expect(req.vendorId).toBe('vendor-chaudron');
    }));

    it('passes cityIds when a city is selected', fakeAsync(() => {
      setup({ selectedCityId: 'city-douala' });
      locationServiceMock.searchLocationsFlat.and.returnValue(of([]));

      typeInput('akwa');
      tick(300);

      const req = locationServiceMock.searchLocationsFlat.calls.mostRecent().args[0];
      expect(req.cityIds).toEqual(['city-douala']);
    }));

    it('renders the dropdown when results arrive', fakeAsync(() => {
      setup();
      locationServiceMock.searchLocationsFlat.and.returnValue(of([LOC_AKWA, LOC_BONAPRISO]));

      typeInput('a');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=inline-location-selector-dropdown]')).toBeTruthy();
      expect(query('[data-testid=inline-location-selector-option-loc-akwa]')).toBeTruthy();
    }));

    it('shows the empty state when no results match', fakeAsync(() => {
      setup();
      locationServiceMock.searchLocationsFlat.and.returnValue(of([]));

      typeInput('zzzzz');
      tick(300);
      fixture.detectChanges();

      expect(component['locationDropdownOpen']()).withContext("Expected the drop down to be open").toBeTruthy();
      expect(component['locationIsSearching']()).withContext("Expected the search being over").toBeFalsy();
      expect(component['availableResults']().length).withContext("Expected no availableResults").toBe(0);
      expect(component['locationInput']().trim()).withContext("Expected the value of the input to be set").toBe("zzzzz");

      expect(query('[data-testid=inline-location-selector-empty]')).withContext("Expected empty drop down").toBeTruthy();
      expect(query('[data-testid=inline-location-selector-dropdown]')).toBeFalsy();
    }));

    it('does not show the empty state while searching', fakeAsync(() => {
      setup();
      locationServiceMock.searchLocationsFlat.and.returnValue(of([]));

      typeInput('a');
      tick(0);
      fixture.detectChanges();

      expect(query('[data-testid=inline-location-selector-empty]')).toBeFalsy();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Selection
  // ═══════════════════════════════════════════════════════════

  describe('selection', () => {
    it('adds a location on option mousedown', fakeAsync(() => {
      setup();
      locationServiceMock.searchLocationsFlat.and.returnValue(of([LOC_AKWA]));

      const spy = jasmine.createSpy('locationsSelected');
      component.locationsSelected.subscribe(spy);

      typeInput('akwa');
      tick(300);
      fixture.detectChanges();

      const option = query('[data-testid=inline-location-selector-option-loc-akwa]') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.calls.mostRecent().args[0][0].id).toBe('loc-akwa');
    }));

    it('renders a chip after adding', fakeAsync(() => {
      setup();
      locationServiceMock.searchLocationsFlat.and.returnValue(of([LOC_AKWA]));

      typeInput('akwa');
      tick(300);
      fixture.detectChanges();

      const option = query('[data-testid=inline-location-selector-option-loc-akwa]') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(query('[data-testid=inline-location-selector-chip-loc-akwa]')).toBeTruthy();
    }));

    it('removes a location when its chip is clicked', () => {
      setup();
      component['locationCache'].set(new Map([[LOC_AKWA.id, LOC_AKWA]]));
      component['selectedIds'].set([LOC_AKWA.id]);
      fixture.detectChanges();

      const spy = jasmine.createSpy('locationsSelected');
      component.locationsSelected.subscribe(spy);

      const removeBtn = query('[data-testid=inline-location-selector-remove-loc-akwa]') as HTMLElement;
      removeBtn.click();
      fixture.detectChanges();

      expect(spy.calls.mostRecent().args[0]).toEqual([]);
      expect(query('[data-testid=inline-location-selector-chip-loc-akwa]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Cap
  // ═══════════════════════════════════════════════════════════

  describe('max selection cap', () => {
    it('hides the input when at the cap', () => {
      setup({ selectedLocationIds: ['loc-akwa', 'loc-bonapriso'] });
      // Seed the cache so chips resolve.
      component['locationCache'].set(new Map([
        [LOC_AKWA.id, LOC_AKWA],
        [LOC_BONAPRISO.id, LOC_BONAPRISO],
      ]));
      fixture.detectChanges();

      expect(query('[data-testid=inline-location-selector-input]')).toBeFalsy();
    });

    it('does not add a location past the cap', () => {
      setup({ selectedLocationIds: ['loc-akwa', 'loc-bonapriso'] });
      component['locationCache'].set(new Map([
        [LOC_AKWA.id, LOC_AKWA],
        [LOC_BONAPRISO.id, LOC_BONAPRISO],
      ]));
      fixture.detectChanges();

      const spy = jasmine.createSpy('locationsSelected');
      component.locationsSelected.subscribe(spy);

      component['addLocation'](LOC_BAMENDA);

      expect(spy).not.toHaveBeenCalled();
    });

    it('respects a custom maxLocations', () => {
      setup({ maxLocations: 1, selectedLocationIds: ['loc-akwa'] });
      component['locationCache'].set(new Map([[LOC_AKWA.id, LOC_AKWA]]));
      fixture.detectChanges();

      expect(component['atLimit']()).toBeTrue();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  City-change pruning
  // ═══════════════════════════════════════════════════════════

  describe('city-change pruning', () => {
    it('removes selected locations that do not belong to the new city', () => {
      setup({
        selectedCityId: 'city-douala',
        selectedLocationIds: ['loc-akwa'],
      });
      component['locationCache'].set(new Map([[LOC_AKWA.id, LOC_AKWA]]));
      fixture.detectChanges();

      const spy = jasmine.createSpy('locationsSelected');
      component.locationsSelected.subscribe(spy);

      selectOption('[data-testid=inline-location-selector-city]', 'city-bamenda');
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
      expect(spy.calls.mostRecent().args[0]).toEqual([]);
    });

    it('keeps locations that belong to the new city', () => {
      setup({
        selectedCityId: null,
        selectedLocationIds: ['loc-akwa'],
      });
      component['locationCache'].set(new Map([[LOC_AKWA.id, LOC_AKWA]]));
      fixture.detectChanges();

      const spy = jasmine.createSpy('locationsSelected');
      component.locationsSelected.subscribe(spy);

      selectOption('[data-testid=inline-location-selector-city]', 'city-douala');
      fixture.detectChanges();

      // The list didn't shrink → no emit.
      expect(spy).not.toHaveBeenCalled();
    });

    it('does not prune when the city is cleared', () => {
      setup({
        selectedCityId: 'city-douala',
        selectedLocationIds: ['loc-akwa'],
      });
      component['locationCache'].set(new Map([[LOC_AKWA.id, LOC_AKWA]]));
      fixture.detectChanges();

      const spy = jasmine.createSpy('locationsSelected');
      component.locationsSelected.subscribe(spy);

      selectOption('[data-testid=inline-location-selector-city]', '');
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Error handling
  // ═══════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('shows no dropdown when the service errors', fakeAsync(() => {
      setup();
      const consoleSpy = spyOn(console, 'error');
      locationServiceMock.searchLocationsFlat.and.returnValue(
        throwError(() => new Error('boom')),
      );

      typeInput('akwa');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=inline-location-selector-dropdown]')).toBeFalsy();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function typeInput(value: string): void {
    const el = query('[data-testid=inline-location-selector-input]') as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function selectOption(sel: string, value: string): void {
    const el = query(sel) as HTMLSelectElement;
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
});
