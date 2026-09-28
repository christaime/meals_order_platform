import {
  ChangeDetectionStrategy, Component, computed, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';

export type LocationSort = 'name-asc' | 'name-desc' | 'recent';

@Component({
  selector: 'app-location-filters',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './location-filters.component.html',
  styleUrl: './location-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationFiltersComponent {

  readonly name = input<string>('');
  readonly moderationStatus = input<ModerationStatus | 'ALL'>('ALL');
  readonly sort = input<LocationSort>('name-asc');

  readonly nameChange = output<string>();
  readonly moderationStatusChange = output<ModerationStatus | 'ALL'>();
  readonly sortChange = output<LocationSort>();

  protected readonly draft = signal<string>('');

  protected readonly statusOptions = [
    { value: 'ALL',      label: 'Tous les statuts' },
    { value: 'APPROVED', label: 'Approuvé' },
    { value: 'PENDING',  label: 'En attente' },
    { value: 'REJECTED', label: 'Rejeté' },
    { value: 'DISABLED', label: 'Désactivé' },
  ] as const;

  protected readonly sortOptions = [
    { value: 'name-asc',  label: 'Nom (A-Z)' },
    { value: 'name-desc', label: 'Nom (Z-A)' },
    { value: 'recent',    label: 'Plus récents' },
  ] as const;

  protected onDraftInput(value: string): void { this.draft.set(value); }
  protected triggerSearch(): void { this.nameChange.emit(this.draft().trim()); }
  protected onFormSubmit(e: Event): void { e.preventDefault(); this.triggerSearch(); }
  protected clearSearch(): void { this.draft.set(''); this.nameChange.emit(''); }

  protected onStatusChange(e: Event): void {
    this.moderationStatusChange.emit((e.target as HTMLSelectElement).value as ModerationStatus | 'ALL');
  }
  protected onSortChange(e: Event): void {
    this.sortChange.emit((e.target as HTMLSelectElement).value as LocationSort);
  }
}
