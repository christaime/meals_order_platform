import { Provider } from '@angular/core';
import { environment } from '@environments/environment';

// ─── Production contracts ─────────────────────────────────────
import { MEAL_SERVICE } from './marketplace/meal.service';
import { MealApiService } from './marketplace/meal-api.service';

import { CATEGORY_SERVICE } from './marketplace/category.service';
import { CategoryApiService } from './marketplace/category-api.service';

import { INGREDIENT_SERVICE } from './marketplace/ingredient.service';
import { IngredientApiService } from './marketplace/ingredient-api.service';

import { LOCATION_SERVICE } from './marketplace/location.service';
import { LocationApiService } from './marketplace/location-api.service';

import { VENDOR_SERVICE } from './marketplace/vendor.service';
import { VendorApiService } from './marketplace/vendor-api.service';

import { CITY_SERVICE } from './marketplace/city.service';
import { CityApiService } from './marketplace/city-api.service';

import { CAPACITY_SERVICE } from './marketplace/capacity.service';
import { CapacityApiService } from './marketplace/capacity-api.service';

import { MODERATION_SERVICE } from './marketplace/moderation.service';
import { ModerationApiService } from './marketplace/moderation-api.service';

// ─── Mock implementations (isolated in /mock) ─────────────────
import { MealMockService } from '@app/mock/services/meal-mock.service';
import { CategoryMockService } from '@app/mock/services/category-mock.service';
import { IngredientMockService } from '@app/mock/services/ingredient-mock.service';
import { LocationMockService } from '@app/mock/services/location-mock.service';
import { VendorMockService } from '@app/mock/services/vendor-mock.service';
import { CityMockService } from '@app/mock/services/city-mock.service';
import { CapacityMockService } from '@app/mock/services/capacity-mock.service';
import { ModerationMockService } from '@app/mock/services/moderation-mock.service';

import { MEDIA_SERVICE } from './marketplace/media.service';
import { MediaApiService } from './marketplace/media-api.service';
import { MediaMockService } from '@app/mock/services/media-mock.service';

/**
 * Service providers with environment-based switching.
 *
 * Every domain contract is bound to either its Mock or API implementation
 * depending on `environment.useMockServices`.
 *
 * To migrate from mock to real:
 * 1. Set `useMockServices: false` in environment.ts
 * 2. Delete `src/app/mock/` and the mock imports below
 * 3. That's it — no component changes.
 */
export const SERVICE_PROVIDERS: Provider[] = [
  {
    provide: MEAL_SERVICE,
    useClass: environment.useMockServices ? MealMockService : MealApiService,
  },
  {
    provide: CATEGORY_SERVICE,
    useClass: environment.useMockServices ? CategoryMockService : CategoryApiService,
  },
  {
    provide: INGREDIENT_SERVICE,
    useClass: environment.useMockServices ? IngredientMockService : IngredientApiService,
  },
  {
    provide: LOCATION_SERVICE,
    useClass: environment.useMockServices ? LocationMockService : LocationApiService,
  },
  {
    provide: VENDOR_SERVICE,
    useClass: environment.useMockServices ? VendorMockService : VendorApiService,
  },
   {
     provide: CITY_SERVICE,
     useClass: environment.useMockServices ? CityMockService : CityApiService,
   },
   {
     provide: CAPACITY_SERVICE,
     useClass: environment.useMockServices ? CapacityMockService : CapacityApiService,
   },
   {
     provide: MEDIA_SERVICE,
     useClass: environment.useMockServices ? MediaMockService : MediaApiService,
   },
   {
     provide: MODERATION_SERVICE,
     useClass: environment.useMockServices ? ModerationMockService : ModerationApiService,
   },
];
