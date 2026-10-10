import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';

import { VendorApiService } from './vendor-api.service';
import { WorkspaceService } from './workspace.service';
import { VendorSearchRequest } from '@app/core/models/marketplace';
import { environment } from '@environments/environment';

describe('VendorApiService', () => {
  let service: VendorApiService;
  let http: HttpTestingController;
  let workspaceMock: jasmine.SpyObj<WorkspaceService>;

  const PUBLIC_URL = `${environment.apiUrl}/public/vendors`;
  const ADMIN_URL  = `${environment.apiUrl}/admin/vendors`;

  beforeEach(() => {
    workspaceMock = jasmine.createSpyObj('WorkspaceService', ['isAdminWorkspace']);
    workspaceMock.isAdminWorkspace.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        VendorApiService,
        { provide: WorkspaceService, useValue: workspaceMock },
      ],
    });

    service = TestBed.inject(VendorApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  // ═══════════════════════════════════════════════════════════
  //  searchVendors — URL choice
  // ═══════════════════════════════════════════════════════════

  describe('searchVendors — URL choice', () => {
    it('hits the public URL for an anonymous caller', () => {
      workspaceMock.isAdminWorkspace.and.returnValue(false);

      service.searchVendors({}).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.method).toBe('GET');
      req.flush(emptyPage());
    });

    it('hits the admin URL for an admin caller', () => {
      workspaceMock.isAdminWorkspace.and.returnValue(true);

      service.searchVendors({}).subscribe();

      const req = http.expectOne((r) => r.url === ADMIN_URL);
      expect(req.request.method).toBe('GET');
      req.flush(emptyPage());
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  searchVendors — query parameters
  // ═══════════════════════════════════════════════════════════

  describe('searchVendors — query parameters', () => {
    it('sends no query params for an empty request', () => {
      service.searchVendors({}).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.keys()).toEqual([]);
      req.flush(emptyPage());
    });

    it('sends the keyword when present', () => {
      const request: VendorSearchRequest = { keyword: 'chaudron' };
      service.searchVendors(request).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('keyword')).toBe('chaudron');
      req.flush(emptyPage());
    });

    it('omits the keyword when it is an empty string', () => {
      service.searchVendors({ keyword: '' }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.has('keyword')).toBeFalse();
      req.flush(emptyPage());
    });

    it('sends businessName when present', () => {
      service.searchVendors({ businessName: 'Bella Italia' }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('businessName')).toBe('Bella Italia');
      req.flush(emptyPage());
    });

    it('sends email when present', () => {
      service.searchVendors({ email: 'contact@chaudron.cm' }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('email')).toBe('contact@chaudron.cm');
      req.flush(emptyPage());
    });

    it('sends status when present', () => {
      service.searchVendors({ status: 'ACTIVE' }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('status')).toBe('ACTIVE');
      req.flush(emptyPage());
    });

    it('joins categoryIds with a comma', () => {
      service.searchVendors({
        categoryIds: ['cuisine-camerounaise', 'cuisine-libanaise'],
      }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('categoryIds')).toBe('cuisine-camerounaise,cuisine-libanaise');
      req.flush(emptyPage());
    });

    it('omits categoryIds when the array is empty', () => {
      service.searchVendors({ categoryIds: [] }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.has('categoryIds')).toBeFalse();
      req.flush(emptyPage());
    });

    it('joins anyLocationIds with a comma', () => {
      service.searchVendors({
        anyLocationIds: ['loc-akwa', 'loc-bonapriso'],
      }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('anyLocationIds')).toBe('loc-akwa,loc-bonapriso');
      req.flush(emptyPage());
    });

    it('omits anyLocationIds when the array is empty', () => {
      service.searchVendors({ anyLocationIds: [] }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.has('anyLocationIds')).toBeFalse();
      req.flush(emptyPage());
    });

    it('sends page and size as strings', () => {
      service.searchVendors({ page: 2, size: 9 }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('9');
      req.flush(emptyPage());
    });

    it('sends page=0 without omitting it', () => {
      service.searchVendors({ page: 0 }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('page')).toBe('0');
      req.flush(emptyPage());
    });

    it('sends sortBy and sortDirection', () => {
      service.searchVendors({ sortBy: 'ratingAvg', sortDirection: 'DESC' }).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('sortBy')).toBe('ratingAvg');
      expect(req.request.params.get('sortDirection')).toBe('DESC');
      req.flush(emptyPage());
    });

    it('sends every field together', () => {
      const request: VendorSearchRequest = {
        keyword: 'pizza',
        businessName: 'Bella',
        status: 'ACTIVE',
        categoryIds: ['cuisine-italienne'],
        anyLocationIds: ['loc-marche'],
        page: 1,
        size: 12,
        sortBy: 'businessName',
        sortDirection: 'ASC',
      };

      service.searchVendors(request).subscribe();

      const req = http.expectOne((r) => r.url === PUBLIC_URL);
      expect(req.request.params.get('keyword')).toBe('pizza');
      expect(req.request.params.get('businessName')).toBe('Bella');
      expect(req.request.params.get('status')).toBe('ACTIVE');
      expect(req.request.params.get('categoryIds')).toBe('cuisine-italienne');
      expect(req.request.params.get('anyLocationIds')).toBe('loc-marche');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('size')).toBe('12');
      expect(req.request.params.get('sortBy')).toBe('businessName');
      expect(req.request.params.get('sortDirection')).toBe('ASC');
      req.flush(emptyPage());
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function emptyPage() {
    return {
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
      empty: true,
    };
  }
});
