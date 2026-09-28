import {
  Component,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { IngredientFormComponent } from '../../ingredient-form/ingredient-form.component';
import { Ingredient } from '@app/core/models/marketplace';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface NewIngredientDialogData {
  readonly initialName?: string;
}

@Component({
  selector: 'app-new-ingredient-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatIconModule,
    IngredientFormComponent,
  ],
  templateUrl: './new-ingredient-dialog.component.html',
  styleUrl: './new-ingredient-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewIngredientDialogComponent {

  private readonly dialogRef = inject(
    MatDialogRef<NewIngredientDialogComponent, Ingredient>
  );
  private readonly data = inject<NewIngredientDialogData | null>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  /**
   * A partial Ingredient passed via the existing `ingredient` input
   * just to prefill the form. No `id` means it's create mode.
   */
  protected readonly prefill: Ingredient | null = this.data?.initialName
    ? ({
        id: '',
        name: this.data.initialName,
        isAllergen: false,
      } as unknown as Ingredient)
    : null;

  onSaved(ingredient: Ingredient): void {
    this.dialogRef.close(ingredient);
  }

  onCancelled(): void {
    this.dialogRef.close();
  }
}
