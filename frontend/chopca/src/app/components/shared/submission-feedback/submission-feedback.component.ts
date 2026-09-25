import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export type FeedbackVariant = 'success' | 'error';

/**
 * Inline banner shown after a form submission.
 *
 * Renders nothing when `message` is null. Otherwise shows either a
 * success or error banner with an appropriate icon and color.
 *
 * The parent controls visibility: pass `null` to hide, a string to show.
 *
 * Usage:
 *   <app-submission-feedback
 *     [variant]="'success'"
 *     [message]="'Compte créé avec succès'" />
 */
@Component({
  selector: 'app-submission-feedback',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './submission-feedback.component.html',
  styleUrl: './submission-feedback.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionFeedbackComponent {

  /** The message to display. Null hides the component. */
  readonly message = input<string | null>(null);

  /** Optional secondary line (e.g. "Check your email for confirmation"). */
  readonly detail = input<string | null>(null);

  /** Visual variant. */
  readonly variant = input<FeedbackVariant>('success');

  // ─── Derived ──────────────────────────────────────────────
  protected readonly iconName = computed(() =>
    this.variant() === 'success' ? 'check_circle' : 'error'
  );

  protected readonly wrapperClasses = computed(() => {
    const base = [
      'flex', 'items-start', 'gap-3',
      'p-4', 'rounded-xl', 'border',
    ];
    if (this.variant() === 'success') {
      base.push(
        'bg-secondary-container/40',
        'border-secondary/30',
        'text-on-secondary-container'
      );
    } else {
      base.push(
        'bg-error-container',
        'border-error/30',
        'text-on-error-container'
      );
    }
    return base.join(' ');
  });

  protected readonly iconClasses = computed(() =>
    this.variant() === 'success' ? 'text-secondary' : 'text-error'
  );
}
