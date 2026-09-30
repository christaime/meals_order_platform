import {
  ChangeDetectionStrategy,
  Component,
  input,
  output, effect
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { VendorStatus } from '@app/core/models/marketplace/enum-type.model';

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
  imports: [IconComponent],
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

  protected readonly statusOptions: { value: VendorStatusFilter; label: string }[] = [
    { value: 'ALL',       label: 'Tous les statuts' },
    { value: 'PENDING',   label: 'En attente' },
    { value: 'ACTIVE',    label: 'Actif' },
    { value: 'SUSPENDED', label: 'Suspendu' },
    { value: 'BANNED',    label: 'Banni' },
    { value: 'INACTIVE',  label: 'Inactif' },
  ];

  protected readonly sortOptions: { value: VendorSort; label: string }[] = [
    { value: 'name-asc',    label: 'Nom (A → Z)' },
    { value: 'name-desc',   label: 'Nom (Z → A)' },
    { value: 'rating-desc', label: 'Meilleure note' },
    { value: 'recent',      label: 'Plus récents' },
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
