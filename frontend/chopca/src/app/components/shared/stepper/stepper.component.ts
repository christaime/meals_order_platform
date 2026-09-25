import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * A single step definition for the stepper.
 *
 * The parent supplies the list; the stepper renders it.
 */
export interface StepDefinition {
  /** Step number (1-based). */
  readonly number: number;

  /** Short label (visible only on the active step in most designs). */
  readonly label: string;

  /** Longer description shown in the pill. */
  readonly description: string;

  /** Optional Material Symbols icon, used as decoration on the active step. */
  readonly icon?: string;
}

/**
 * Generic horizontal step progress indicator.
 *
 * Renders a header row (step count + optional title + optional help slot)
 * plus a grid of step pills in three states: completed, active, pending.
 *
 * The stepper is purely presentational:
 * - It does NOT manage navigation
 * - It does NOT own the current step (parent passes it in)
 * - It does NOT know what "next" or "prev" mean
 *
 * This makes it reusable across:
 * - Vendor registration wizard (4 steps)
 * - Meal creation/edit wizard (3–5 steps)
 * - Any future multi-step flow
 *
 * Usage (minimal):
 *   <app-stepper
 *     [currentStep]="step()"
 *     [steps]="steps()" />
 *
 * Usage (with title and help slot):
 *   <app-stepper
 *     [currentStep]="step()"
 *     [steps]="steps()"
 *     title="Configuration de votre Établissement">
 *
 *     <div help>...</div>
 *   </app-stepper>
 */
@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepperComponent {

  // ─── Inputs ───────────────────────────────────────────────
  /** Current step number (1-based). */
  readonly currentStep = input.required<number>();

  /** Step definitions. */
  readonly steps = input.required<StepDefinition[]>();

  /**
   * Optional heading above the pills.
   * Leave empty on flows that already have their own title.
   */
  readonly title = input<string | null>(null);

  /**
   * Whether to show the "Étape X sur Y" badge.
   * Enabled by default.
   */
  readonly showStepBadge = input<boolean>(true);

  /**
   * Whether to show the "Progression : X%" indicator.
   * Enabled by default.
   */
  readonly showProgress = input<boolean>(true);

  // ─── Derived ──────────────────────────────────────────────
  protected readonly totalSteps = computed(() => this.steps().length);

  protected readonly progressPercentage = computed(() => {
    const total = this.totalSteps();
    if (total === 0) return 0;
    return Math.round((this.currentStep() / total) * 100);
  });

  protected readonly showHeaderRow = computed(
    () => this.showStepBadge() || this.showProgress()
  );

  // ─── Helpers (used by the template) ───────────────────────

  protected isCompleted(step: StepDefinition): boolean {
    return step.number < this.currentStep();
  }

  protected isActive(step: StepDefinition): boolean {
    return step.number === this.currentStep();
  }

  protected isPending(step: StepDefinition): boolean {
    return step.number > this.currentStep();
  }
}
