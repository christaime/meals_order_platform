import {
  Component,
  ChangeDetectionStrategy,
  model,
  signal,
  output,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface FilterState {
  maxPrice: number;
  maxPrepTime: number;
  minRating: number;
  availableOnly: boolean;
}

/**
 * AdvancedFilterDrawer — Collapsible side drawer for fine-grained marketplace filtering.
 *
 * Responsibilities:
 * - Filter by max price (XAF slider), preparation time limit, minimum rating, and instant availability.
 * - Signal-driven open/close drawer controls.
 * - Reset and Apply filters events.
 */
@Component({
  selector: 'app-advanced-filter-drawer',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './advanced-filter-drawer.component.html',
  styleUrl: './advanced-filter-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedFilterDrawerComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  /** Toggles drawer visibility (Two-way signal model). */
  readonly isOpen = model<boolean>(false);

  /** Current filter criteria state. */
  readonly filters = model<FilterState>({
    maxPrice: 10000,
    maxPrepTime: 60,
    minRating: 0,
    availableOnly: false,
  });

  /** Emitted when filters are applied. */
  readonly applyFilters = output<FilterState>();

  /** Temporary draft filter state inside the drawer. */
  readonly draftFilters = signal<FilterState>({ ...this.filters() });

  // ─── Actions ──────────────────────────────────────────────────────
  openDrawer(): void {
    this.draftFilters.set({ ...this.filters() });
    this.isOpen.set(true);
  }

  closeDrawer(): void {
    this.isOpen.set(false);
  }

  updateMaxPrice(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => ({ ...f, maxPrice: val }));
  }

  updateMaxPrepTime(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    this.draftFilters.update((f) => ({ ...f, maxPrepTime: val }));
  }

  setMinRating(rating: number): void {
    this.draftFilters.update((f) => ({ ...f, minRating: rating }));
  }

  toggleAvailableOnly(): void {
    this.draftFilters.update((f) => ({ ...f, availableOnly: !f.availableOnly }));
  }

  resetFilters(): void {
    const defaults: FilterState = {
      maxPrice: 10000,
      maxPrepTime: 60,
      minRating: 0,
      availableOnly: false,
    };
    this.draftFilters.set(defaults);
    this.filters.set(defaults);
    this.applyFilters.emit(defaults);
  }

  onApply(): void {
    this.filters.set({ ...this.draftFilters() });
    this.applyFilters.emit(this.filters());
    this.closeDrawer();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.closeDrawer();
    }
  }
}
