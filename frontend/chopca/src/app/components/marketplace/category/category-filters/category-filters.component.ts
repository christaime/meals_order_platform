import {
  ChangeDetectionStrategy, Component, computed, inject, input, output, signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { CategoryType, ModerationStatus } from '@app/core/models/marketplace/enum-type.model';

export type CategorySort = 'name-asc' | 'name-desc' | 'status-asc';

@Component({
  selector: 'app-category-filters',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './category-filters.component.html',
  styleUrl: './category-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFiltersComponent {

  readonly name = input<string>('');
  readonly type = input<CategoryType | 'ALL'>('ALL');
  readonly status = input<ModerationStatus | 'ALL'>('ALL');
  readonly sort = input<CategorySort>('name-asc');

  readonly nameChange = output<string>();
  readonly typeChange = output<CategoryType | 'ALL'>();
  readonly statusChange = output<ModerationStatus | 'ALL'>();
  readonly sortChange = output<CategorySort>();

  /** Local, editable copy of the name input — only emitted on explicit search. */
  protected readonly draft = signal<string>('');

  protected readonly typeOptions = [
    { value: 'ALL', label: 'Tous les types' },
    { value: 'CUISINE', label: 'Cuisine' },
    { value: 'DISH_TYPE', label: 'Type de plat' },
  ] as const;

  protected readonly statusOptions = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'APPROVED', label: 'Approuvé' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'REJECTED', label: 'Rejeté' },
    { value: 'DISABLED', label: 'Désactivé' },
  ] as const;

  protected readonly sortOptions = [
    { value: 'name-asc', label: 'Nom (A-Z)' },
    { value: 'name-desc', label: 'Nom (Z-A)' },
    { value: 'status-asc', label: 'Statut' },
  ] as const;

  /** Show the clear button when the local draft differs from the applied value. */
  protected readonly hasPendingChange = computed(() => this.draft() !== this.name());

  // ─── Search input ──────────────────────────────────────────

  protected onDraftInput(value: string): void {
    this.draft.set(value);
  }

  /** Called by both the button click and the Enter key. */
  protected triggerSearch(): void {
    this.nameChange.emit(this.draft().trim());
  }

  /** Stop the browser from submitting a real <form> and reloading the page. */
  protected onFormSubmit(event: Event): void {
    event.preventDefault();
    this.triggerSearch();
  }

  protected clearSearch(): void {
    this.draft.set('');
    this.nameChange.emit('');
  }

  // ─── Selects ───────────────────────────────────────────────

  protected onTypeChange(event: Event): void {
    this.typeChange.emit((event.target as HTMLSelectElement).value as CategoryType | 'ALL');
  }

  protected onStatusChange(event: Event): void {
    this.statusChange.emit((event.target as HTMLSelectElement).value as ModerationStatus | 'ALL');
  }

  protected onSortChange(event: Event): void {
    this.sortChange.emit((event.target as HTMLSelectElement).value as CategorySort);
  }
}
