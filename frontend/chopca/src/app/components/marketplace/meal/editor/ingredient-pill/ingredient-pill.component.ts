import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import {
  IngredientSummary,
  ModerationStatus,
} from '@app/core/models/marketplace';

/**
 * A single removable ingredient pill.
 *
 * Visual style depends on the ingredient's moderation status:
 * - APPROVED  → primary-fixed (orange)
 * - PENDING   → tertiary-fixed (amber) + schedule icon + tooltip
 * - REJECTED  → error-container (red)
 * - DISABLED  → surface-container-high (gray)
 *
 * Usage:
 *   <app-ingredient-pill [ingredient]="ing" (removed)="onRemove($event)" />
 */
@Component({
  selector: 'app-ingredient-pill',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './ingredient-pill.component.html',
  styleUrl: './ingredient-pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientPillComponent {

  // ─── Inputs ───────────────────────────────────────────────
  readonly ingredient = input.required<IngredientSummary>();

  /** Whether the pill shows a remove button. */
  readonly removable = input<boolean>(true);

  // ─── Outputs ──────────────────────────────────────────────
  readonly removed = output<IngredientSummary>();

  // ─── Derived ──────────────────────────────────────────────
  protected readonly status = computed<ModerationStatus>(
    () => (this.ingredient() as any).moderationStatus ?? 'APPROVED'
  );

  protected readonly pillClasses = computed(() => {
    const base = [
      'inline-flex items-center gap-1.5',
      'px-3 py-1.5 rounded-full',
      'font-label text-xs font-semibold',
      'shadow-xs transition-colors',
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
    this.removed.emit(this.ingredient());
  }
}
