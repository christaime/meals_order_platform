import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { VendorPickerComponent } from './vendor-picker.component';
import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { Vendor, VendorSummary } from '@app/core/models/marketplace';

// ─── Fixtures ───────────────────────────────────────────────

const VENDOR_CHAUDRON: VendorSummary = {
  id: 'vendor-chaudron',
  businessName: 'Le Chaudron du bon gout',
  ownerName: 'Marie Ndongo',
  description: null,
  address: 'Rue Joss, Akwa',
  email: 'contact@chaudron.cm',
  city: { id: 'city-douala', name: 'Douala', region: 'Littoral', countryCode: 'CM' },
  ratingAvg: 4.5,
  totalRatings: 120,
  subscriptionTier: 'PRO',
  status: 'ACTIVE',
  cuisines: [],
  profileImageUrl: null,
} as VendorSummary;

const VENDOR_MAMA: VendorSummary = {
  ...VENDOR_CHAUDRON,
  id: 'vendor-mama',
  businessName: 'Chez Mama Ngo',
  email: 'contact@mamango.cm',
  address: 'Rue 1756, Bastos',
  city: { id: 'city-yaounde', name: 'Yaoundé', region: 'Centre', countryCode: 'CM' },
};

const VENDOR_PIZZA: VendorSummary = {
  ...VENDOR_CHAUDRON,
  id: 'vendor-pizza',
  businessName: 'Bella Italia',
  email: 'contact@bellaitalia.cm',
  address: 'Marché Central, Garoua',
  city: { id: 'city-garoua', name: 'Garoua', region: 'Nord', countryCode: 'CM' },
};

function emptyPage() {
  return {
    content: [] as VendorSummary[],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    empty: true,
  };
}

function pageOf(...vendors: VendorSummary[]) {
  return {
    content: vendors,
    page: 0,
    size: 20,
    totalElements: vendors.length,
    totalPages: 1,
    first: true,
    last: true,
    empty: vendors.length === 0,
  };
}

describe('VendorPickerComponent', () => {
  let fixture: ComponentFixture<VendorPickerComponent>;
  let component: VendorPickerComponent;
  let vendorServiceMock: jasmine.SpyObj<any>;

  beforeEach(async () => {
    vendorServiceMock = jasmine.createSpyObj('VendorService', [
      'searchVendors',
      'getVendorById',
    ]);
    vendorServiceMock.searchVendors.and.returnValue(of(emptyPage()));
    vendorServiceMock.getVendorById.and.returnValue(of(VENDOR_CHAUDRON));

    await TestBed.configureTestingModule({
      imports: [VendorPickerComponent],
      providers: [
        { provide: VENDOR_SERVICE, useValue: vendorServiceMock },
      ],
    }).compileComponents();
  });

  function setup(inputs: {
    maxSelection?: number;
    selectedVendorIds?: string[];
    selectedVendorId?: string | null;
  } = {}): void {
    fixture = TestBed.createComponent(VendorPickerComponent);
    component = fixture.componentInstance;

    if (inputs.maxSelection !== undefined) {
      fixture.componentRef.setInput('maxSelection', inputs.maxSelection);
    }
    if (inputs.selectedVendorIds !== undefined) {
      fixture.componentRef.setInput('selectedVendorIds', inputs.selectedVendorIds);
    }
    if (inputs.selectedVendorId !== undefined) {
      fixture.componentRef.setInput('selectedVendorId', inputs.selectedVendorId);
    }

    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders the root element', () => {
      setup();
      expect(query('[data-testid=vendor-picker]')).toBeTruthy();
    });

    it('renders the search input when below the cap', () => {
      setup();
      expect(query('[data-testid=vendor-picker-search]')).toBeTruthy();
    });

    it('does not render a chip before any selection', () => {
      setup();
      expect(query('[data-testid^=vendor-picker-chip-]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Search
  // ═══════════════════════════════════════════════════════════

  describe('search', () => {
    it('does not call the service for a term shorter than 2 characters', fakeAsync(() => {
      setup();
      typeInput('a');
      tick(300);
      expect(vendorServiceMock.searchVendors).not.toHaveBeenCalled();
    }));

    it('calls the service with the trimmed keyword after the debounce', fakeAsync(() => {
      setup();
      vendorServiceMock.searchVendors.and.returnValue(of(emptyPage()));

      typeInput('  chaudron  ');
      tick(300);

      expect(vendorServiceMock.searchVendors).toHaveBeenCalledTimes(1);
      const req = vendorServiceMock.searchVendors.calls.mostRecent().args[0];
      expect(req.keyword).toBe('chaudron');
      expect(req.sortBy).toBe('businessName');
      expect(req.sortDirection).toBe('ASC');
    }));

    it('debounces multiple keystrokes into one request', fakeAsync(() => {
      setup();
      vendorServiceMock.searchVendors.and.returnValue(of(emptyPage()));

      typeInput('c');
      tick(100);
      typeInput('ch');
      tick(100);
      typeInput('cha');
      tick(300);

      expect(vendorServiceMock.searchVendors).toHaveBeenCalledTimes(1);
    }));

    it('renders the dropdown when results arrive', fakeAsync(() => {
      setup();
      vendorServiceMock.searchVendors.and.returnValue(of(pageOf(VENDOR_CHAUDRON, VENDOR_MAMA)));

      inputFocused();
      typeInput('ch');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=vendor-picker-dropdown]')).toBeTruthy();
      expect(query('[data-testid=vendor-picker-option-vendor-chaudron]')).toBeTruthy();
      expect(query('[data-testid=vendor-picker-option-vendor-mama]')).toBeTruthy();
    }));

    it('shows the empty state when focused and no results match', fakeAsync(() => {
      setup();
      vendorServiceMock.searchVendors.and.returnValue(of(emptyPage()));

      inputFocused();
      typeInput('zzzzz');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=vendor-picker-empty]')).toBeTruthy();
      expect(query('[data-testid=vendor-picker-dropdown]')).toBeFalsy();
    }));

    it('does not show the empty state when not focused', fakeAsync(() => {
      setup();
      vendorServiceMock.searchVendors.and.returnValue(of(emptyPage()));

      typeInput('zzzzz');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=vendor-picker-empty]')).toBeFalsy();
    }));

    it('shows the hint for a term shorter than the minimum', fakeAsync(() => {
      setup();
      inputFocused();
      typeInput('a');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=vendor-picker-hint]')).toBeTruthy();
    }));

    it('does not open the dropdown when the service errors', fakeAsync(() => {
      setup();
      vendorServiceMock.searchVendors.and.returnValue(
        throwError(() => new Error('boom')),
      );

      inputFocused();
      typeInput('chaudron');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=vendor-picker-dropdown]')).toBeFalsy();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Selection
  // ═══════════════════════════════════════════════════════════

  describe('selection', () => {
    it('adds a vendor on option mousedown', fakeAsync(() => {
      setup({ maxSelection: 1 });
      vendorServiceMock.searchVendors.and.returnValue(of(pageOf(VENDOR_CHAUDRON)));

      const spy = jasmine.createSpy('vendorsSelected');
      component.vendorsSelected.subscribe(spy);

      inputFocused();
      typeInput('ch');
      tick(300);
      fixture.detectChanges();

      const option = query('[data-testid=vendor-picker-option-vendor-chaudron]') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.calls.mostRecent().args[0][0].id).toBe('vendor-chaudron');
    }));

    it('renders a chip after adding', fakeAsync(() => {
      setup({ maxSelection: 1 });
      vendorServiceMock.searchVendors.and.returnValue(of(pageOf(VENDOR_CHAUDRON)));

      inputFocused();
      typeInput('ch');
      tick(300);
      fixture.detectChanges();

      const option = query('[data-testid=vendor-picker-option-vendor-chaudron]') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(query('[data-testid=vendor-picker-chip-vendor-chaudron]')).toBeTruthy();
    }));

    it('hides the input at the default cap of 1', fakeAsync(() => {
      setup({ maxSelection: 1 });
      vendorServiceMock.searchVendors.and.returnValue(of(pageOf(VENDOR_CHAUDRON)));

      inputFocused();
      typeInput('ch');
      tick(300);
      fixture.detectChanges();

      const option = query('[data-testid=vendor-picker-option-vendor-chaudron]') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(query('[data-testid=vendor-picker-search]')).toBeFalsy();
    }));

    it('emits vendorSelected with the first id', fakeAsync(() => {
      setup({ maxSelection: 1 });
      vendorServiceMock.searchVendors.and.returnValue(of(pageOf(VENDOR_CHAUDRON)));

      const spy = jasmine.createSpy('vendorSelected');
      component.vendorSelected.subscribe(spy);

      inputFocused();
      typeInput('ch');
      tick(300);
      fixture.detectChanges();

      const option = query('[data-testid=vendor-picker-option-vendor-chaudron]') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith('vendor-chaudron');
    }));

    it('removes a vendor when its chip close button is clicked', () => {
      setup({ maxSelection: 1, selectedVendorIds: ['vendor-chaudron'] });
      fixture.detectChanges();

      const spy = jasmine.createSpy('vendorsSelected');
      component.vendorsSelected.subscribe(spy);

      click('[data-testid=vendor-picker-remove-vendor-chaudron]');

      expect(spy.calls.mostRecent().args[0]).toEqual([]);
      expect(query('[data-testid=vendor-picker-chip-vendor-chaudron]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Max selection
  // ═══════════════════════════════════════════════════════════

  describe('max selection', () => {
    it('does not add a vendor past the cap', fakeAsync(() => {
      setup({ maxSelection: 2 });
      vendorServiceMock.searchVendors.and.returnValue(of(pageOf(VENDOR_CHAUDRON)));

      // Add the first vendor through the DOM.
      inputFocused();
      typeInput('ch');
      tick(300);
      fixture.detectChanges();
      const option = query('[data-testid=vendor-picker-option-vendor-chaudron]') as HTMLElement;
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      fixture.detectChanges();

      // Force the cap by adding a second id directly.
      component['selectedIds'].set(['vendor-chaudron', 'vendor-mama']);
      fixture.detectChanges();

      const spy = jasmine.createSpy('vendorsSelected');
      component.vendorsSelected.subscribe(spy);

      component['addVendor'](VENDOR_PIZZA);

      expect(spy).not.toHaveBeenCalled();
    }));

    it('keeps the input visible when below a maxSelection of 2', () => {
      setup({ maxSelection: 2, selectedVendorIds: ['vendor-chaudron'] });
      fixture.detectChanges();
      expect(query('[data-testid=vendor-picker-search]')).toBeTruthy();
    });

    it('computes a full-width basis when maxSelection is 1', () => {
      setup({ maxSelection: 1 });
      expect(component['chipBasis']()).toBe('calc((92% - 0rem) / 1)');
    });

    it('computes a half-width basis when maxSelection is 2', () => {
      setup({ maxSelection: 2 });
      expect(component['chipBasis']()).toBe('calc((92% - 0.375rem) / 2)');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Preselection
  // ═══════════════════════════════════════════════════════════

  describe('preselection', () => {
    it('renders a chip for a preselected id once the vendor is fetched', fakeAsync(() => {
      setup({ maxSelection: 1, selectedVendorIds: ['vendor-chaudron'] });
      vendorServiceMock.getVendorById.and.returnValue(of(VENDOR_CHAUDRON));

      tick();
      fixture.detectChanges();

      expect(vendorServiceMock.getVendorById).toHaveBeenCalledWith('vendor-chaudron');
      expect(query('[data-testid=vendor-picker-chip-vendor-chaudron]')).toBeTruthy();
    }));

    it('accepts the legacy selectedVendorId input', fakeAsync(() => {
      setup({ maxSelection: 1, selectedVendorId: 'vendor-chaudron' });
      vendorServiceMock.getVendorById.and.returnValue(of(VENDOR_CHAUDRON));

      tick();
      fixture.detectChanges();

      expect(component['selectedIds']()).toEqual(['vendor-chaudron']);
    }));

    it('prefers selectedVendorIds when both inputs are set', fakeAsync(() => {
      setup({
        maxSelection: 2,
        selectedVendorIds: ['vendor-mama'],
        selectedVendorId: 'vendor-chaudron',
      });
      vendorServiceMock.getVendorById.and.returnValue(of(VENDOR_MAMA));

      tick();
      fixture.detectChanges();

      expect(component['selectedIds']()).toEqual(['vendor-mama']);
    }));

    it('does not crash when the preselected vendor fetch fails', fakeAsync(() => {
      setup({ maxSelection: 1, selectedVendorIds: ['vendor-missing'] });
      vendorServiceMock.getVendorById.and.returnValue(
        throwError(() => new Error('not found')),
      );

      tick();
      fixture.detectChanges();

      // No chip rendered, but no exception either.
      expect(query('[data-testid=vendor-picker-chip-vendor-missing]')).toBeFalsy();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function typeInput(value: string): void {
    const el = query('[data-testid=vendor-picker-search]') as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function inputFocused(): void {
    const el = query('[data-testid=vendor-picker-search]') as HTMLInputElement;
    el.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  }

  function click(sel: string): void {
    const el = query(sel);
    expect(el).withContext('not found: ' + sel).toBeTruthy();
    el!.click();
    fixture.detectChanges();
  }
});
