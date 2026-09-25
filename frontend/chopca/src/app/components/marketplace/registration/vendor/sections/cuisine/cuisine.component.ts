import {
  Component,
  ChangeDetectionStrategy,
  computed,
  input, output
} from '@angular/core';
import { FormControl ,FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { CategoryPillsSelectorComponent } from '@components/shared/category-pills-selector/category-pills-selector.component';
import { Category } from '@app/core/models/marketplace';
/**
 * Section B — Spécialités & Terroirs Culinaires.
 *
 * Thin wrapper around the shared `CategoryPillsSelectorComponent`,
 * scoped to `categoryType="CUISINE"`. The selector owns:
 *   - fetching the CUISINE categories from the API
 *   - pill rendering, selection state, max-selection enforcement
 *   - its own loading skeleton and fetch-error display
 *
 * Parent-owned FormGroup must contain:
 *   - cuisineCategoryIds : string[], required, min length 1
 *
 * The parent is responsible for surfacing the validation error
 * (e.g. "select at least one") via the `[error]` input.
 */
@Component({
  selector: 'app-cuisine',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, CategoryPillsSelectorComponent],
  templateUrl: './cuisine.component.html',
  styleUrl: './cuisine.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuisineComponent {

  // ─── Inputs ───────────────────────────────────────────────

  /** Parent-owned form. See class doc for required control. */
  readonly form = input.required<FormGroup>();

  /**
   * Validation error to display under the pills.
   * The parent computes this from the form control's state, so the
   * section stays presentation-only.
   */
  readonly error = input<string | null>(null);

  /** Maximum number of cuisines a vendor can select. */
  readonly maxSelection = input<number>(3);

  /**
   * Re-emitted from the inner `CategoryPillsSelectorComponent`.
   * Carries the full selected `Category` objects on every change.
   */
  readonly categoriesSelected = output<Category[]>();


  // ─── Derived ──────────────────────────────────────────────

   /**
   * The `cuisineCategoryIds` control, exposed to the template so the
   * selector can bind to it directly. Throws at first read if the
   * parent forgot to declare it — fail loudly, not silently.
   */
  protected readonly cuisineControl = computed(() => {
    const ctrl = this.form().get('cuisineCategoryIds');
    if (!ctrl) {
      throw new Error(
        "[CuisineComponent] FormGroup is missing required control 'cuisineCategoryIds'."
      );
    }
    return ctrl as FormControl<string[]>;
  });
}
