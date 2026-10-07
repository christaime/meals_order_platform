import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
import { VendorService } from './vendor.service';
import { environment } from '@environments/environment';
import { DataPage } from '@core/models/shared';
import { WorkspaceService } from './workspace.service';

@Injectable()
export class VendorApiService implements VendorService {

  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vendor`;
  private readonly workspace = inject(WorkspaceService);

  /** Public meal browsing endpoints. */
  private readonly publicUrl = `${environment.apiUrl}/public/vendors`;

  /** Admin / vendor management endpoints. */
  private readonly adminUrl = `${environment.apiUrl}/admin/vendors`;

  // ─── Reads ────────────────────────────────────────────────

  getVendors(): Observable<VendorSummary[]> {
    return this.http.get<VendorSummary[]>(this.getReadBaseUrl());
  }

  getVendorById(id: string): Observable<Vendor> {
    return this.http.get<Vendor>(`${this.getReadBaseUrl()}/${id}`);
  }

  getOwnProfile(): Observable<Vendor> {
    return this.http.get<Vendor>(`${this.baseUrl}/me`);
  }

  searchVendors(request: VendorSearchRequest): Observable<DataPage<Vendor>> {
    let params = new HttpParams();
    if (request.keyword)       params = params.set('keyword', request.keyword);
    if (request.businessName)  params = params.set('businessName', request.businessName);
    if (request.email)         params = params.set('email', request.email);
    if (request.categoryIds?.length)         params = params.set('categoryIds', request.categoryIds.join(','));
    if (request.anyLocationIds?.length)         params = params.set('anyLocationIds', request.anyLocationIds.join(','));
    if (request.status)        params = params.set('status', request.status);
    if (request.page != null)  params = params.set('page', request.page.toString());
    if (request.size != null)  params = params.set('size', request.size.toString());
    if (request.sortBy)        params = params.set('sortBy', request.sortBy);
    if (request.sortDirection) params = params.set('sortDirection', request.sortDirection);

    return this.http.get<DataPage<Vendor>>(
      this.getReadBaseUrl(), { params }
    );
  }

  getVendorDashboard(vendorId: string): Observable<VendorDashboard> {
    return this.http.get<VendorDashboard>(`${this.baseUrl}/${vendorId}/dashboard`);
  }

  getVendorStateHistory(vendorId: string): Observable<VendorStateChange[]> {
    return this.http.get<VendorStateChange[]>(`${this.baseUrl}/${vendorId}/state-history`);
  }

  // ─── Writes ───────────────────────────────────────────────

  registerVendor(request: CreateVendorRequest): Observable<Vendor> {
    return this.http.post<Vendor>(`${this.baseUrl}/register`, request);
  }

  updateVendor(id: string, request: Partial<VendorRequest>): Observable<Vendor> {
    return this.http.put<Vendor>(`${this.baseUrl}/${id}`, request);
  }

  deleteVendor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ─── Helpers ──────────────────────────────────────────────
  private getReadBaseUrl(): string {
      return this.workspace.isAdminWorkspace() ? this.adminUrl : this.publicUrl;
  }
  // ─── Admin state transitions ──────────────────────────────

  activateVendor(id: string): Observable<Vendor> {
    return this.http.post<Vendor>(
      `${this.adminUrl}/${id}/activate`,
      {},
    );
  }

  suspendVendor(id: string, reason: string): Observable<Vendor> {
    return this.http.post<Vendor>(
      `${this.adminUrl}/${id}/suspend`,
      { reason },
    );
  }

  banVendor(id: string, reason: string): Observable<Vendor> {
    return this.http.post<Vendor>(
      `${this.adminUrl}/${id}/ban`,
      { reason },
    );
  }

  deactivateVendor(id: string, reason?: string): Observable<Vendor> {
    return this.http.post<Vendor>(
      `${this.adminUrl}/${id}/deactivate`,
      reason ? { reason } : {},
    );
  }
}
