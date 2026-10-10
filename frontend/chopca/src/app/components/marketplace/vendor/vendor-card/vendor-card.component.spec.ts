import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { VendorCardComponent } from './vendor-card.component';
import { VendorSummary } from '@core/models/marketplace';
import {
  IconComponent,
  BadgeComponent,
  RatingStarsComponent,
} from '@components/shared';

const VENDOR_ACTIVE: VendorSummary = {
  id: 'vendor-chaudron',
  businessName: 'Le Chaudron du bon gout',
  ownerName: 'Marie Ndongo',
  description: 'Cuisine camerounaise traditionnelle, préparée avec des produits frais.',
  address: 'Rue Joss, Akwa',
  email: 'contact@chaudron.cm',
  city: { id: 'city-douala', name: 'Douala', region: 'Littoral', countryCode: 'CM' },
  ratingAvg: 4.5,
  totalRatings: 120,
  subscriptionTier: 'PRO',
  status: 'ACTIVE',
  cuisines: [
    { id: "cuisine-camerounaise", name: "Camerounaise", iconUrl: "local_dining",  type: "CUISINE",  status: "APPROVED" }
  ],
  profileImageUrl: null,
};

const VENDOR_INACTIVE: VendorSummary = {
  ...VENDOR_ACTIVE,
  id: 'vendor-closed',
  businessName: 'Chez Fermé',
  status: 'SUSPENDED',
};

const VENDOR_NO_RATING: VendorSummary = {
  ...VENDOR_ACTIVE,
  id: 'vendor-new',
  businessName: 'Nouveau Restaurant',
  ratingAvg: 0,
  totalRatings: 0,
};

const VENDOR_NO_CUISINES: VendorSummary = {
  ...VENDOR_ACTIVE,
  id: 'vendor-plain',
  businessName: 'Sans Cuisine',
  cuisines: [],
};

const VENDOR_NO_CITY: VendorSummary = {
  ...VENDOR_ACTIVE,
  id: 'vendor-nocity',
  businessName: 'Sans Ville',
  city: undefined,
};

describe('VendorCardComponent', () => {
  let fixture: ComponentFixture<VendorCardComponent>;
  let component: VendorCardComponent;

  async function setup(vendor: VendorSummary): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [VendorCardComponent, IconComponent, BadgeComponent, RatingStarsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vendor', vendor);
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Identity
  // ═══════════════════════════════════════════════════════════

  describe('identity', () => {
    it('sets the root testid from the vendor id', async () => {
      await setup(VENDOR_ACTIVE);
      const card = query('[data-testid=vendor-card-vendor-chaudron]');
      expect(card).toBeTruthy();
      expect(card!.getAttribute('data-vendor-id')).toBe('vendor-chaudron');
    });

    it('renders the business name', async () => {
      await setup(VENDOR_ACTIVE);
      expect(query('[data-testid=vendor-card-name]')!.textContent).toContain('Le Chaudron du bon gout');
    });

    it('renders the initial when no profile image', async () => {
      await setup(VENDOR_ACTIVE);
      expect(query('[data-testid=vendor-card-initial]')!.textContent).toContain('L');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Status
  // ═══════════════════════════════════════════════════════════

  describe('status', () => {
    it('shows "Ouvert" for ACTIVE vendors', async () => {
      await setup(VENDOR_ACTIVE);
      expect(query('[data-testid=vendor-card-status]')!.textContent).toContain('Ouvert');
    });

    it('shows "Fermé" for non-ACTIVE vendors', async () => {
      await setup(VENDOR_INACTIVE);
      expect(query('[data-testid=vendor-card-status]')!.textContent).toContain('Fermé');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Cuisines
  // ═══════════════════════════════════════════════════════════

  describe('cuisines', () => {
    it('renders a chip per cuisine', async () => {
      await setup(VENDOR_ACTIVE);
      expect(query('[data-testid=vendor-card-cuisine-name-Camerounaise]')).toBeTruthy();
    });

    it('caps the list at 3 cuisines', async () => {
      await setup({
        ...VENDOR_ACTIVE,
        cuisines: [
          { id: 'c1', name: 'Un' ,   iconUrl: "ramen_dining",  type: "CUISINE",  status: "APPROVED"},
          { id: 'c2', name: 'Deux' , iconUrl: "ramen_dining",  type: "CUISINE",  status: "APPROVED"},
          { id: 'c3', name: 'Trois' ,  iconUrl: "ramen_dining",  type: "CUISINE",  status: "APPROVED"},
          { id: 'c4', name: 'Quatre', iconUrl: "ramen_dining",  type: "CUISINE",  status: "APPROVED" },
        ],
      });
      const chips = fixture.nativeElement.querySelectorAll(
        '[data-testid^=vendor-card-cuisine-name-]',
      );
      expect(chips.length).toBe(3);
    });

    it('hides the cuisine row when there are none', async () => {
      await setup(VENDOR_NO_CUISINES);
      expect(query('[data-testid=vendor-card-cuisines]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Rating
  // ═══════════════════════════════════════════════════════════

  describe('rating', () => {
    it('renders the rating value with a data attribute', async () => {
      await setup(VENDOR_ACTIVE);
      const rating = query('[data-testid=vendor-card-rating]');
      expect(rating).toBeTruthy();
      expect(rating!.getAttribute('data-rating')).toBe('4.5');
    });

    it('renders the total ratings count with a data attribute', async () => {
      await setup(VENDOR_ACTIVE);
      const total = query('[data-testid=vendor-card-totalRatings]');
      expect(total!.getAttribute('data-totalRatings')).toBe('120');
    });

    it('hides the rating row when the vendor has no ratings', async () => {
      await setup(VENDOR_NO_RATING);
      expect(query('[data-testid=vendor-card-rating]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Address & city
  // ═══════════════════════════════════════════════════════════

  describe('address', () => {
    it('renders the address', async () => {
      await setup(VENDOR_ACTIVE);
      expect(query('[data-testid=vendor-card-address]')!.textContent).toContain('Rue Joss, Akwa');
    });

    it('renders the city when present', async () => {
      await setup(VENDOR_ACTIVE);
      const city = query('[data-testid=vendor-card-city]');
      expect(city).toBeTruthy();
      expect(city!.getAttribute('data-city-id')).toBe('city-douala');
      expect(city!.textContent).toContain('Douala');
    });

    it('hides the city when the vendor has none', async () => {
      await setup(VENDOR_NO_CITY);
      expect(query('[data-testid=vendor-card-city]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Select
  // ═══════════════════════════════════════════════════════════

  describe('select', () => {
    it('emits the vendor on card click', async () => {
      await setup(VENDOR_ACTIVE);
      const spy = jasmine.createSpy('selectVendor');
      component.selectVendor.subscribe(spy);

      query('[data-testid=vendor-card-vendor-chaudron]')!.click();

      expect(spy).toHaveBeenCalledOnceWith(VENDOR_ACTIVE);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Verified badge
  // ═══════════════════════════════════════════════════════════

  describe('verified badge', () => {
    it('shows the verified tag for PRO vendors', async () => {
      await setup(VENDOR_ACTIVE);
      expect(query('[data-testid=vendor-card-verified-tag]')).toBeTruthy();
    });

    it('hides the verified tag for FREE vendors', async () => {
      await setup({ ...VENDOR_ACTIVE, subscriptionTier: 'FREE' });
      expect(query('[data-testid=vendor-card-verified-tag]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }
});
