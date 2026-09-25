import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * One step in the registration progress indicator.
 * `index` is 1-based to match the mockup's "1 / 2 / 3 / 4" circles.
 */
export interface RegistrationStep {
  index: number;
  label: string;
  subLabel: string;
}

/**
 * Top strip of the vendor registration page:
 * - Title block (headline + subheadline + free/24h badge)
 * - 4-step progress indicator
 *
 * Purely presentational. The parent owns the current step and any
 * navigation; this component only renders.
 *
 * Step grouping (matches VendorRegistrationPage.stepControls):
 *   1 — Identité & Contact       (Section A)
 *   2 — Spécialités & Vitrine    (Sections B + C)
 *   3 — Logistique & Rayon       (Section D)
 *   4 — KYC & CNI                (Section E)
 */
@Component({
  selector: 'app-stepper-header',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './stepper-header.component.html',
  styleUrl: './stepper-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperHeaderComponent {

  // ─── Inputs ───────────────────────────────────────────────

  /** The current step, 1-based. */
  readonly currentStep = input.required<number>();

  /**
   * The step definitions. Defaults match the vendor registration flow.
   * Override to reuse this component for other multi-step flows.
   */
  readonly steps = input<RegistrationStep[]>([
    { index: 1, label: 'Identité & Contact',    subLabel: 'Établissement' },
    { index: 2, label: 'Spécialités & Vitrine', subLabel: 'Terroirs & visuels' },
    { index: 3, label: 'Logistique & Rayon',    subLabel: 'Point de retrait' },
    { index: 4, label: 'KYC & CNI',             subLabel: 'Modération légale' },
  ]);

  // ─── Derived ──────────────────────────────────────────────

  /** True when any step is a done state — used to hide sub-label churn. */
  protected readonly hasProgress = computed(() => this.currentStep() > 1);

  // ─── Template helpers ─────────────────────────────────────

  protected isActive(step: RegistrationStep): boolean {
    return step.index === this.currentStep();
  }

  protected isDone(step: RegistrationStep): boolean {
    return step.index < this.currentStep();
  }

  protected isUpcoming(step: RegistrationStep): boolean {
    return step.index > this.currentStep();
  }

  protected stepWrapClass(step: RegistrationStep): string {
    const base = 'flex items-center gap-space-sm p-space-sm rounded-lg transition-colors';
    if (this.isActive(step)) return `${base} bg-surface-container-lowest shadow-sm`;
    return `${base} bg-surface-container-highest/60`;
  }

  protected stepBadgeClass(step: RegistrationStep): string {
    const base =
      'w-8 h-8 rounded-full flex items-center justify-center ' +
      'font-label-md text-label-md shrink-0 transition-colors';
    if (this.isActive(step)) return `${base} bg-primary text-on-primary`;
    if (this.isDone(step))   return `${base} bg-secondary text-on-secondary`;
    return `${base} bg-surface-container-highest text-on-surface-variant`;
  }

  protected stepLabelClass(step: RegistrationStep): string {
    const base = 'font-label-md text-label-md truncate';
    if (this.isActive(step)) return `${base} text-on-surface`;
    if (this.isDone(step))   return `${base} text-on-surface`;
    return `${base} text-on-surface-variant`;
  }

  protected stepSubLabelClass(step: RegistrationStep): string {
    const base = 'font-body-sm text-body-sm';
    if (this.isActive(step)) return `${base} text-secondary flex items-center gap-0.5`;
    if (this.isDone(step))   return `${base} text-secondary`;
    return `${base} text-on-surface-variant/80`;
  }
}
