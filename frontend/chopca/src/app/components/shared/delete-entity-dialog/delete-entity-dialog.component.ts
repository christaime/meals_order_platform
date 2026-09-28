import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { IconComponent } from '@components/shared/icon/icon.component';

/**
 * The kind of entity being deleted. Drives the dialog's copy.
 * Extend this union when a new entity type is added.
 */
export type DeletableEntityKind = 'category' | 'ingredient' | 'location' | 'meal';

export interface DeleteEntityDialogData {
  /** The display name of the entity, e.g. "Cuisine Sawa". */
  readonly name: string;

  /** What kind of entity this is — drives the labels. */
  readonly kind: DeletableEntityKind;

  /**
   * Optional custom reason placeholder.
   * Falls back to a kind-specific default.
   */
  readonly reasonPlaceholder?: string;
}

export interface DeleteEntityDialogResult {
  readonly reason: string;
}

interface KindCopy {
  readonly title: string;
  readonly body: string;
  readonly placeholder: string;
}

@Component({
  selector: 'app-delete-entity-dialog',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './delete-entity-dialog.component.html',
  styleUrl: './delete-entity-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteEntityDialogComponent {

  protected readonly data = inject<DeleteEntityDialogData>(MAT_DIALOG_DATA);
  protected readonly ref =
    inject<MatDialogRef<DeleteEntityDialogComponent, DeleteEntityDialogResult>>(MatDialogRef);

  protected reason = '';

  protected readonly copy: KindCopy = this.copyFor(this.data.kind);

  private copyFor(kind: DeletableEntityKind): KindCopy {
    switch (kind) {
      case 'category':
        return {
          title: 'Supprimer la catégorie ?',
          body: 'Vous êtes sur le point de supprimer',
          placeholder: 'Ex: Doublon avec "Cuisine Sawa"',
        };
      case 'ingredient':
        return {
          title: 'Supprimer l\'ingrédient ?',
          body: 'Vous êtes sur le point de supprimer',
          placeholder: 'Ex: Doublon avec "Arachide"',
        };
      case 'location':
        return {
          title: 'Supprimer l\'emplacement ?',
          body: 'Vous êtes sur le point de supprimer',
          placeholder: 'Ex: Ancienne adresse, déménagement…',
        };
      case 'meal':
        return {
          title: 'Supprimer le met ?',
          body: 'Vous êtes sur le point de supprimer',
          placeholder: 'Ex: Repas méconnu et non apprécié par le grand public…',
        };

    }

  }

  protected readonly placeholder = () =>
    this.data.reasonPlaceholder ?? this.copy.placeholder;
}
