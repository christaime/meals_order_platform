import { SearchRequest } from '@app/core/models/shared';
import { ModerationStatus } from './enum-type.model';
import { City } from './city.model';

export interface Location {
  readonly id: string;
  readonly vendorId: string;
  readonly vendorBusinessName: string;

  readonly name: string;
  readonly address: string;
  readonly phone: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly deliveryRadius: number | null;

  /** Nested city object, hydrated by the backend. Nullable until then. */
  readonly cityId: string | null;
  readonly city: City | null;

  readonly moderationStatus: ModerationStatus;
  readonly isActive: boolean;

  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LocationSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly moderationStatus: ModerationStatus;
  readonly city: City | null;
}

export interface LocationRequest {
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  deliveryRadius?: number;
  cityId: string;
}

export interface LocationSearchRequest extends SearchRequest {
  readonly vendorId?: string;
  readonly name?: string;
  readonly moderationStatus?: ModerationStatus;
  readonly nearLatitude?: number;
  readonly nearLongitude?: number;
  readonly radiusKm?: number;
  readonly cityIds?: string[];
  readonly cityNameLike?: string;
}
