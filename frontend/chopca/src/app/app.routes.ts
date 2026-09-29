import { Routes } from '@angular/router';
import { MainLayoutComponent } from '@components/layout';
import { UserAccessDeniedPage } from '@components/pages/user-access-denied/user-access-denied.page';
import { appGuard } from '@core/guards/app.guard';

export const routes: Routes = [
  // Access denied to a route or page
  {
    path: 'user-access-denied',
    component: UserAccessDeniedPage
  },
  // Auth routes (Wrapped in AuthLayoutComponent)
  {
    path: 'auth',
    component: MainLayoutComponent,
    loadChildren: () =>
      import('./components/pages/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // Marketplace public routes (Wrapped in MainLayoutComponent)
  {
    path: '',
    component: MainLayoutComponent,
    loadChildren: () =>
      import('./components/pages/marketplace/marketplace.routes').then(
        (m) => m.MARKETPLACE_ROUTES
      ),
  },

  // Marketplace admin routes (Wrapped in MainLayoutComponent)
    {
      path: 'admin',
      canActivate: [appGuard],
      loadComponent: () =>
            import('./components/layout/auth-layout/auth-layout.component').then(
              (m) => m.AuthLayoutComponent
            ),
      loadChildren: () =>
        import('./components/pages/marketplace/marketplace.routes').then(
          (m) => m.ADMIN_ROUTES
        ),
    },

   // Registration routes (Wrapped in AuthLayoutComponent)
    {
      path: 'registration',
      canActivate: [appGuard],
      loadComponent: () =>
            import('./components/layout/auth-layout/auth-layout.component').then(
              (m) => m.AuthLayoutComponent
            ),
      loadChildren: () =>
        import('./components/pages/registration/registration.routes').then(
          (m) => m.REGISTRATION_ROUTES
        ),
    },

    // Vendor routes (Wrapped in AuthLayoutComponent)
    {
       path: 'vendor',
       canActivate: [appGuard],
       loadComponent: () =>
             import('./components/layout/auth-layout/auth-layout.component').then(
               (m) => m.AuthLayoutComponent
             ),
       loadChildren: () =>
         import('./components/pages/marketplace/marketplace.routes').then(
           (m) => m.VENDOR_ROUTES
         ),
     },

  // Fallback
  { path: '**', redirectTo: 'meals' },
];
