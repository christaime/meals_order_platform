import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Vendor,
  VendorSummary,
  VendorRequest,
  CreateVendorRequest,
  VendorDashboard,
  VendorStateChange,
  VendorSearchRequest,
} from '@app/core/models/marketplace';
import { SearchRequest, DataPage } from '@core/models/shared';

export abstract class VendorService {
  // ─── Reads ────────────────────────────────────────────────
  abstract getVendors(): Observable<VendorSummary[]>;
  abstract getVendorById(id: string): Observable<Vendor>;
  abstract getOwnProfile(): Observable<Vendor>;
  abstract searchVendors(request: VendorSearchRequest): Observable<DataPage<Vendor>>;
  abstract getVendorDashboard(vendorId: string): Observable<VendorDashboard>;
  abstract getVendorStateHistory(vendorId: string): Observable<VendorStateChange[]>;

  // ─── Writes ───────────────────────────────────────────────
  abstract registerVendor(request: CreateVendorRequest): Observable<Vendor>;
  abstract updateVendor(id: string, request: Partial<VendorRequest>): Observable<Vendor>;
  abstract deleteVendor(id: string): Observable<void>;

  // ─── Admin state transitions ──────────────────────────────
  abstract activateVendor(id: string): Observable<Vendor>;
  abstract suspendVendor(id: string, reason: string): Observable<Vendor>;
  abstract banVendor(id: string, reason: string): Observable<Vendor>;
  abstract deactivateVendor(id: string, reason?: string): Observable<Vendor>;
}

export const VENDOR_SERVICE = new InjectionToken<VendorService>('VendorService');
