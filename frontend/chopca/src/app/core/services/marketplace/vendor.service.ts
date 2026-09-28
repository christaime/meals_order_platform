import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Vendor,
  VendorSummary,
  VendorRequest,
  CreateVendorRequest,
  VendorDashboard,
  VendorStateChange,
  VendorSearchRequest
} from '@app/core/models/marketplace';
import { SearchRequest, DataPage } from '@core/models/shared';

export abstract class VendorService {
  abstract getVendors(): Observable<VendorSummary[]>;
  abstract getVendorById(id: string): Observable<Vendor>;
  abstract getOwnProfile(): Observable<Vendor>;
  abstract registerVendor(request: CreateVendorRequest): Observable<Vendor>;
  abstract updateVendor(id: string, request: Partial<VendorRequest>): Observable<Vendor>;
  abstract deleteVendor(id: string): Observable<void>;
  abstract getVendorDashboard(vendorId: string): Observable<VendorDashboard>;
  abstract getVendorStateHistory(vendorId: string): Observable<VendorStateChange[]>;
  abstract searchVendors(request: VendorSearchRequest): Observable<DataPage<VendorSummary>>;
}

export const VENDOR_SERVICE = new InjectionToken<VendorService>('VendorService');
