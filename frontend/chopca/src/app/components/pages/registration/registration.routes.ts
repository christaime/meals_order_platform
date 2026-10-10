import { Routes } from '@angular/router';
import { mapsPreloadGuard } from '@core/guards/maps-preload.guard';
import { appGuard } from '@core/guards/app.guard';
/**
 * Public registration routes.
 *
 * Base path: /registration
 *
 * Currently implemented:
 * - /registration/vendor            → vendor registration
 */
export const REGISTRATION_ROUTES: Routes = [
    {
      path: 'vendor',
      canActivate: [appGuard,mapsPreloadGuard],
      loadComponent: () =>
        import('./vendor/vendor-registration.page')
          .then(m => m.VendorRegistrationPage),
      title: 'Chop ça! • Register as a vendor',
    }
];
