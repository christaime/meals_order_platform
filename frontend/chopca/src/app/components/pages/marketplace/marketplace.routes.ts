import { Routes } from '@angular/router';
import { MealEditorStore } from '@components/marketplace/meal/editor/state/meal-editor.store';
import { mapsPreloadGuard } from '@core/guards/maps-preload.guard';
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
    title: 'Chop ça! • Les meilleurs plats camerounais livrés chez vous'
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./meal-detail/meal-detail.page')
        .then(m => m.MealDetailPageComponent),
    title: 'Détail du plat • Chop ça!',
  },
  {
    path: 'vendor/directory',
    canActivate: [mapsPreloadGuard],
    loadComponent: () =>
      import('@components/pages/marketplace/vendor-directory/vendor-directory.page')
        .then(m => m.VendorDirectoryPageComponent),
    title: 'Restaurants partenaires • Chop ça!',
  },
  {
    path: 'vendor/directory/:vendorId',
    loadComponent: () =>
      import('@components/pages/marketplace/vendor-detail/vendor-detail.page')
        .then(m => m.VendorDetailPageComponent),
    title: 'Restaurant • Chop ça!',
  }
];

/**
 * Administrator routes
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: 'cities',
    loadComponent: () =>
      import('./cities/cities.page')
        .then(m => m.CitiesPageComponent),
   title: 'Admin • Les villes',
  },
  {
      path: 'categories',
      loadComponent: () =>
        import('./categories/categories.page')
          .then(m => m.CategoriesPageComponent),
      title: 'Admin • Les categories de repas',
  },
  {
      path: 'ingredients',
      loadComponent: () =>
        import('./ingredients/ingredients.page')
          .then(m => m.IngredientsPageComponent),
      title: 'Admin • Les ingredients de repas',
  },
  {
    path: 'locations',
    canActivate: [mapsPreloadGuard],
    loadComponent: () =>
      import('./locations/locations.page')
        .then(m => m.LocationsPageComponent),
    title: 'Admin • Les emplacements de distribution de repas',
     data: { scope: 'admin' as const },
  },
  {
    path: 'meals',
    loadComponent: () =>
      import('@components/pages/marketplace/meals/meals.page')
        .then(m => m.MealsPageComponent),
    data: { scope: 'admin' as const },
  },
  {
    path: 'vendors',
    loadComponent: () =>
      import('@components/pages/marketplace/vendors/vendors.page')
        .then(m => m.VendorsPageComponent),
    title: 'Modération des vendeurs • Chop ça!',
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
      canActivate: [mapsPreloadGuard],
      loadComponent: () =>
        import('./locations/locations.page')
          .then(m => m.LocationsPageComponent),
      title: 'Vendor • Vos emplacements de distribution de repas',
      data: { scope: 'vendor' as const },
  },
  {
    path: 'meals',
    canActivate: [mapsPreloadGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
        import('@components/pages/marketplace/meals/meals.page')
          .then(m => m.MealsPageComponent),
        data: { scope: 'vendor' as const },
        title: 'Gérer les plats — Chop ça!',
      },
      {
        path: 'new',
        loadComponent: () => import('./meal-editor/meal-editor.page')
              .then(m => m.MealEditorPageComponent),
          providers: [MealEditorStore],   // ← fresh instance per visit
          title: 'Nouveau plat — Chop ça!',
        },
      {
        path: 'edit/:id',
        loadComponent: () => import('./meal-editor/meal-editor.page')
            .then(m => m.MealEditorPageComponent),
        providers: [MealEditorStore],   // ← fresh instance per visit
        title: 'Modifier un plat — Chop ça!',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./meal-detail/meal-detail.page')
            .then(m => m.MealDetailPageComponent),
        title: 'Détail du plat • Chop ça!',
      },
    ]
  }
];
