import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserContext } from '@core/models/auth/user-context.model';
import { UserContextService } from '@core/services/auth/user-context.service';
import { KEYCLOAK_SERVICE } from '@core/services/auth';

@Injectable()
export class UserContextMockService implements UserContextService{

  readonly keycloak = inject(KEYCLOAK_SERVICE);
  readonly context = signal<UserContext | null>(null);
  readonly loading = signal<boolean>(false);

  readonly vendor = computed(() => this.context()?.vendor ?? null);
  readonly customer = computed(() => this.context()?.customer ?? null);
  readonly admin = computed(() => this.context()?.admin ?? null);

  readonly hasVendor = computed(() => this.vendor() !== null);
  readonly hasCustomer = computed(() => this.customer() !== null);
  readonly hasAdmin = computed(() => this.admin() !== null);

  async ensureLoaded(): Promise<UserContext | null> {
    return this.context();
  }

  /** Forces a fresh fetch. Use after role changes or after registration. */
  async reload(): Promise<UserContext | null> {
      const context: UserContext =  {
        keycloakId: "user-id",
        email: this.keycloak.getUserEmail(),
        vendor: this.keycloak.isVendor() ? {
                  id: "vendor-chaudron",
                  businessName: "Le Chaudron du bon gout",
                  status: 'ACTIVE',
                  profileImageUrl: null,
                  profileImageStorageRef: null
                }: null,
        customer: this.keycloak.isCustomer() ? {
                    id: "customer-1",
                    displayName: "The customer",
                    status: 'ACTIVE'
                  }: null,
        admin: this.keycloak.isAdmin() ? {
                id: "admin-1",
                displayName: this.keycloak.getUserName()?? "Admin",
                status: 'ACTIVE'
              }: null
      };
    this.context.set(context);
    return context;
  }

  clear(): void {
    this.context.set(null);
  }

}
