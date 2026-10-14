import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.page').then(
        (m) => m.LoginPageComponent
      ),
    title: 'routes.auth.login',
  },
  {
      path: 'callback',
      loadComponent: () =>
        import('../../auth/callback.component').then(m => m.CallbackComponent),
  }
];
