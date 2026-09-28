import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
  Vendor,
  VendorSummary,
  VendorRequest,
  CreateVendorRequest,
  VendorDashboard,
  VendorStateChange,
  VendorSearchRequest
} from '@app/core/models/marketplace';
import { VendorService } from '@app/core/services/marketplace/vendor.service';
import vendorsData from '@app/mock/data/vendors.json';
import { SearchRequest, DataPage } from '@core/models/shared';

@Injectable()
export class VendorMockService implements VendorService {

  private vendors: Vendor[] = vendorsData as Vendor[];
  private readonly latency = 300;

  getVendors(): Observable<VendorSummary[]> {
    const summaries: VendorSummary[] = this.vendors.map(this.toSummary);
    return of(summaries).pipe(delay(this.latency));
  }

  getVendorById(id: string): Observable<Vendor> {
    const vendor = this.vendors.find(v => v.id === id);
    if (!vendor) {
      return throwError(() => new Error(`Vendor not found: ${id}`)).pipe(delay(this.latency));
    }
    return of(vendor).pipe(delay(this.latency));
  }

  getOwnProfile(): Observable<Vendor> {
    // In mock, just return the first vendor as "self".
    return of(this.vendors[0]).pipe(delay(this.latency));
  }

    registerVendor(request: CreateVendorRequest): Observable<Vendor> {
      const now = new Date().toISOString();
      const newVendor: Vendor = {
        id: crypto.randomUUID(),
        userId: 'mock-user',
        businessName: request.businessName,
        description: request.description,
        address: request.address,
        email: '',                            // not part of CreateVendorRequest; backend fills later
        phone: request.phone,
        ratingAvg: 0,
        totalRatings: 0,
        status: 'PENDING',
        statusReason: 'Registration initiated, awaiting activation',
        statusChangedAt: now,
        statusChangedBy: 'system',
        statusChangeType: 'SYSTEM',
        subscriptionTier: 'FREE',
        deliveryRadius: request.deliveryRadius,
        pickupAddress: request.pickupAddress,
        profileImageUrl: null,
        coverImageUrl: null,
        cuisines: [],
        distributionLocations: [],
        createdAt: now,
        updatedAt: now,
      };
      this.vendors = [...this.vendors, newVendor];
      return of(newVendor).pipe(delay(this.latency));
    }

  updateVendor(id: string, request: Partial<VendorRequest>): Observable<Vendor> {
    const index = this.vendors.findIndex(v => v.id === id);
    if (index === -1) {
      return throwError(() => new Error(`Vendor not found: ${id}`)).pipe(delay(this.latency));
    }
    const updated: Vendor = {
      ...this.vendors[index],
      ...request,
      id,
      updatedAt: new Date().toISOString(),
    } as Vendor;
    this.vendors = [
      ...this.vendors.slice(0, index),
      updated,
      ...this.vendors.slice(index + 1),
    ];
    return of(updated).pipe(delay(this.latency));
  }

  deleteVendor(id: string): Observable<void> {
    this.vendors = this.vendors.filter(v => v.id !== id);
    return of(void 0).pipe(delay(this.latency));
  }

  getVendorDashboard(vendorId: string): Observable<VendorDashboard> {
    // Static mock dashboard data.
    const mock: VendorDashboard = {
      totalMealsCount: 12,
      approvedMealsCount: 8,
      pendingMealsCount: 4,
      availableMealsCount: 8,
      averageRating: 4.9,
      totalRatings: 184,
      negativeRatingsCount: 1,
      banCount: 0,
      suspensionCount: 0,
      topSellingMeals: [
        { mealId: 'meal-ndole-royal', mealName: 'Ndolé Royal', orderCount: 58, totalRevenue: 261000 },
        { mealId: 'meal-poisson-braise', mealName: 'Poisson Braisé', orderCount: 42, totalRevenue: 159600 },
      ],
      weeklyTrend: [
        { date: '2025-09-08', orderCount: 12, revenue: 54000 },
        { date: '2025-09-09', orderCount: 15, revenue: 67500 },
        { date: '2025-09-10', orderCount: 9, revenue: 40500 },
        { date: '2025-09-11', orderCount: 18, revenue: 81000 },
        { date: '2025-09-12', orderCount: 14, revenue: 63000 },
        { date: '2025-09-13', orderCount: 21, revenue: 94500 },
        { date: '2025-09-14', orderCount: 8, revenue: 36000 },
      ],
    };
    return of(mock).pipe(delay(this.latency));
  }

  getVendorStateHistory(vendorId: string): Observable<VendorStateChange[]> {
    const history: VendorStateChange[] = [
      {
        id: 'sc-1',
        vendorId,
        fromStatus: null,
        toStatus: 'PENDING',
        reason: 'Registration initiated',
        changedBy: 'system',
        changeType: 'SYSTEM',
        changedAt: '2025-08-01T08:00:00Z',
      },
      {
        id: 'sc-2',
        vendorId,
        fromStatus: 'PENDING',
        toStatus: 'ACTIVE',
        reason: 'Vendor activated',
        changedBy: 'admin-1',
        changeType: 'ADMIN_ACTION',
        changedAt: '2025-08-01T09:00:00Z',
      },
    ];
    return of(history).pipe(delay(this.latency));
  }

  // ─── Helpers ───────────────────────────────────────────────

  private toSummary(vendor: Vendor): VendorSummary {
    return {
      id: vendor.id,
      businessName: vendor.businessName,
      description: vendor.description,
      address: vendor.address,
      ratingAvg: vendor.ratingAvg,
      totalRatings: vendor.totalRatings,
      subscriptionTier: vendor.subscriptionTier,
      status: vendor.status,
      cuisines: vendor.cuisines,
      profileImageUrl: vendor.profileImageUrl,
    };
  }

  searchVendors(request: VendorSearchRequest): Observable<DataPage<VendorSummary>> {
    return this.getVendors().pipe(
      map(vendors => {
        const keyword = request.keyword?.toLowerCase().trim();
        const businessName = request.businessName?.toLowerCase().trim();

        const filtered = vendors.filter(v => {
          if (keyword && !v.businessName.toLowerCase().includes(keyword)) return false;
          if (businessName && !v.businessName.toLowerCase().includes(businessName)) return false;
          if (request.status && v.status !== request.status) return false;
          if (request.minRating != null && v.ratingAvg < request.minRating) return false;
          if (request.maxRating != null && v.ratingAvg > request.maxRating) return false;
          return true;
        });

        const page = request.page ?? 0;
        const size = request.size ?? 20;
        const start = page * size;
        const content = filtered.slice(start, start + size);

        return {
          content,
          page,
          size,
          totalElements: filtered.length,
          totalPages: Math.ceil(filtered.length / size),
          first: page === 0,
          last: start + size >= filtered.length,
          empty: content.length === 0,
        } satisfies DataPage<VendorSummary>;
      }),
    );
  }
}
