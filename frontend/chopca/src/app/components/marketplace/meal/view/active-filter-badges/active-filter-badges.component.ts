import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface ActiveFilterItem {
  key: string;
  label: string;
  value: string | number | boolean;
}

/**
 * ActiveFilterBadges — Displays removable tags for currently active search and filter criteria.
 *
 * Responsibilities:
 * - Render active filter badges with single-item removal trigger (`removeFilter`).
 * - Provide a "Reset All" action (`clearAll`).
 * - Automatically hide when no active filters are applied.
 */
@Component({
  selector: 'app-active-filter-badges',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './active-filter-badges.component.html',
  styleUrl: './active-filter-badges.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActiveFilterBadgesComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  /** List of currently applied filter items. */
  readonly activeFilters = input<ActiveFilterItem[]>([]);

  /** Emitted when a specific filter badge is removed. */
  readonly removeFilter = output<ActiveFilterItem>();

  /** Emitted when the user clears all active filters. */
  readonly clearAll = output<void>();

  // ─── Actions ──────────────────────────────────────────────────────
  onRemove(filter: ActiveFilterItem): void {
    this.removeFilter.emit(filter);
  }

  onClearAll(): void {
    this.clearAll.emit();
  }
}
