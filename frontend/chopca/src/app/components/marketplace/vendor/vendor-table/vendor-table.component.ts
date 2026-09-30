import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DecimalPipe, NgClass } from '@angular/common';
import { IconComponent } from '@components/shared/icon/icon.component';
import { BadgeComponent } from '@components/shared/badge/badge.component';
import {
  vendorStatusIcon,
  vendorStatusLabel,
  vendorStatusVariant,
} from '@components/marketplace/vendor/vendor-status/vendor-status.util';
import { Vendor } from '@app/core/models/marketplace';
import { CategorySummary } from '@app/core/models/marketplace/category.model';
import { LocationSummary } from '@app/core/models/marketplace/location.model';

/** Max badges shown per cell before the "+N" overflow badge kicks in. */
const MAX_BADGES = 2;

/** Max width applied to each truncated badge. */
const BADGE_MAX_WIDTH = '150px';

@Component({
  selector: 'app-vendor-table',
  standalone: true,
  imports: [DecimalPipe, NgClass, IconComponent, BadgeComponent],
  templateUrl: './vendor-table.component.html',
  styleUrl: './vendor-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorTableComponent {

  readonly vendors = input.required<readonly Vendor[]>();
  readonly loading = input<boolean>(false);
  readonly editingId = input<string | null>(null);

  readonly select = output<Vendor>();

  protected readonly maxBadges = MAX_BADGES;
  protected readonly badgeMaxWidth = BADGE_MAX_WIDTH;

  protected isEditing(v: Vendor): boolean {
    return this.editingId() === v.id;
  }

  /** First two initials of the business name, for the avatar fallback. */
  protected initials(businessName: string): string {
    const parts = businessName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /** Overflow count for cuisines — number of badges beyond the limit. */
  protected cuisinesOverflow(cuisines: readonly CategorySummary[]): number {
    return Math.max(0, cuisines.length - MAX_BADGES);
  }

  /** Overflow count for locations — number of badges beyond the limit. */
  protected locationsOverflow(locations: readonly LocationSummary[]): number {
    return Math.max(0, locations.length - MAX_BADGES);
  }

  /** Tooltip for the "+N" cuisines badge — the names of the hidden items. */
  protected hiddenCuisines(cuisines: readonly CategorySummary[]): string {
    return cuisines.slice(MAX_BADGES).map(c => c.name).join(', ');
  }

  /** Tooltip for the "+N" locations badge — the names of the hidden items. */
  protected hiddenLocations(locations: readonly LocationSummary[]): string {
    return locations.slice(MAX_BADGES).map(l => l.name).join(', ');
  }

  // Delegated to the shared helper
  protected readonly statusVariant = vendorStatusVariant;
  protected readonly statusLabel   = vendorStatusLabel;
  protected readonly statusIcon    = vendorStatusIcon;
}
