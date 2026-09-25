import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export type ToastVariant = 'success' | 'error';

/**
 * Floating toast shown after publish.
 *
 * Slides up from the bottom-right. Auto-hides after a few seconds.
 * The parent triggers it by toggling the `visible` input.
 *
 * The `visible` input is a one-shot trigger: when it flips to `true`,
 * the toast displays, and auto-hides after `autoHideMs`.
 */
@Component({
  selector: 'app-meal-editor-publish-toast',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './meal-editor-publish-toast.component.html',
  styleUrl: './meal-editor-publish-toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditorPublishToastComponent implements OnChanges {

  // ─── Inputs ───────────────────────────────────────────────
  /** Set to true to trigger the toast. Parent may flip back to false. */
  readonly visible = input<boolean>(false);

  readonly variant = input<ToastVariant>('success');

  readonly title = input<string>('Plat mis en ligne avec succès !');

  readonly message = input<string | null>(
    'Visible immédiatement sur l\'application des gourmands de Douala.'
  );

  /** Auto-hide delay in ms. Set to 0 to disable auto-hide. */
  readonly autoHideMs = input<number>(4000);

  // ─── Outputs ──────────────────────────────────────────────
  readonly closed = output<void>();

  // ─── Internal state ───────────────────────────────────────
  protected readonly shown = signal<boolean>(false);

  private hideTimer?: ReturnType<typeof setTimeout>;

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      if (this.visible()) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  // ─── Actions ──────────────────────────────────────────────

  private show(): void {
    clearTimeout(this.hideTimer);
    this.shown.set(true);

    const delay = this.autoHideMs();
    if (delay > 0) {
      this.hideTimer = setTimeout(() => this.hide(), delay);
    }
  }

  private hide(): void {
    clearTimeout(this.hideTimer);
    this.shown.set(false);
    this.closed.emit();
  }

  protected onClose(): void {
    this.hide();
  }

  // ─── Derived (icon per variant) ───────────────────────────

  protected readonly iconName = (): string =>
    this.variant() === 'success' ? 'done_all' : 'error';

  protected readonly iconBgClass = (): string =>
    this.variant() === 'success'
      ? 'bg-secondary text-on-secondary'
      : 'bg-error text-on-error';
}
