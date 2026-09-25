import { Routes } from '@angular/router';
import { MainLayoutComponent } from '@components/layout';

export const routes: Routes = [

  // Auth routes (Wrapped in AuthLayoutComponent)
  {
    path: 'auth',
    loadComponent: () =>
      import('./components/layout/auth-layout/auth-layout.component').then(
        (m) => m.AuthLayoutComponent
      ),
    loadChildren: () =>
      import('./components/pages/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Marketplace routes (Wrapped in MainLayoutComponent)
  {
    path: '',
    component: MainLayoutComponent,
    loadChildren: () =>
      import('./components/pages/marketplace/marketplace.routes').then(
        (m) => m.MARKETPLACE_ROUTES
      ),
  },

  // Registration routes (Wrapped in AuthLayoutComponent)
    {
      path: '',
      loadComponent: () =>
            import('./components/layout/auth-layout/auth-layout.component').then(
              (m) => m.AuthLayoutComponent
            ),
      loadChildren: () =>
        import('./components/pages/registration/registration.routes').then(
          (m) => m.REGISTRATION_ROUTES
        ),
    },

  // Fallback
  { path: '**', redirectTo: 'meals' },
];
