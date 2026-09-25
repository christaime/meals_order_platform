import { Component, computed, input } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export type RatingSize = 'sm' | 'md' | 'lg';

/**
 * Star rating display.
 *
 * Supports whole and half stars (visual interpolation).
 * Optionally shows the numeric value and review count.
 *
 * Usage:
 *   <app-rating-stars [rating]="4.9" [count]="184" />
 *   <app-rating-stars [rating]="4.5" size="lg" [showValue]="false" />
 */
@Component({
  selector: 'app-rating-stars',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './rating-stars.component.html',
  styleUrl: './rating-stars.component.scss',
})
export class RatingStarsComponent {

  /** Rating value, 0–5. Can be fractional. */
  readonly rating = input.required<number>();

  /** Optional review count to display next to the rating. */
  readonly count = input<number | null>(null);

  /** Size of the stars. */
  readonly size = input<RatingSize>('sm');

  /** Whether to show the numeric value next to the stars. */
  readonly showValue = input<boolean>(true);

  /**
   * Computed per-star fill percentage (0, 50, 100).
   * Produces 5 entries, one per star.
   */
  protected readonly starFills = computed<number[]>(() => {
    const r = Math.max(0, Math.min(5, this.rating()));
    const fullStars = Math.floor(r);
    const hasHalf = r - fullStars >= 0.25 && r - fullStars < 0.75;
    const nearlyFull = r - fullStars >= 0.75;

    const fills: number[] = [];
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        fills.push(100);
      } else if (i === fullStars && nearlyFull) {
        fills.push(100);
      } else if (i === fullStars && hasHalf) {
        fills.push(50);
      } else {
        fills.push(0);
      }
    }
    return fills;
  });
}
