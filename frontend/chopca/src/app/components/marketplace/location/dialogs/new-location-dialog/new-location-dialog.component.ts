import {
  Component,
  ChangeDetectionStrategy,
  inject, computed
} from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { LocationFormComponent } from '../../editor/location-form/location-form.component';
import { Location } from '@app/core/models/marketplace';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface NewLocationDialogData {
  readonly initialName?: string;
}
/**
 * Dialog wrapper for creating a new distribution location.
 *
 * Opens LocationFormComponent inside a Material dialog.
 * Returns the created Location via `dialogRef.close(location)`.
 */
@Component({
  selector: 'app-new-location-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    MatIconModule,
    LocationFormComponent,
  ],
  templateUrl: './new-location-dialog.component.html',
  styleUrl: './new-location-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewLocationDialogComponent {

  protected readonly data = inject<NewLocationDialogData | null>(
    MAT_DIALOG_DATA,
    { optional: true },
  );

  protected readonly prefill: Location | null = this.data?.initialName
      ? ({
          id: '',
          name: this.data.initialName,
        } as unknown as Location)
      : null;

  private readonly dialogRef = inject(
    MatDialogRef<NewLocationDialogComponent, Location>
  );

  onSaved(location: Location): void {
    this.dialogRef.close(location);
  }

  onCancelled(): void {
    this.dialogRef.close();
  }
}
