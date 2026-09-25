import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * Breadcrumb + status ribbon at the top of the meal editor page.
 *
 * Shows:
 * - Back link to the meal list
 * - Breadcrumb: "Gestion du Menu / Édition de recette"
 * - Draft badge (e.g. "Brouillon n° CH-8492")
 * - Autosave status with timestamp
 * - "Vue Client" button (emits `viewClient`)
 */
@Component({
  selector: 'app-meal-editor-breadcrumb',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './meal-editor-breadcrumb.component.html',
  styleUrl: './meal-editor-breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditorBreadcrumbComponent {

  // ─── Inputs ───────────────────────────────────────────────
  /** Back link target (defaults to the meal list). */
  readonly backRoute = input<string>('/vendor/meals');

  /** Back link label. */
  readonly backLabel = input<string>('Gestion du Menu');

  /** Current step label shown after the slash. */
  readonly currentLabel = input<string>('Édition de recette');

  /** Draft identifier (e.g. "CH-8492"). */
  readonly draftId = input<string | null>(null);

  /** Autosave timestamp, e.g. "Sauvegarde auto à 11:42". Null hides it. */
  readonly autosaveLabel = input<string | null>('Sauvegarde auto à 11:42');

  // ─── Outputs ──────────────────────────────────────────────
  readonly viewClient = output<void>();

  // ─── Actions ──────────────────────────────────────────────

  protected onViewClient(): void {
    this.viewClient.emit();
  }
}
