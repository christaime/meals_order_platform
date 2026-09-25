import {
  Component,
  ChangeDetectionStrategy,
  output,
  signal,
} from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { LocationFormComponent } from '../location-form/location-form.component';
import { Location } from '@app/core/models/marketplace';

/**
 * Inline "create a new distribution location" flow.
 *
 * Shows a trigger button. When clicked, reveals the shared
 * LocationFormComponent inline. On save, emits the new location
 * and collapses back to the trigger.
 */
@Component({
  selector: 'app-new-location-form',
  standalone: true,
  imports: [IconComponent, LocationFormComponent],
  templateUrl: './new-location-form.component.html',
  styleUrl: './new-location-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewLocationFormComponent {

  // ─── Outputs ──────────────────────────────────────────────
  /** Emits the newly created location. */
  readonly created = output<Location>();

  // ─── State ────────────────────────────────────────────────
  readonly isOpen = signal<boolean>(false);

  // ─── Actions ──────────────────────────────────────────────

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  onSaved(location: Location): void {
    this.created.emit(location);
    this.isOpen.set(false);
  }
}
