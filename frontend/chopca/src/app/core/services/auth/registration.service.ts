import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CreateVendorRequest } from '../../models/marketplace';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  async registerVendor(req: CreateVendorRequest): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/api/v1/vendors`, req)
    );
  }

  /*async registerCustomer(req: CreateCustomerRequest): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiBaseUrl}/api/v1/customers`, req)
    );
  }*/
}
