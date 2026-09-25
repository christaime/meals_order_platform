import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { PreviewState } from './preview-state.model';

/**
 * Phone-app preview of the vendor's storefront.
 *
 * Display-only. Renders a `PreviewState` snapshot — never touches
 * the registration form or any service. All values are resolved by
 * the parent page before being passed in.
 */
@Component({
  selector: 'app-preview-card',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './preview-card.component.html',
  styleUrl: './preview-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewCardComponent {

  /** The display snapshot. See `PreviewState` for the contract. */
  readonly state = input.required<PreviewState>();
}
