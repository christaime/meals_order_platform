import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import {
  LocationSummary,
  ModerationStatus,
} from '@app/core/models/marketplace';

/**
 * A single removable distribution-location pill.
 *
 * Visual style depends on the location's moderation status:
 * - APPROVED  → primary-fixed (orange)
 * - PENDING   → tertiary-fixed (amber) + schedule icon + tooltip
 * - REJECTED  → error-container (red)
 * - DISABLED  → surface-container-high (gray)
 *
 * The pill shows the location name prominently and the address
 * as a small trailing hint.
 */
@Component({
  selector: 'app-location-pill',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './location-pill.component.html',
  styleUrl: './location-pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPillComponent {

  // ─── Inputs ───────────────────────────────────────────────
  readonly location = input.required<LocationSummary>();

  /** Whether the pill shows a remove button. */
  readonly removable = input<boolean>(true);

  // ─── Outputs ──────────────────────────────────────────────
  readonly removed = output<LocationSummary>();

  // ─── Derived ──────────────────────────────────────────────
  protected readonly status = computed<ModerationStatus>(
    () => (this.location() as any).moderationStatus ?? 'APPROVED'
  );

  protected readonly pillClasses = computed(() => {
    const base = [
      'inline-flex items-center gap-2',
      'px-3 py-1.5 rounded-full',
      'font-label text-xs font-semibold',
      'shadow-xs transition-colors',
      'max-w-full',
    ];

    switch (this.status()) {
      case 'PENDING':
        base.push('bg-tertiary-fixed text-on-tertiary-fixed');
        break;
      case 'REJECTED':
        base.push('bg-error-container text-on-error-container');
        break;
      case 'DISABLED':
        base.push('bg-surface-container-high text-on-surface-variant');
        break;
      case 'APPROVED':
      default:
        base.push('bg-primary-fixed text-on-primary-fixed');
        break;
    }

    return base.join(' ');
  });

  protected readonly showPendingIcon = computed(
    () => this.status() === 'PENDING'
  );

  protected readonly pendingTooltip = computed(() =>
    this.showPendingIcon() ? 'En attente de validation' : ''
  );

  // ─── Actions ──────────────────────────────────────────────

  protected onRemove(): void {
    this.removed.emit(this.location());
  }
}
