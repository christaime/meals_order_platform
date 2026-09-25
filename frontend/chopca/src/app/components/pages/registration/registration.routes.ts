import { Routes } from '@angular/router';
import { vendorRegistrationGuard } from "@core/guards/vendor-registration.guard";
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
    path: 'registration',
    children: [
      {
        path: 'vendor',
        loadComponent: () =>
          import('./vendor/vendor-registration.page')
            .then(m => m.VendorRegistrationPage),
        title: 'Chop ça! • Register as a vendor',
      },
    ],
  },
];
