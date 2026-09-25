import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VendorSummary } from '@core/models/marketplace';
import { IconComponent } from '@components/shared';
import { SearchBarComponent,
  LocationSelectorComponent, LocationOption,
   CategoryChipsComponent, CategoryChip ,
   PaginationControlsComponent
  } from '@components/marketplace/meal/view';

import { VendorCardComponent } from '../vendor-card/vendor-card.component';
import { VendorCardSkeletonComponent } from '../vendor-card-skeleton/vendor-card-skeleton.component';

@Component({
  selector: 'app-vendor-directory-view',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    SearchBarComponent,
    LocationSelectorComponent,
    CategoryChipsComponent,
    VendorCardComponent,
    VendorCardSkeletonComponent,
    PaginationControlsComponent,
  ],
  templateUrl: './vendor-directory-view.component.html',
  styleUrl: './vendor-directory-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDirectoryViewComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly vendors = input<VendorSummary[] | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly totalVendors = input<number>(0);
  readonly pageSize = input<number>(9);

  readonly selectVendor = output<VendorSummary>();
  readonly filterChange = output<{
    query: string;
    location: LocationOption | null;
    category: string;
    page: number;
  }>();

  // ─── State Signals ────────────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly selectedLocation = signal<LocationOption | null>(null);
  readonly selectedCategory = signal<string>('all');
  readonly currentPage = signal<number>(1);

  // ─── Computed Properties ──────────────────────────────────────────
  readonly skeletonArray = computed(() => Array.from({ length: this.pageSize() }));

  // ─── Event Triggers ───────────────────────────────────────────────
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.emitState();
  }

  onLocationChange(location: LocationOption): void {
    this.selectedLocation.set(location);
    this.currentPage.set(1);
    this.emitState();
  }

  onCategoryChange(category: CategoryChip): void {
    this.selectedCategory.set(category.id);
    this.currentPage.set(1);
    this.emitState();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.emitState();
  }

  onResetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.currentPage.set(1);
    this.emitState();
  }

  private emitState(): void {
    this.filterChange.emit({
      query: this.searchQuery(),
      location: this.selectedLocation(),
      category: this.selectedCategory(),
      page: this.currentPage(),
    });
  }
}
