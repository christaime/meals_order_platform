import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CapacityRange } from '@app/core/models/marketplace';

/**
 * Abstract contract for capacity ranges.
 *
 * Provides the list of daily-preparation capacity tiers that a
 * vendor can declare during registration. Components inject
 * {@link CAPACITY_SERVICE} — never a concrete implementation.
 */
export abstract class CapacityService {
  /**
   * Fetch all capacity ranges.
   * Results are typically cached by the implementation.
   */
  abstract getCapacityRanges(): Observable<CapacityRange[]>;
}

export const CAPACITY_SERVICE = new InjectionToken<CapacityService>('CapacityService');
