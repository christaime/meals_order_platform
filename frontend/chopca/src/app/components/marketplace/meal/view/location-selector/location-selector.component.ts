import {
  Component,
  ChangeDetectionStrategy,
  signal,
  model,
  input,
  output,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';

export interface LocationOption {
  id: string;
  city: 'Douala' | 'Yaoundé';
  neighborhood: string;
}

/**
 * LocationSelector — Dropdown selector for delivery city & neighborhood filtering.
 *
 * Responsibilities:
 * - Select target delivery neighborhood from structured locations.
 * - Support two-way signal binding on selectedLocation.
 * - Group locations visually by city (Douala / Yaoundé).
 * - Click-outside host listener for smooth dropdown behavior.
 */
@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './location-selector.component.html',
  styleUrl: './location-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationSelectorComponent {
  // ─── Signals ──────────────────────────────────────────────────────
  /** Selected location object (Two-way signal model). */
  readonly selectedLocation = model<LocationOption | null>({
    id: 'dla-1',
    city: 'Douala',
    neighborhood: 'Akwa',
  });

  /** List of available delivery zones. Defaults to major hubs in Douala & Yaoundé. */
  readonly locations = input<LocationOption[]>([
    { id: 'dla-1', city: 'Douala', neighborhood: 'Akwa' },
    { id: 'dla-2', city: 'Douala', neighborhood: 'Bonapriso' },
    { id: 'dla-3', city: 'Douala', neighborhood: 'Bonanjo' },
    { id: 'dla-4', city: 'Douala', neighborhood: 'Makepe' },
    { id: 'yde-1', city: 'Yaoundé', neighborhood: 'Bastos' },
    { id: 'yde-2', city: 'Yaoundé', neighborhood: 'Omnisports' },
    { id: 'yde-3', city: 'Yaoundé', neighborhood: 'Nlongkak' },
  ]);

  /** Emitted when location choice changes. */
  readonly locationChange = output<LocationOption>();

  /** Dropdown visibility state. */
  readonly isOpen = signal<boolean>(false);

  // ─── Actions ──────────────────────────────────────────────────────
  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  selectLocation(location: LocationOption): void {
    this.selectedLocation.set(location);
    this.locationChange.emit(location);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.location-dropdown-container')) {
      this.isOpen.set(false);
    }
  }
}
