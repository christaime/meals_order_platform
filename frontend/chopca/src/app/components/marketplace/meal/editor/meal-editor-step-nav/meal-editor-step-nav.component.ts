import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export type MealEditorStep = 1 | 2 | 3;

@Component({
  selector: 'app-meal-editor-step-nav',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './meal-editor-step-nav.component.html',
  styleUrl: './meal-editor-step-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealEditorStepNavComponent {

  readonly currentStep = input.required<MealEditorStep>();
  readonly submitting = input<boolean>(false);

  // NOTE: no `reset` output — reset was removed by design.

  readonly previous    = output<void>();
  readonly next        = output<void>();
  readonly saveDraft   = output<void>();
  readonly publish     = output<void>();

  protected readonly isFirstStep = computed(() => this.currentStep() === 1);
  protected readonly isLastStep  = computed(() => this.currentStep() === 3);

  protected readonly nextLabel = computed(() => {
    switch (this.currentStep()) {
      case 1:  return 'Continuer : Ingrédients';
      case 2:  return 'Continuer : Tarifs & Stocks';
      default: return 'Continuer';
    }
  });

  protected readonly previousLabel = computed(() => {
    switch (this.currentStep()) {
      case 2:  return 'Étape 1 : Identité';
      case 3:  return 'Étape 2 : Ingrédients';
      default: return 'Précédent';
    }
  });

  protected onPrevious(): void  { this.previous.emit(); }
  protected onNext(): void      { this.next.emit(); }
  protected onSaveDraft(): void { this.saveDraft.emit(); }
  protected onPublish(): void   { this.publish.emit(); }
}
