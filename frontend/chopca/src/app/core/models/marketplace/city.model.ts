import { SearchRequest } from '@app/core/models/shared';

export interface CitySearchRequest extends SearchRequest{
  readonly region?: string | null;
  readonly countryCode?: string | null;
}

export interface CityRequest {
  readonly name: string;
  readonly region: string | null;
  readonly countryCode: string;
}

export interface City {
  readonly id: string;
  readonly name: string;
  readonly region: string | null;
  readonly countryCode: string;
}
