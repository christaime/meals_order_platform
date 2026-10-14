import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/shared/icon/icon.component';

export type DeletableEntityKind = 'category' | 'ingredient' | 'location' | 'meal' | 'city';

export interface DeleteEntityDialogData {
  readonly name: string;
  readonly kind: DeletableEntityKind;
  /** Optional translation key for a custom reason placeholder. */
  readonly reasonPlaceholderKey?: string;
}

export interface DeleteEntityDialogResult {
  readonly reason: string;
}

interface KindCopy {
  readonly titleKey: string;
  readonly placeholderKey: string;
}

@Component({
  selector: 'app-delete-entity-dialog',
  standalone: true,
  imports: [FormsModule, IconComponent, TranslatePipe],
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
          titleKey: 'deleteEntityDialog.title.category',
          placeholderKey: 'deleteEntityDialog.placeholder.category',
        };
      case 'ingredient':
        return {
          titleKey: 'deleteEntityDialog.title.ingredient',
          placeholderKey: 'deleteEntityDialog.placeholder.ingredient',
        };
      case 'location':
        return {
          titleKey: 'deleteEntityDialog.title.location',
          placeholderKey: 'deleteEntityDialog.placeholder.location',
        };
      case 'meal':
        return {
          titleKey: 'deleteEntityDialog.title.meal',
          placeholderKey: 'deleteEntityDialog.placeholder.meal',
        };
      case 'city':
        return {
          titleKey: 'deleteEntityDialog.title.city',
          placeholderKey: 'deleteEntityDialog.placeholder.city',
        };
      default:
        return {
          titleKey: 'deleteEntityDialog.title.default',
          placeholderKey: 'deleteEntityDialog.placeholder.default',
        };
    }
  }

  protected readonly placeholderKey = () =>  this.data.reasonPlaceholderKey ?? this.copy.placeholderKey;
}
