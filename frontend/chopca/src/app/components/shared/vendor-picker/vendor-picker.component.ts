import {
  ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { VendorSummary } from '@app/core/models/marketplace';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * VendorPickerComponent — searchable vendor selector.
 *
 * Presentational + self-fetching: it owns the search control and calls
 * `VENDOR_SERVICE.searchVendors(...)`. The host page owns the selected ID.
 *
 * Originally lived under the location feature (`LocationVendorPickerComponent`).
 * Promoted to `@components/shared/` so both the locations page and the meals
 * page can use it.
 */
@Component({
  selector: 'app-vendor-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    IconComponent,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './vendor-picker.component.html',
  styleUrl: './vendor-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorPickerComponent {

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedVendorId = input<string | null>(null);

  readonly vendorSelected = output<string>();

  protected readonly search = new FormControl<string>('', { nonNullable: true });
  protected readonly vendors = signal<VendorSummary[]>([]);
  protected readonly loading = signal<boolean>(false);

  constructor() {
    this.search.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(keyword => {
        this.loading.set(true);
        if (!keyword || keyword.trim().length < 2) {
          return of({ content: [] as VendorSummary[] });
        }
        return this.vendorService.searchVendors({
          keyword: keyword.trim(),
          size: 20,
          sortBy: 'businessName',
          sortDirection: 'ASC',
        });
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: (page: any) => {
        this.vendors.set(page.content ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected onSelect(vendorId: string): void {
    this.vendorSelected.emit(vendorId);
  }
}
