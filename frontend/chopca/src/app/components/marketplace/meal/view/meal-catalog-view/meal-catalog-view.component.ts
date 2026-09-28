import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MealSummary } from '@core/models/marketplace';
import {
  IconComponent,
} from '@components/shared';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { SubCategoryFilterChipsComponent, SubCategoryChip } from '../sub-category-filter-chips/sub-category-filter-chips.component';
import { ActiveFilterBadgesComponent, ActiveFilterItem } from '../active-filter-badges/active-filter-badges.component';
import { SortDropdownComponent, SortOption } from '../sort-dropdown/sort-dropdown.component';
import { AdvancedFilterDrawerComponent, FilterState } from '../advanced-filter-drawer/advanced-filter-drawer.component';
import { MealCardComponent } from '../meal-card/meal-card.component';
import { MealCardSkeletonComponent } from '../meal-card-skeleton/meal-card-skeleton.component';
import { PaginationControlsComponent } from '../pagination-controls/pagination-controls.component';

@Component({
  selector: 'app-meal-catalog-view',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    SearchBarComponent,
    SubCategoryFilterChipsComponent,
    ActiveFilterBadgesComponent,
    SortDropdownComponent,
    AdvancedFilterDrawerComponent,
    MealCardComponent,
    MealCardSkeletonComponent,
    PaginationControlsComponent,
  ],
  templateUrl: './meal-catalog-view.component.html',
  styleUrl: './meal-catalog-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealCatalogViewComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly meals = input<MealSummary[] | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly totalMeals = input<number>(0);
  readonly pageSize = input<number>(12);

  readonly addToCart = output<MealSummary>();
  readonly viewMealDetails = output<MealSummary>();
  readonly filterChange = output<{
    query: string;
    subCategory: string;
    sort: string;
    page: number;
    filters: FilterState;
  }>();

  // ─── State Signals ────────────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly selectedSubCategory = signal<string>('all');
  readonly selectedSort = signal<string>('popular');
  readonly currentPage = signal<number>(1);
  readonly advancedFilters = signal<FilterState>({
    maxPrice: 10000,
    minPrice: 2000,
    maxPrepTime: 60,
    minRating: 0,
    availableOnly: false,
  });

  // ─── Computed Properties ──────────────────────────────────────────
  readonly skeletonArray = computed(() => Array.from({ length: this.pageSize() }));

  readonly activeFilterItems = computed<ActiveFilterItem[]>(() => {
    const list: ActiveFilterItem[] = [];

    if (this.searchQuery()) {
      list.push({ key: 'query', label: `Recherche: "${this.searchQuery()}"`, value: this.searchQuery() });
    }
    if (this.selectedSubCategory() !== 'all') {
      list.push({ key: 'subCategory', label: `Filtre: ${this.selectedSubCategory()}`, value: this.selectedSubCategory() });
    }
    if (this.advancedFilters().maxPrice < 10000) {
      list.push({ key: 'maxPrice', label: `Max ${this.advancedFilters().maxPrice} FCFA`, value: this.advancedFilters().maxPrice });
    }
    if (this.advancedFilters().minRating > 0) {
      list.push({ key: 'minRating', label: `${this.advancedFilters().minRating}+ ★`, value: this.advancedFilters().minRating });
    }
    if (this.advancedFilters().availableOnly) {
      list.push({ key: 'availableOnly', label: 'Disponible de suite', value: true });
    }

    return list;
  });

  // ─── Event Triggers ───────────────────────────────────────────────
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.emitState();
  }

  onSubCategoryChange(subCategory: SubCategoryChip): void {
    this.selectedSubCategory.set(subCategory.id);
    this.currentPage.set(1);
    this.emitState();
  }

  onSortChange(sort: SortOption): void {
    this.selectedSort.set(sort.id);
    this.emitState();
  }

  onApplyAdvancedFilters(filters: FilterState): void {
    this.advancedFilters.set(filters);
    this.currentPage.set(1);
    this.emitState();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.emitState();
  }

  onRemoveFilter(filter: ActiveFilterItem): void {
    switch (filter.key) {
      case 'query':
        this.searchQuery.set('');
        break;
      case 'subCategory':
        this.selectedSubCategory.set('all');
        break;
      case 'maxPrice':
        this.advancedFilters.update((f) => ({ ...f, maxPrice: 10000 }));
        break;
      case 'minRating':
        this.advancedFilters.update((f) => ({ ...f, minRating: 0 }));
        break;
      case 'availableOnly':
        this.advancedFilters.update((f) => ({ ...f, availableOnly: false }));
        break;
    }
    this.emitState();
  }

  onClearAllFilters(): void {
    this.searchQuery.set('');
    this.selectedSubCategory.set('all');
    this.advancedFilters.set({
      maxPrice: 10000,
      minPrice: 2000,
      maxPrepTime: 60,
      minRating: 0,
      availableOnly: false,
    });
    this.currentPage.set(1);
    this.emitState();
  }

  private emitState(): void {
    this.filterChange.emit({
      query: this.searchQuery(),
      subCategory: this.selectedSubCategory(),
      sort: this.selectedSort(),
      page: this.currentPage(),
      filters: this.advancedFilters(),
    });
  }
}
