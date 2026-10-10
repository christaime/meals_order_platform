import {
  Injectable,
  signal,
} from '@angular/core';
import { City } from '@core/models/marketplace';

@Injectable()
export class VendorContextService {
  readonly vendorId = signal<string | null>(null);
  readonly vendorCities = signal<City[] | null>(null);
}
