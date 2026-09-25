import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export interface HeaderMetric {
  readonly label: string;      // e.g. "Taux Commission"
  readonly value: string;      // e.g. "12% fixe"
  readonly tone: 'primary' | 'secondary';
}

/**
 * Editorial header for the meal editor page.
 *
 * Contains:
 * - Eyebrow label ("Catalogue Culinaire • Douala & Yaoundé")
 * - Main headline ("Enregistrement & Fiche Recette")
 * - Intro paragraph
 * - 2 metric pills (Commission rate, Settlement delay)
 *
 * All values are inputs so this component can be reused on
 * other vendor-editor pages (e.g. edit meal, create category).
 */
@Component({
  selector: 'app-meal-editor-header',
  standalone: true,
  imports: [],
  templateUrl: './meal-editor-header.component.html',
  styleUrl: './meal-editor-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditorHeaderComponent {

  readonly eyebrow = input<string>('Catalogue Culinaire • Douala & Yaoundé');

  readonly title = input<string>('Enregistrement & Fiche Recette');

  readonly intro = input<string>(
    'Configurez la présentation, les ingrédients d\'origine et la logistique ' +
    'de votre spécialité pour les clients de la zone littorale.'
  );

  readonly metrics = input<readonly HeaderMetric[]>([
    { label: 'Taux Commission',  value: '12% fixe',      tone: 'secondary' },
    { label: 'Délai Règlement',  value: 'J+0 MoMo/OM',   tone: 'primary'   },
  ]);
}
