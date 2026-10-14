import { Routes } from '@angular/router';
import { MealEditorStore } from '@components/marketplace/meal/editor/state/meal-editor.store';
import { mapsPreloadGuard } from '@core/guards/maps-preload.guard';
import { appGuard } from '@core/guards/app.guard';

/**
 * Public marketplace routes.
 *
 * Base path: /meals
 *
 * Currently implemented:
 * - /meals            → marketplace home (to be built)
 */
export const MARKETPLACE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [mapsPreloadGuard],
    loadComponent: () =>
      import('./marketplace-home/marketplace-home.page')
        .then(m => m.MarketplaceHomePageComponent),
    title: 'routes.marketplace.home',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./meal-detail/meal-detail.page')
        .then(m => m.MealDetailPageComponent),
    title: 'routes.marketplace.mealDetail',
  },
  {
    path: 'vendor/directory',
    canActivate: [mapsPreloadGuard],
    loadComponent: () =>
      import('@components/pages/marketplace/vendor-directory/vendor-directory.page')
        .then(m => m.VendorDirectoryPageComponent),
    title: 'routes.marketplace.vendorDirectory',
  },
  {
    path: 'vendor/directory/:vendorId',
    loadComponent: () =>
      import('@components/pages/marketplace/vendor-detail/vendor-detail.page')
        .then(m => m.VendorDetailPageComponent),
    title: 'routes.marketplace.vendorDetail',
  }
];

/**
 * Administrator routes
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'cities',
    canActivate: [appGuard],
    loadComponent: () =>
      import('./cities/cities.page')
        .then(m => m.CitiesPageComponent),
    title: 'routes.admin.cities',
  },
  {
    path: 'categories',
    canActivate: [appGuard],
    loadComponent: () =>
      import('./categories/categories.page')
        .then(m => m.CategoriesPageComponent),
    title: 'routes.admin.categories',
  },
  {
    path: 'ingredients',
    canActivate: [appGuard],
    loadComponent: () =>
      import('./ingredients/ingredients.page')
        .then(m => m.IngredientsPageComponent),
    title: 'routes.admin.ingredients',
  },
  {
    path: 'locations',
    canActivate: [appGuard, mapsPreloadGuard],
    loadComponent: () =>
      import('./locations/locations.page')
        .then(m => m.LocationsPageComponent),
    title: 'routes.admin.locations',
    data: { scope: 'admin' as const },
  },
  {
    path: 'meals',
    canActivate: [appGuard],
    loadComponent: () =>
      import('@components/pages/marketplace/meals/meals.page')
        .then(m => m.MealsPageComponent),
    title: 'routes.admin.meals',
    data: { scope: 'admin' as const },
  },
  {
    path: 'vendors',
    canActivate: [appGuard],
    loadComponent: () =>
      import('@components/pages/marketplace/vendors/vendors.page')
        .then(m => m.VendorsPageComponent),
    title: 'routes.admin.vendors',
  }
];

/**
 * Vendor workspace route
 * Planned:
 * - /meals/list       → vendor meals list
 * - /meals/edit/:id    → vendor meal edit detail
 */
export const VENDOR_ROUTES: Routes = [
  {
    path: 'locations',
    canActivate: [appGuard, mapsPreloadGuard],
    loadComponent: () =>
      import('./locations/locations.page')
        .then(m => m.LocationsPageComponent),
    title: 'routes.vendor.locations',
    data: { scope: 'vendor' as const },
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./vendor-profile/vendor-profile.page')
        .then((m) => m.VendorProfilePageComponent),
    title: 'routes.vendor.profile',
  },
  {
    path: 'meals',
    canActivate: [appGuard, mapsPreloadGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('@components/pages/marketplace/meals/meals.page')
            .then(m => m.MealsPageComponent),
        data: { scope: 'vendor' as const },
        title: 'routes.vendor.meals',
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./meal-editor/meal-editor.page')
            .then(m => m.MealEditorPageComponent),
        providers: [MealEditorStore],
        title: 'routes.vendor.mealNew',
      },
      {
        path: 'edit/:id',
        loadComponent: () =>
          import('./meal-editor/meal-editor.page')
            .then(m => m.MealEditorPageComponent),
        providers: [MealEditorStore],
        title: 'routes.vendor.mealEdit',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./meal-detail/meal-detail.page')
            .then(m => m.MealDetailPageComponent),
        title: 'routes.vendor.mealDetail',
      },
    ]
  }
];
