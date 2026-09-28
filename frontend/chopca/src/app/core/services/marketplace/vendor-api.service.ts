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
  VendorSearchRequest
} from '@app/core/models/marketplace';
import { VendorService } from './vendor.service';
import { environment } from '@environments/environment';
import { SearchRequest, DataPage } from '@core/models/shared';

@Injectable()
export class VendorApiService implements VendorService {

  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/vendor`;

  getVendors(): Observable<VendorSummary[]> {
    return this.http.get<VendorSummary[]>(this.baseUrl);
  }

  getVendorById(id: string): Observable<Vendor> {
    return this.http.get<Vendor>(`${this.baseUrl}/${id}`);
  }

  getOwnProfile(): Observable<Vendor> {
    return this.http.get<Vendor>(`${this.baseUrl}/me`);
  }

  registerVendor(request: CreateVendorRequest): Observable<Vendor> {
    return this.http.post<Vendor>(`${this.baseUrl}/register`, request);
  }

  updateVendor(id: string, request: Partial<VendorRequest>): Observable<Vendor> {
    return this.http.put<Vendor>(`${this.baseUrl}/${id}`, request);
  }

  deleteVendor(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getVendorDashboard(vendorId: string): Observable<VendorDashboard> {
    return this.http.get<VendorDashboard>(`${this.baseUrl}/${vendorId}/dashboard`);
  }

  getVendorStateHistory(vendorId: string): Observable<VendorStateChange[]> {
    return this.http.get<VendorStateChange[]>(`${this.baseUrl}/${vendorId}/state-history`);
  }

  searchVendors(req: VendorSearchRequest): Observable<DataPage<VendorSummary>> {
    let params = new HttpParams();
    if (req.keyword)     params = params.set('keyword', req.keyword);
    if (req.status)      params = params.set('status', req.status);
    if (req.page != null) params = params.set('page', req.page.toString());
    if (req.size != null) params = params.set('size', req.size.toString());
    if (req.sortBy)       params = params.set('sortBy', req.sortBy);
    if (req.sortDirection) params = params.set('sortDirection', req.sortDirection);
    return this.http.get<DataPage<VendorSummary>>(
      `${environment.apiUrl}/admin/vendors`, { params }
    );
  }
}
