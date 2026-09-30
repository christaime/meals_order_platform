import {
  ChangeDetectionStrategy, Component, computed, input, output, signal,effect
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';

export type IngredientSort = 'name-asc' | 'name-desc' | 'status-asc';
export type AllergenFilter = 'ALL' | 'YES' | 'NO';

@Component({
  selector: 'app-ingredient-filters',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './ingredient-filters.component.html',
  styleUrl: './ingredient-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IngredientFiltersComponent {

  readonly name = input<string>('');
  readonly isAllergen = input<AllergenFilter>('ALL');
  readonly moderationStatus = input<ModerationStatus | 'ALL'>('ALL');
  readonly sort = input<IngredientSort>('name-asc');

  readonly nameChange = output<string>();
  readonly isAllergenChange = output<AllergenFilter>();
  readonly moderationStatusChange = output<ModerationStatus | 'ALL'>();
  readonly sortChange = output<IngredientSort>();

  protected readonly draft = signal<string>('');

  protected readonly allergenOptions = [
    { value: 'ALL', label: 'Tous' },
    { value: 'YES', label: 'Allergènes' },
    { value: 'NO',  label: 'Non allergènes' },
  ] as const;

  protected readonly statusOptions = [
    { value: 'ALL',      label: 'Tous les statuts' },
    { value: 'APPROVED', label: 'Approuvé' },
    { value: 'PENDING',  label: 'En attente' },
    { value: 'REJECTED', label: 'Rejeté' },
    { value: 'DISABLED', label: 'Désactivé' },
  ] as const;

  protected readonly sortOptions = [
    { value: 'name-asc',   label: 'Nom (A-Z)' },
    { value: 'name-desc',  label: 'Nom (Z-A)' },
    { value: 'status-asc', label: 'Statut' },
  ] as const;

  protected readonly hasPendingChange = computed(() => this.draft() !== this.name());

  protected onDraftInput(value: string): void { this.draft.set(value); }
  protected triggerSearch(): void { this.nameChange.emit(this.draft().trim()); }
  protected onFormSubmit(e: Event): void { e.preventDefault(); this.triggerSearch(); }
  protected clearSearch(): void { this.draft.set(''); this.nameChange.emit(''); }

  protected onAllergenChange(e: Event): void {
    this.isAllergenChange.emit((e.target as HTMLSelectElement).value as AllergenFilter);
  }
  protected onStatusChange(e: Event): void {
    this.moderationStatusChange.emit((e.target as HTMLSelectElement).value as ModerationStatus | 'ALL');
  }
  protected onSortChange(e: Event): void {
    this.sortChange.emit((e.target as HTMLSelectElement).value as IngredientSort);
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
