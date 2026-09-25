import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CapacityRange } from '@app/core/models/marketplace';
import { CapacityService } from '@app/core/services/marketplace/capacity.service';
import capacityData from '@app/mock/data/capacity-ranges.json';

/**
 * Mock implementation of CapacityService.
 * Loads data from a JSON file at startup (bundled into the build).
 */
@Injectable()
export class CapacityMockService implements CapacityService {

  private readonly ranges: CapacityRange[] = capacityData as CapacityRange[];
  private readonly latency = 200;

  getCapacityRanges(): Observable<CapacityRange[]> {
    return of(this.ranges).pipe(delay(this.latency));
  }
}
