import { SearchRequest } from '@app/core/models/shared';
import { ModerationStatus } from './enum-type.model';

/**
 * Full distribution location — returned by detail endpoints.
 * Mirror of backend `LocationResponse`.
 */
export interface Location {
  readonly id: string;

  // Vendor scope (flattened reference)
  readonly vendorId: string;
  readonly vendorBusinessName: string;

  // Location details
  readonly name: string;
  readonly address: string;
  readonly phone: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly deliveryRadius: number | null;

  // Moderation
  readonly moderationStatus: ModerationStatus;
  readonly isActive: boolean;

  // Timestamps
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Lightweight location — used inside Meal and Vendor responses.
 * Mirror of backend `LocationSummaryResponse`.
 */
export interface LocationSummary {
  readonly id: string;
  readonly name: string;
  readonly address: string;
  readonly moderationStatus: ModerationStatus;
}

/**
 * Request payload for creating or updating a distribution location.
 *
 * On CREATE: use `LocationRequest` — name, address, latitude, longitude required.
 * On UPDATE: use `Partial<LocationRequest>`.
 *
 * Note: vendor is NOT in the request — derived from the security context.
 */
export interface LocationRequest {
  name: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  deliveryRadius?: number;
}

/**
 * Filters for the distribution location search endpoint.
 *
 * Extends the generic {@link SearchRequest} with location-specific filters.
 */
export interface LocationSearchRequest extends SearchRequest {
  /** Filter by vendor ID. */
  readonly vendorId?: string;

  /** Exact name match (case-insensitive). */
  readonly name?: string;

  /** Filter by moderation status. */
  readonly moderationStatus?: ModerationStatus;

  /** Proximity search — filter locations within `radius` km of (lat, lng). */
  readonly nearLatitude?: number;
  readonly nearLongitude?: number;
  readonly radiusKm?: number;
}
