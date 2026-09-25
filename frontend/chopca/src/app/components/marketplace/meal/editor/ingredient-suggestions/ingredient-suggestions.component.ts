import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { IngredientSummary } from '@app/core/models/marketplace';

/**
 * Quick-add suggestion row for ingredients.
 *
 * Renders a horizontal wrap of pill-shaped buttons. Clicking one
 * emits `suggested` with the ingredient — the parent decides what
 * to do (typically: add it to the selected list).
 *
 * The suggestion list is currently hardcoded. Later, it will be
 * fetched from IngredientService (top-N most-used ingredients).
 */
@Component({
  selector: 'app-ingredient-suggestions',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './ingredient-suggestions.component.html',
  styleUrl: './ingredient-suggestions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientSuggestionsComponent {

  // ─── Inputs ───────────────────────────────────────────────
  /** Labels already selected — suggestions matching these are hidden. */
  readonly excludedNames = input<readonly string[]>([]);

  // ─── Outputs ──────────────────────────────────────────────
  /** Emits the chosen ingredient name (parent creates the object). */
  readonly suggested = output<string>();

  // ─── Hardcoded suggestions (TODO: replace with API call) ──
  private readonly allSuggestions: readonly IngredientSummary[] = [
    { id: 'sug-penja',     name: 'Poivre de Penja IGP',   isAllergen: false } as IngredientSummary,
    { id: 'sug-djansang',  name: 'Djansang',              isAllergen: true  } as IngredientSummary,
    { id: 'sug-pebe',      name: 'Pèbè',                  isAllergen: false } as IngredientSummary,
    { id: 'sug-rondelles', name: 'Rondelles',             isAllergen: false } as IngredientSummary,
    { id: 'sug-bar-fume',  name: 'Poisson bar fumé',      isAllergen: false } as IngredientSummary,
    { id: 'sug-piment',    name: 'Piment oiseau frais',   isAllergen: false } as IngredientSummary,
  ];

  /** Suggestions filtered to hide already-selected ones. */
  protected get visibleSuggestions(): readonly IngredientSummary[] {
    const excluded = new Set(
      this.excludedNames().map(n => n.toLowerCase())
    );
    return this.allSuggestions.filter(
      s => !excluded.has(s.name.toLowerCase())
    );
  }

  // ─── Actions ──────────────────────────────────────────────

  protected onSuggestionClick(ingredient: IngredientSummary): void {
    this.suggested.emit(ingredient.name);
  }
}
