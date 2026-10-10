import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { VendorDirectoryViewComponent, DirectoryFilterState } from './vendor-directory-view.component';
import { VendorSummary, Category , City} from '@core/models/marketplace';
import { CATEGORY_SERVICE , CITY_SERVICE} from '@core/services/marketplace';
import { CategoryMockService } from '@mock/services/category-mock.service';
import { IconComponent, SearchBarComponent, LocationSelectorComponent, SortDropdownComponent } from '@components/shared';
import { SubCategoryFilterChipsComponent } from '@components/marketplace/meal/view/sub-category-filter-chips/sub-category-filter-chips.component';
import { PaginationControlsComponent } from '@components/marketplace/meal/view';
import { VendorCardComponent } from '../vendor-card/vendor-card.component';
import { VendorCardSkeletonComponent } from '../vendor-card-skeleton/vendor-card-skeleton.component';

const CUISINES: Category[] = [
  { id: 'cuisine-camerounaise', name: 'Camerounaise', type: 'CUISINE' } as Category,
  { id: 'cuisine-libanaise',    name: 'Libanaise',    type: 'CUISINE' } as Category,
  { id: 'cuisine-italienne',    name: 'Italienne',    type: 'CUISINE' } as Category,
];

const CITIES: City[] = [
  { "id": "city-douala", "name": "Douala", "region": "Littoral", "countryCode": "CM" },
  { id: 'city-douala', name: 'Douala', region: 'Littoral', countryCode: 'CM' },
];
const VENDORS: VendorSummary[] = [
  {
    id: 'vendor-chaudron', businessName: 'Le Chaudron du bon gout', ownerName: 'Marie',
    description: null, address: 'Akwa', city: { id: 'city-douala', name: 'Douala', region: 'Littoral', countryCode: 'CM' },
    ratingAvg: 4.5, totalRatings: 120, subscriptionTier: 'PRO', status: 'ACTIVE',
    cuisines: [], profileImageUrl: null,
  },
  {
    id: 'vendor-mama', businessName: 'Chez Mama Ngo', ownerName: 'Ngo',
    description: null, address: 'Bastos', city: { id: 'city-yaounde', name: 'Yaoundé', region: 'Centre', countryCode: 'CM' },
    ratingAvg: 4.4, totalRatings: 98, subscriptionTier: 'FREE', status: 'ACTIVE',
    cuisines: [], profileImageUrl: null,
  },
];

describe('VendorDirectoryViewComponent', () => {
  let fixture: ComponentFixture<VendorDirectoryViewComponent>;
  let component: VendorDirectoryViewComponent;
  let categoryServiceMock: jasmine.SpyObj<any>;
  let cityServiceMock: jasmine.SpyObj<any>;

  beforeEach(async () => {
    categoryServiceMock = jasmine.createSpyObj('CategoryService', ['searchCategories']);
    categoryServiceMock.searchCategories.and.returnValue(
      of({ content: CUISINES, page: 0, size: 6, totalElements: 3, totalPages: 1 }),
    );
    cityServiceMock = jasmine.createSpyObj('CityService', ['getCities']);
    cityServiceMock.getCities.and.returnValue(
      of({ content: CITIES, page: 0, size: 2, totalElements: 2, totalPages: 1 }),
    );

    await TestBed.configureTestingModule({
      imports: [VendorDirectoryViewComponent],
      providers: [
        { provide: CATEGORY_SERVICE, useValue: categoryServiceMock },
        { provide: CITY_SERVICE, useValue: cityServiceMock}
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorDirectoryViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════
  //  Initial state
  // ═══════════════════════════════════════════════════════════

  describe('initial state', () => {
    it('starts on page 1 with a default sort of businessName', () => {
      expect(component.currentPage()).toBe(1);
      expect(component.selectedSort()).toBe('businessName');
    });

    it('has no selected chips initially', () => {
      expect(component.selectedSubCategories()).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Search
  // ═══════════════════════════════════════════════════════════

  describe('search', () => {
    it('emits a filter state on search change', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onSearchChange('chaudron');

      expect(spy).toHaveBeenCalledTimes(1);
      const emitted: DirectoryFilterState = spy.calls.mostRecent().args[0];
      expect(emitted.query).toBe('chaudron');
      expect(emitted.page).toBe(1);
    });

    it('resets to page 1 when the search changes', () => {
      component.currentPage.set(3);
      component.onSearchChange('taro');
      expect(component.currentPage()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Sort
  // ═══════════════════════════════════════════════════════════

  describe('sort', () => {
    it('emits the sort id on sort change', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onSortChange({ id: 'ratingAvg', label: 'Mieux notés', icon: 'star' });

      const emitted: DirectoryFilterState = spy.calls.mostRecent().args[0];
      expect(emitted.sortBy).toBe('ratingAvg');
      expect(emitted.sortDirection).toBe('DESC');
    });

    it('uses ASC when sorting by businessName', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onSortChange({ id: 'businessName', label: 'Nom', icon: 'sort_by_alpha' });

      const emitted: DirectoryFilterState = spy.calls.mostRecent().args[0];
      expect(emitted.sortDirection).toBe('ASC');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Chips
  // ═══════════════════════════════════════════════════════════

  describe('chips', () => {
    it('emits the selected chip ids as categoryIds', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onSubCategoryChange([
        { id: 'cuisine-camerounaise', name: 'Camerounaise', kind: 'CUISINE' },
      ]);

      const emitted: DirectoryFilterState = spy.calls.mostRecent().args[0];
      expect(emitted.categoryIds).toEqual(['cuisine-camerounaise']);
    });

    it('resets to page 1 when chips change', () => {
      component.currentPage.set(2);
      component.onSubCategoryChange([]);
      expect(component.currentPage()).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Location
  // ═══════════════════════════════════════════════════════════

  describe('location', () => {
    it('emits the selected location ids as anyLocationIds', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onLocationsChange([
        { id: 'loc-akwa', name: 'Akwa' } as any,
        { id: 'loc-bonapriso', name: 'Bonapriso' } as any,
      ]);

      const emitted: DirectoryFilterState = spy.calls.mostRecent().args[0];
      expect(emitted.anyLocationIds).toEqual(['loc-akwa', 'loc-bonapriso']);
    });

    it('does not emit on criteriaChange alone', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onCriteriaChange({
        cityId: 'city-douala', cityName: 'Douala',
        latitude: 4.048, longitude: 9.704, radiusKm: 5,
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Pagination
  // ═══════════════════════════════════════════════════════════

  describe('pagination', () => {
    it('emits the new page on page change', () => {
      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onPageChange(2);

      const emitted: DirectoryFilterState = spy.calls.mostRecent().args[0];
      expect(emitted.page).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Reset
  // ═══════════════════════════════════════════════════════════

  describe('reset', () => {
    it('clears the search and resets to page 1', () => {
      component.searchQuery.set('chaudron');
      component.currentPage.set(3);

      const spy = jasmine.createSpy('filterChange');
      component.filterChange.subscribe(spy);

      component.onResetFilters();

      expect(component.searchQuery()).toBe('');
      expect(component.currentPage()).toBe(1);
      const emitted: DirectoryFilterState = spy.calls.mostRecent().args[0];
      expect(emitted.query).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders vendor cards when vendors are provided', () => {
      fixture.componentRef.setInput('vendors', VENDORS);
      fixture.detectChanges();

      const cards = fixture.nativeElement.querySelectorAll('app-vendor-card');
      expect(cards.length).toBe(2);
    });

    it('renders the empty state when vendors are absent', () => {
      fixture.componentRef.setInput('vendors', []);
      fixture.detectChanges();

      expect(query('app-vendor-card')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Aucun restaurant trouvé');
    });

    it('renders skeletons while loading', () => {
      fixture.componentRef.setInput('isLoading', true);
      fixture.detectChanges();

      const skeletons = fixture.nativeElement.querySelectorAll('app-vendor-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }
});
