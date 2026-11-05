import {
  ChangeDetectionStrategy,
  Component,
  input,
  output, effect
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { VendorStatus } from '@app/core/models/marketplace/enum-type.model';
import { TranslatePipe } from '@ngx-translate/core';

export type VendorSort =
  | 'name-asc'
  | 'name-desc'
  | 'rating-desc'
  | 'recent';

export type VendorStatusFilter = VendorStatus | 'ALL';

/**
 * VendorFiltersComponent — simple filter bar for the vendor management page.
 *
 * Keyword + status + sort. No advanced drawer — vendors have no
 * filterable sub-entities beyond what's already here.
 */
@Component({
  selector: 'app-vendor-filters',
  standalone: true,
  imports: [IconComponent, TranslatePipe],
  templateUrl: './vendor-filters.component.html',
  styleUrl: './vendor-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorFiltersComponent {

  readonly keyword = input<string>('');
  readonly status = input<VendorStatusFilter>('ALL');
  readonly sort = input<VendorSort>('name-asc');

  readonly keywordChange = output<string>();
  readonly statusChange = output<VendorStatusFilter>();
  readonly sortChange = output<VendorSort>();

  protected readonly statusOptions: { value: VendorStatusFilter; labelKey: string }[] = [
    { value: 'ALL',       labelKey: 'vendorFilters.status.ALL' },
    { value: 'PENDING',   labelKey: 'vendorFilters.status.PENDING' },
    { value: 'ACTIVE',    labelKey: 'vendorFilters.status.ACTIVE' },
    { value: 'SUSPENDED', labelKey: 'vendorFilters.status.SUSPENDED' },
    { value: 'BANNED',    labelKey: 'vendorFilters.status.BANNED' },
    { value: 'INACTIVE',  labelKey: 'vendorFilters.status.INACTIVE' },
  ];

  protected readonly sortOptions: { value: VendorSort; labelKey: string }[] = [
    { value: 'name-asc',    labelKey: 'vendorFilters.sort.nameAsc' },
    { value: 'name-desc',   labelKey: 'vendorFilters.sort.nameDesc' },
    { value: 'rating-desc', labelKey: 'vendorFilters.sort.ratingDesc' },
    { value: 'recent',      labelKey: 'vendorFilters.sort.recent' },
  ];

  protected onKeywordInput(event: Event): void {
    this.keywordChange.emit((event.target as HTMLInputElement).value);
  }

  protected onKeywordSubmit(event: Event): void {
    this.keywordChange.emit((event.target as HTMLInputElement).value.trim());
  }

  protected onStatusChange(event: Event): void {
    this.statusChange.emit((event.target as HTMLSelectElement).value as VendorStatusFilter);
  }

  protected onSortChange(event: Event): void {
    this.sortChange.emit((event.target as HTMLSelectElement).value as VendorSort);
  }

}
