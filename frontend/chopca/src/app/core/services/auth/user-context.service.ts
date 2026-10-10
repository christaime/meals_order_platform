import { InjectionToken, Signal} from '@angular/core';
import { UserContext , VendorContext, CustomerContext, AdminContext} from '../../models/auth/user-context.model';

export abstract class UserContextService {

  abstract readonly context: Signal<UserContext | null>;
  abstract readonly loading: Signal<boolean>;

  abstract readonly vendor: Signal<VendorContext | null>;
  abstract readonly customer: Signal<CustomerContext | null>;
  abstract readonly admin: Signal<AdminContext | null>;

  abstract readonly hasVendor: Signal<boolean>;
  abstract readonly hasCustomer: Signal<boolean>;
  abstract readonly hasAdmin: Signal<boolean>;

  /** Loads context if not already loaded. Safe to call on every navigation. */
  abstract ensureLoaded(): Promise<UserContext | null> ;

  /** Forces a fresh fetch. Use after role changes or after registration. */
  abstract reload(): Promise<UserContext | null> ;

  abstract clear(): void ;
}

export const USER_CONTEXT_SERVICE = new InjectionToken<UserContextService>('UserContextService');
