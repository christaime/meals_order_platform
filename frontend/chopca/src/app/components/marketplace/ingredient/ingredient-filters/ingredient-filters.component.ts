import {
  ChangeDetectionStrategy, Component, computed, input, output, signal,effect
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { TranslatePipe } from '@ngx-translate/core';

export type IngredientSort = 'name-asc' | 'name-desc' | 'status-asc';
export type AllergenFilter = 'ALL' | 'YES' | 'NO';

@Component({
  selector: 'app-ingredient-filters',
  standalone: true,
  imports: [FormsModule, IconComponent, TranslatePipe],
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
    { value: 'ALL', labelKey: 'ingredientFilters.allergen.ALL' },
    { value: 'YES', labelKey: 'ingredientFilters.allergen.YES' },
    { value: 'NO',  labelKey: 'ingredientFilters.allergen.NO' },
  ] as const;

  protected readonly statusOptions = [
    { value: 'ALL',      labelKey: 'ingredientFilters.status.ALL' },
    { value: 'APPROVED', labelKey: 'moderationStatus.approved' },
    { value: 'PENDING',  labelKey: 'moderationStatus.pending' },
    { value: 'REJECTED', labelKey: 'moderationStatus.rejected' },
    { value: 'DISABLED', labelKey: 'moderationStatus.disabled' },
  ] as const;

  protected readonly sortOptions = [
    { value: 'name-asc',   labelKey: 'ingredientFilters.sort.nameAsc' },
    { value: 'name-desc',  labelKey: 'ingredientFilters.sort.nameDesc' },
    { value: 'status-asc', labelKey: 'ingredientFilters.sort.statusAsc' },
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
