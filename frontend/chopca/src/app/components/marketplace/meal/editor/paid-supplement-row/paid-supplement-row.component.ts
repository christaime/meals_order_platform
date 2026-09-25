import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { MealSummary } from '@app/core/models/marketplace';

/**
 * A single paid supplement row.
 *
 * Now renders a MealSummary (supplements are meals in the
 * SUPPLEMENT category). Shows name + price + remove button.
 */
@Component({
  selector: 'app-paid-supplement-row',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './paid-supplement-row.component.html',
  styleUrl: './paid-supplement-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaidSupplementRowComponent {

  readonly supplement = input.required<MealSummary>();
  readonly removed = output<MealSummary>();

  protected onRemove(): void {
    this.removed.emit(this.supplement());
  }
}
