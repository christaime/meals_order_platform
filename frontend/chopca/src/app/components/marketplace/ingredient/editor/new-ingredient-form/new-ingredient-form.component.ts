import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { IngredientFormComponent } from '../ingredient-form/ingredient-form.component';
import { Ingredient } from '@app/core/models/marketplace';

/**
 * Inline "create a new ingredient" flow.
 *
 * Shows a trigger button. When clicked, reveals the shared
 * IngredientFormComponent inline. On save, emits the new ingredient
 * and collapses back to the trigger.
 */
@Component({
  selector: 'app-new-ingredient-form',
  standalone: true,
  imports: [IconComponent, IngredientFormComponent],
  templateUrl: './new-ingredient-form.component.html',
  styleUrl: './new-ingredient-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewIngredientFormComponent {

  // ─── Outputs ──────────────────────────────────────────────
  /** Emits the newly created ingredient. */
  readonly created = output<Ingredient>();

  // ─── State ────────────────────────────────────────────────
  readonly isOpen = signal<boolean>(false);

  // ─── Actions ──────────────────────────────────────────────

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onSaved(ingredient: Ingredient): void {
    this.created.emit(ingredient);
    this.isOpen.set(false);
  }
}
