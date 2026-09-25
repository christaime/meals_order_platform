import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Pro-tip box shown under the live preview card.
 *
 * Currently hardcoded for the meal editor, but designed to be reusable
 * for other contexts by accepting title + body as inputs.
 */
@Component({
  selector: 'app-meal-preview-tip',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './meal-preview-tip.component.html',
  styleUrl: './meal-preview-tip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealPreviewTipComponent {

  readonly title = input<string>('Visibilité Boostée');

  readonly body = input<string>(
    'Les plats avec ingrédients du terroir et photo haute fidélité bénéficient ' +
    'd\'une mise en avant prioritaire dans l\'onglet "Spécialités Sawa" de ' +
    'Chop ça! Douala.'
  );

  readonly icon = input<string>('campaign');
}
