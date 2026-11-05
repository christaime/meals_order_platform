import {
  ChangeDetectionStrategy, Component, computed, input, output, signal,effect
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { TranslatePipe } from '@ngx-translate/core';

export type LocationSort = 'name-asc' | 'name-desc' | 'recent';

@Component({
  selector: 'app-location-filters',
  standalone: true,
  imports: [FormsModule, IconComponent, TranslatePipe],
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
    { value: 'ALL',      labelKey: 'locationFilters.status.ALL' },
    { value: 'APPROVED', labelKey: 'moderationStatus.approved' },
    { value: 'PENDING',  labelKey: 'moderationStatus.pending' },
    { value: 'REJECTED', labelKey: 'moderationStatus.rejected' },
    { value: 'DISABLED', labelKey: 'moderationStatus.disabled' },
  ] as const;

  protected readonly sortOptions = [
    { value: 'name-asc',  labelKey: 'locationFilters.sort.nameAsc' },
    { value: 'name-desc', labelKey: 'locationFilters.sort.nameDesc' },
    { value: 'recent',    labelKey: 'locationFilters.sort.recent' },
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

  constructor() {
    // Seed the name filter from the URL-bound input, once.
    effect(() => {
      const initial = this.name();
      if (initial && !this.draft()) {
        this.draft.set(initial);
      }
    }, { allowSignalWrites: true });
  }
}
