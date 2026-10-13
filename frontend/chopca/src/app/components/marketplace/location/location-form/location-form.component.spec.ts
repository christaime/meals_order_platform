import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { LocationFormComponent } from './location-form.component';
import { CITY_SERVICE } from '@app/core/services/marketplace/city.service';
import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { City, Location } from '@app/core/models/marketplace';

const CITIES: City[] = [
  { id: 'city-douala',  name: 'Douala',  region: 'Littoral', countryCode: 'CM' } as City,
  { id: 'city-yaounde', name: 'Yaoundé', region: 'Centre',   countryCode: 'CM' } as City,
];

const EXISTING_LOCATION: Location = {
  id: 'loc-mboppi',
  vendorId: 'vendor-chaudron',
  vendorBusinessName: 'Le Chaudron du bon gout',
  name: 'Mboppi',
  address: 'Marché Mboppi, Douala',
  phone: '+237690000099',
  latitude: 4.0570,
  longitude: 9.6920,
  deliveryRadius: 5,
  cityId: 'city-douala',
  city: { id: 'city-douala', name: 'Douala', region: 'Littoral', countryCode: 'CM' } as City,
  moderationStatus: 'PENDING',
  isActive: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
} as Location;

describe('LocationFormComponent', () => {
  let fixture: ComponentFixture<LocationFormComponent>;
  let component: LocationFormComponent;
  let cityServiceMock: jasmine.SpyObj<any>;
  let locationServiceMock: jasmine.SpyObj<any>;

  beforeEach(async () => {

    cityServiceMock = jasmine.createSpyObj('CityService', ['getCities']);
    cityServiceMock.getCities.and.returnValue(of(CITIES));

    locationServiceMock = jasmine.createSpyObj('LocationService', [
      'createLocation', 'updateLocation',
    ]);
    locationServiceMock.createLocation.and.returnValue(of(EXISTING_LOCATION));
    locationServiceMock.updateLocation.and.returnValue(of(EXISTING_LOCATION));

    await TestBed.configureTestingModule({
      imports: [LocationFormComponent, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: CITY_SERVICE, useValue: cityServiceMock },
        { provide: LOCATION_SERVICE, useValue: locationServiceMock },
      ],
    }).compileComponents();
  });

  function createComponent(location: Location | null = null): void {
    fixture = TestBed.createComponent(LocationFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('location', location);
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  City requirement
  // ═══════════════════════════════════════════════════════════

  describe('city requirement', () => {
    it('is invalid without a city', () => {
      createComponent();

      component.form.controls['name'].setValue('Zone Sans Ville');
      component.form.controls['address'].setValue('Rue Sans Ville');
      component.form.controls['latitude'].setValue(4.05);
      component.form.controls['longitude'].setValue(9.70);

      expect(component.form.controls['cityId'].invalid).toBeTrue();
      expect(component.form.invalid).toBeTrue();
    });

    it('is valid once a city is selected', () => {
      createComponent();

      component.form.controls['cityId'].setValue('city-douala');
      component.form.controls['name'].setValue('Zone Avec Ville');
      component.form.controls['address'].setValue('Rue Avec Ville');
      component.form.controls['latitude'].setValue(4.05);
      component.form.controls['longitude'].setValue(9.70);

      expect(component.form.controls['cityId'].valid).toBeTrue();
      expect(component.form.valid).toBeTrue();
    });

    it('does not call updateLocation when the city is missing', () => {
      createComponent();

      component.form.controls['name'].setValue('Zone Sans Ville');
      component.form.controls['address'].setValue('Rue Sans Ville');

      component['onSubmit']();

      expect(locationServiceMock.updateLocation).not.toHaveBeenCalled();
      expect(locationServiceMock.createLocation).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Edit mode — preselection
  // ═══════════════════════════════════════════════════════════

  describe('edit mode', () => {
    it('preselects the city when the location has one', fakeAsync(() => {
      createComponent(EXISTING_LOCATION);
      tick();

      expect(component.form.controls['cityId'].value).toBe('city-douala');
    }));

    it('preselects the name and address', fakeAsync(() => {
      createComponent(EXISTING_LOCATION);
      tick();

      expect(component.form.controls['name'].value).toBe('Mboppi');
      expect(component.form.controls['address'].value).toBe('Marché Mboppi, Douala');
    }));

    it('calls updateLocation on submit, not createLocation', fakeAsync(() => {
      createComponent(EXISTING_LOCATION);
      tick();

      component['onSubmit']();
      tick();

      expect(locationServiceMock.updateLocation).toHaveBeenCalled();
      expect(locationServiceMock.createLocation).not.toHaveBeenCalled();
    }));

    it('emits saved with the updated location', fakeAsync(() => {
      createComponent(EXISTING_LOCATION);
      tick();

      const spy = jasmine.createSpy('saved');
      component.saved.subscribe(spy);

      component['onSubmit']();
      tick();

      expect(spy).toHaveBeenCalled();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Create mode
  // ═══════════════════════════════════════════════════════════

  describe('create mode', () => {
    it('starts with an empty city', () => {
      createComponent();

      expect(component.form.controls['cityId'].value).toBeFalsy();
    });

    it('calls createLocation on submit, not updateLocation', fakeAsync(() => {
      createComponent();

      component.form.controls['cityId'].setValue('city-douala');
      component.form.controls['name'].setValue('Zone Nouvelle');
      component.form.controls['address'].setValue('Rue Nouvelle');
      component.form.controls['latitude'].setValue(4.05);
      component.form.controls['longitude'].setValue(9.70);

      component['onSubmit']();
      tick();

      expect(locationServiceMock.createLocation).toHaveBeenCalled();
      expect(locationServiceMock.updateLocation).not.toHaveBeenCalled();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Cancel
  // ═══════════════════════════════════════════════════════════

  describe('cancel', () => {
    it('emits cancelled without calling the service', () => {
      createComponent(EXISTING_LOCATION);

      const spy = jasmine.createSpy('cancelled');
      component.cancelled.subscribe(spy);

      component['onCancel']();

      expect(spy).toHaveBeenCalled();
      expect(locationServiceMock.updateLocation).not.toHaveBeenCalled();
      expect(locationServiceMock.createLocation).not.toHaveBeenCalled();
    });
  });
});
