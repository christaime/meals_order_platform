import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';

import { MealApiService } from './meal-api.service';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { WorkspaceService } from './workspace.service';
import { environment } from '@environments/environment';

describe('MealApiService — search params', () => {
  let service: MealApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    const authMock = {
      isAdmin: signal(false),
      isVendor: signal(false),
      isCustomer: signal(false),
      isAuthenticated: signal(false),
      isAnonymous: signal(true),
      roles: signal(new Set()),
      isAuthenticatedNow: () => false,
      getUserEmail: () => undefined,
      getUserName: () => undefined,
      reload: () => {},
      login: () => Promise.resolve(),
      logout: () => Promise.resolve(),
      refreshToken: () => Promise.resolve(),
      getToken: () => null,
      updateToken: () => Promise.resolve(false),
      logoutRequested: signal(0),
    };

    const workspaceMock = {
      isAdminWorkspace: () => false,
      isVendorWorkspace: () => false,
      isCustomerWorkspace: () => true,
      isPublicWorkspace: () => true,
      workspace: () => 'customer',
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        MealApiService,
        { provide: KEYCLOAK_SERVICE, useValue: authMock },
        { provide: WorkspaceService, useValue: workspaceMock },
      ],
    });

    service = TestBed.inject(MealApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  // ═══════════════════════════════════════════════════════════
  //  Helper
  // ═══════════════════════════════════════════════════════════

  function searchParams(request: any): {
    url: string;
    params: URLSearchParams;
  } {
    service.search(request).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/public/meals`);
    req.flush({
      content: [], page: 0, size: 20, totalElements: 0,
      totalPages: 0, first: true, last: true, empty: true,
    });
    return {
      url: req.request.url,
      params: new URLSearchParams(req.request.params.toString()),
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  Individual params
  // ═══════════════════════════════════════════════════════════

  it('sends the keyword param', () => {
    const { params } = searchParams({ keyword: 'taro' });
    expect(params.get('keyword')).toBe('taro');
  });

  it('sends the vendorId param', () => {
    const { params } = searchParams({ vendorId: 'vendor-1' });
    expect(params.get('vendorId')).toBe('vendor-1');
  });

  it('sends the businessName param', () => {
    const { params } = searchParams({ businessName: 'Chaudron' });
    expect(params.get('businessName')).toBe('Chaudron');
  });

  it('sends cuisineIds as a comma-joined string', () => {
    const { params } = searchParams({ cuisineIds: ['a', 'b', 'c'] });
    expect(params.get('cuisineIds')).toBe('a,b,c');
  });

  it('sends dishTypeIds as a comma-joined string', () => {
    const { params } = searchParams({ dishTypeIds: ['x', 'y'] });
    expect(params.get('dishTypeIds')).toBe('x,y');
  });

  it('sends categoryIds as a comma-joined string', () => {
    const { params } = searchParams({ categoryIds: ['p', 'q'] });
    expect(params.get('categoryIds')).toBe('p,q');
  });

  it('sends excludeIngredientIds as a comma-joined string', () => {
    const { params } = searchParams({ excludeIngredientIds: ['i1', 'i2'] });
    expect(params.get('excludeIngredientIds')).toBe('i1,i2');
  });

  it('sends distributionLocationIds as a comma-joined string', () => {
    const { params } = searchParams({ distributionLocationIds: ['l1', 'l2', 'l3'] });
    expect(params.get('distributionLocationIds')).toBe('l1,l2,l3');
  });

  it('sends minPrice and maxPrice as strings', () => {
    const { params } = searchParams({ minPrice: 1000, maxPrice: 5000 });
    expect(params.get('minPrice')).toBe('1000');
    expect(params.get('maxPrice')).toBe('5000');
  });

  it('sends minRating as a string', () => {
    const { params } = searchParams({ minRating: 4.5 });
    expect(params.get('minRating')).toBe('4.5');
  });

  it('sends minPrepTime and maxPrepTime', () => {
    const { params } = searchParams({ minPrepTime: 10, maxPrepTime: 45 });
    expect(params.get('minPrepTime')).toBe('10');
    expect(params.get('maxPrepTime')).toBe('45');
  });

  it('sends cityId', () => {
    const { params } = searchParams({ cityId: 'city-douala' });
    expect(params.get('cityId')).toBe('city-douala');
  });

  it('sends page and size', () => {
    const { params } = searchParams({ page: 2, size: 12 });
    expect(params.get('page')).toBe('2');
    expect(params.get('size')).toBe('12');
  });

  it('sends sortBy and sortDirection', () => {
    const { params } = searchParams({ sortBy: 'price', sortDirection: 'ASC' });
    expect(params.get('sortBy')).toBe('price');
    expect(params.get('sortDirection')).toBe('ASC');
  });

  it('sends loadFull=true when requested', () => {
    const { params } = searchParams({ loadFull: true });
    expect(params.get('loadFull')).toBe('true');
  });

  it('sends withCount=true when requested', () => {
    const { params } = searchParams({ withCount: true });
    expect(params.get('withCount')).toBe('true');
  });

  // ═══════════════════════════════════════════════════════════
  //  Omission — optional filters must not be sent when absent
  // ═══════════════════════════════════════════════════════════

  it('omits every optional param when the request is empty', () => {
    const { params } = searchParams({});
    expect([...params.keys()]).toEqual([]);
  });

  it('omits array params when the array is empty', () => {
    const { params } = searchParams({
      cuisineIds: [],
      dishTypeIds: [],
      excludeIngredientIds: [],
      distributionLocationIds: [],
    });
    expect(params.has('cuisineIds')).toBe(false);
    expect(params.has('dishTypeIds')).toBe(false);
    expect(params.has('excludeIngredientIds')).toBe(false);
    expect(params.has('distributionLocationIds')).toBe(false);
  });

  it('omits numeric params when they are null', () => {
    const { params } = searchParams({
      minPrice: null,
      maxPrice: null,
      minRating: null,
      page: null,
      size: null,
    });
    expect(params.has('minPrice')).toBe(false);
    expect(params.has('maxPrice')).toBe(false);
    expect(params.has('minRating')).toBe(false);
    expect(params.has('page')).toBe(false);
    expect(params.has('size')).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════
  //  Combined — the "filters not applied" regression
  // ═══════════════════════════════════════════════════════════

  it('sends every active filter together', () => {
    const { params } = searchParams({
      keyword: 'poulet',
      cuisineIds: ['cuisine-camerounaise'],
      dishTypeIds: ['dish-grill'],
      excludeIngredientIds: ['ing-arachide'],
      minPrice: 500,
      maxPrice: 10000,
      minRating: 3,
      maxPrepTime: 60,
      page: 0,
      size: 12,
      sortBy: 'price',
      sortDirection: 'ASC',
    });

    expect(params.get('keyword')).toBe('poulet');
    expect(params.get('cuisineIds')).toBe('cuisine-camerounaise');
    expect(params.get('dishTypeIds')).toBe('dish-grill');
    expect(params.get('excludeIngredientIds')).toBe('ing-arachide');
    expect(params.get('minPrice')).toBe('500');
    expect(params.get('maxPrice')).toBe('10000');
    expect(params.get('minRating')).toBe('3');
    expect(params.get('maxPrepTime')).toBe('60');
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('12');
    expect(params.get('sortBy')).toBe('price');
    expect(params.get('sortDirection')).toBe('ASC');
  });
});
