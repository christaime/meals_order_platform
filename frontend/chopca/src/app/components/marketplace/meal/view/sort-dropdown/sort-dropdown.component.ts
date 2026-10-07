import {
  Component,
  ChangeDetectionStrategy,
  model,
  input,
  output,
  signal,
  ElementRef,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface SortOption {
  id: string;
  label: string;
  icon?: string;
}

/**
 * SortDropdown — Select menu for ordering marketplace search and meal listings.
 *
 * Responsibilities:
 * - Two-way signal model binding for `selectedSortId`.
 * - Custom dropdown overlay with click-outside auto-close mechanism.
 * - Emits `sortChange` events when ordering preferences change.
 */
@Component({
  selector: 'app-sort-dropdown',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './sort-dropdown.component.html',
  styleUrl: './sort-dropdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortDropdownComponent {
  private readonly elementRef = inject(ElementRef);

  // ─── Signals ──────────────────────────────────────────────────────
  /** Currently selected sort strategy ID. Defaults to 'popular'. */
  readonly selectedSortId = model<string>('popular');

  /** Available sorting strategies. */
  readonly options = input<SortOption[]>([
    { id: 'name', label: 'Nom des plats alphabetiquement', icon: 'sort_by_alpha' },
  ]);

  /** Emitted when the sorting order is changed. */
  readonly sortChange = output<SortOption>();

  /** Internal state toggling dropdown visibility. */
  readonly isOpen = signal<boolean>(false);

  // ─── Computed Helpers ─────────────────────────────────────────────
  get selectedOption(): SortOption {
    return (
      this.options().find((opt) => opt.id === this.selectedSortId()) ||
      this.options()[0]
    );
  }

  // ─── Actions ──────────────────────────────────────────────────────
  toggleDropdown(): void {
    this.isOpen.update((v) => !v);
  }

  selectOption(option: SortOption): void {
    this.selectedSortId.set(option.id);
    this.sortChange.emit(option);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
