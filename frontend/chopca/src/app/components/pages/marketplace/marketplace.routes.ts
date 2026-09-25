import { Routes } from '@angular/router';
import { MealEditorStore } from '@components/marketplace/meal/editor/state/meal-editor.store';

/**
 * Public marketplace routes.
 *
 * Base path: /meals
 *
 * Currently implemented:
 * - /meals            → marketplace home (to be built)
 * - /meals/:id        → meal detail page (exists)
 *
 * Planned:
 * - /meals/restaurants       → vendor list
 * - /meals/restaurant/:id    → vendor detail
 */
export const MARKETPLACE_ROUTES: Routes = [
  {
    path: 'meals',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./marketplace-home/marketplace-home.page')
            .then(m => m.MarketplaceHomePageComponent),
        title: 'Chop ça! • Les meilleurs plats camerounais livrés chez vous',
      },

      {
        path: 'edit',
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
    ],
  },
];
