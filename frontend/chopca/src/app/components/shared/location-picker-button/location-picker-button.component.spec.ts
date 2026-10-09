import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

import { LocationPickerButtonComponent } from './location-picker-button.component';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { City, Location } from '@app/core/models/marketplace';
import { LocationPickerComponent, PickerPoint } from '../location-picker/location-picker.component';
import { IconComponent } from '@components/shared';
import { LOCATION_SERVICE } from '@core/services/marketplace/location.service';

describe('LocationPickerButtonComponent', () => {
  let fixture: ComponentFixture<LocationPickerButtonComponent>;
  let component: LocationPickerButtonComponent;
  let cityServiceMock: jasmine.SpyObj<any>;
  let locationServiceMock: jasmine.SpyObj<any>;

  const CITIES: City[] = [
    { id: 'city-douala', name: 'Douala', region: 'Littoral' } as City,
    { id: 'city-yaounde', name: 'Yaoundé', region: 'Centre' } as City,
  ];

  const LOCATIONS: Location[] = [
    { "id": "loc-akwa",        "vendorId": "vendor-chaudron",   "vendorBusinessName": "Le Chaudron du bon gout", "name": "Akwa",        "address": "Rue Joss, Akwa",        "phone": "+237690000001", "latitude": 4.0480, "longitude": 9.7040, "deliveryRadius": 5,  "cityId": "city-douala",     "city": { "id": "city-douala",     "name": "Douala",     "region": "Littoral",     "countryCode": "CM" }, "moderationStatus": "APPROVED", "isActive": true, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
    { "id": "loc-bonapriso",   "vendorId": "vendor-chaudron",   "vendorBusinessName": "Le Chaudron du bon gout", "name": "Bonapriso",   "address": "Rue Njo-Njo, Bonapriso", "phone": "+237690000002", "latitude": 4.0320, "longitude": 9.7010, "deliveryRadius": 8,  "cityId": "city-douala",     "city": { "id": "city-douala",     "name": "Douala",     "region": "Littoral",     "countryCode": "CM" }, "moderationStatus": "APPROVED", "isActive": true, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" },
    { "id": "loc-bonanjo",     "vendorId": "vendor-chaudron",   "vendorBusinessName": "Le Chaudron du bon gout", "name": "Bonanjo",     "address": "Boulevard de la Liberté", "phone": "+237690000003", "latitude": 4.0430, "longitude": 9.6870, "deliveryRadius": 5,  "cityId": "city-douala",     "city": { "id": "city-douala",     "name": "Douala",     "region": "Littoral",     "countryCode": "CM" }, "moderationStatus": "APPROVED", "isActive": true, "createdAt": "2024-01-01T00:00:00Z", "updatedAt": "2024-01-01T00:00:00Z" }
  ]

  beforeEach(async () => {
    cityServiceMock = jasmine.createSpyObj('CityService', ['getCities']);
    cityServiceMock.getCities.and.returnValue(of(CITIES));

    locationServiceMock = jasmine.createSpyObj('LocationService', ['searchLocations']);
    locationServiceMock.searchLocations.and.returnValue(of(LOCATIONS));

    await TestBed.configureTestingModule({
      imports: [LocationPickerButtonComponent, LocationPickerComponent, IconComponent],
      providers: [
        { provide: CITY_SERVICE, useValue: cityServiceMock },
        { provide : LOCATION_SERVICE, useValue: locationServiceMock}
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationPickerButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('rendering', () => {
    it('shows the empty-state label when no city is committed', () => {
      const btn = query('[data-testid=location-picker-button]');
      expect(btn?.textContent).toContain('Choisir une zone');
    });

    it('does not render the clear × when nothing is committed', () => {
      expect(query('[data-testid=location-picker-button-clear]')).toBeFalsy();
    });

    it('does not render the panel until opened', () => {
      expect(query('[data-testid=location-picker-panel]')).toBeFalsy();
    });
  });

  describe('opening the panel', () => {
    it('opens on trigger click', () => {
      click('[data-testid=location-picker-button]');
      expect(query('[data-testid=location-picker-panel]')).toBeTruthy();
    });

    it('closes on the panel header ×', () => {
      click('[data-testid=location-picker-button]');
      click('[data-testid=location-picker-panel-close]');
      expect(query('[data-testid=location-picker-panel]')).toBeFalsy();
    });

    it('closes on cancel', () => {
      click('[data-testid=location-picker-button]');
      click('[data-testid=location-picker-cancel]');
      expect(query('[data-testid=location-picker-panel]')).toBeFalsy();
    });
  });

  describe('apply', () => {
    it('disables the apply button when no city is selected', () => {
      click('[data-testid=location-picker-button]');
      const apply = query('[data-testid=location-picker-apply]') as HTMLButtonElement;
      expect(apply.disabled).toBe(true);
    });

    it('emits criteriaChange on apply', () => {
      const spy = jasmine.createSpy('criteriaChange');
      component.criteriaChange.subscribe(spy);

      // Simulate the picker emitting a city.
      component['committedCity'].set(CITIES[0]);
      fixture.detectChanges();

      click('[data-testid=location-picker-button]');
      click('[data-testid=location-picker-apply]');

      expect(spy).toHaveBeenCalled();
      const payload = spy.calls.mostRecent().args[0];
      expect(payload.cityId).toBe('city-douala');
      expect(payload.cityName).toBe('Douala');
    });
  });

  describe('clear', () => {
    it('emits an empty criteriaChange when cleared', () => {
      const spy = jasmine.createSpy('criteriaChange');
      component.criteriaChange.subscribe(spy);

      component['committedCity'].set(CITIES[0]);
      fixture.detectChanges();

      click('[data-testid=location-picker-button-clear]');

      expect(spy).toHaveBeenCalled();
      expect(spy.calls.mostRecent().args[0].cityId).toBe('');
    });
  });

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function click(sel: string): void {
    const el = query(sel);
    expect(el).toBeTruthy('Element to click on is not found '+ sel);
    el?.click();
    fixture.detectChanges();
  }
});
