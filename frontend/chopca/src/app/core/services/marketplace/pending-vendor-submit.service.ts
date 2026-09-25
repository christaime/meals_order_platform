// src/app/core/services/pending-vendor-submit.service.ts

import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';
import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { VendorRequest } from '@app/core/models/marketplace';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PendingVendorSubmitService {
  private readonly keycloak = inject(Keycloak);
  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly router = inject(Router);

  /**
   * Called from VendorRegisterPageComponent's ngOnInit.
   * If a pending registration exists and the user is authenticated,
   * submits the vendor profile and navigates to the dashboard.
   */
  async submitIfPending(): Promise<boolean> {
    const raw = sessionStorage.getItem('vendor.pendingRegistration');
    if (!raw) return false;

    const isLoggedIn = await this.keycloak.authenticated;
    if (!isLoggedIn) return false;

    const { formData } = JSON.parse(raw);

    const request: VendorRequest = {
      businessName: formData.businessName,
      description: '',
      address: `${formData.district ?? ''} ${formData.addressDetail ?? ''}`.trim(),
      email: '', // backend extracts from JWT
      phone: formData.payoutMtnPhone,
      password: '',
      cuisineCategoryIds: formData.cuisineIds,
    };

    return new Promise((resolve) => {
      this.vendorService.registerVendor(request).subscribe({
        next: () => {
          sessionStorage.removeItem('vendor.pendingRegistration');
          this.router.navigate(['/vendor/dashboard']); // redirect to dashboard
          resolve(true);
        },
        error: (err) => {
          console.error('[PendingVendorSubmit] error', err);
          resolve(false);
        },
      });
    });
  }
}
