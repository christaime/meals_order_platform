import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  DestroyRef,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { VendorSummary , LocationSummary, MealStatFilter} from '@core/models/marketplace';
import { IconComponent } from '@components/shared';
import {
   CategoryChipsComponent, CategoryChip ,
   PaginationControlsComponent,
  } from '@components/marketplace/meal/view';
import {
   SortOption, SortDropdownComponent, SearchBarComponent, LocationSelectorComponent
  } from '@components/shared';
import { Category } from '@core/models/marketplace';
import { SubCategoryFilterChipsComponent , SubCategoryChip} from '@components/marketplace/meal/view/sub-category-filter-chips/sub-category-filter-chips.component';
import { CATEGORY_SERVICE } from '@core/services/marketplace';
import { VendorCardComponent } from '../vendor-card/vendor-card.component';
import { VendorCardSkeletonComponent } from '../vendor-card-skeleton/vendor-card-skeleton.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

const DEFAULT_CHIP: SubCategoryChip = {
  id: 'all',
  name: 'vendorDirectory.defaultChipLabel',
  kind: 'ALL',
};

@Component({
  selector: 'app-vendor-directory-view',
  standalone: true,
  imports: [
    TranslatePipe,
    CommonModule,
    IconComponent,
    SearchBarComponent,
    LocationSelectorComponent,
    SubCategoryFilterChipsComponent,
    VendorCardComponent,
    VendorCardSkeletonComponent,
    PaginationControlsComponent,
    SortDropdownComponent
  ],
  templateUrl: './vendor-directory-view.component.html',
  styleUrl: './vendor-directory-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDirectoryViewComponent {
    private readonly categoryService = inject(CATEGORY_SERVICE);
    private readonly destroyRef = inject(DestroyRef);
    private readonly translate = inject(TranslateService);
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly vendors = input<VendorSummary[] | null>(null);
  readonly isLoading = input<boolean>(false);
  readonly totalVendors = input<number>(0);
  readonly pageSize = input<number>(9);

  readonly selectVendor = output<VendorSummary>();
  readonly filterChange = output<DirectoryFilterState>();
  /** Reference stats — used to derive shortcut values. */
  private mealStatFilters: MealStatFilter | undefined;
  /** Selected distribution locations — fed into the meal search. */
  private readonly selectedLocationIds = signal<string[]>([]);
  /** The criteria the user last applied — kept so the panel can reopen. */
  private readonly locationCriteria = signal<{
    cityId: string;
    cityName: string;
    areaName?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  } | null>(null);


  // ─── State Signals ────────────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly selectedLocations = signal<LocationSummary[] | null>(null);
  readonly selectedCategory = signal<string>('all');
  protected readonly subCategoryOptions = signal<SubCategoryChip[]>([DEFAULT_CHIP]);
  private lastCategories: Category[] = [];
  /** Ids of the currently selected chips — bound to the chips component. */
  readonly selectedSubCategories = signal<SubCategoryChip[]>([]);
  protected readonly selectedSubCategoryIds = computed(() => this.selectedSubCategories().map((c) => c.id));
  readonly currentPage = signal<number>(1);

  // ─── Computed Properties ──────────────────────────────────────────
  readonly skeletonArray = computed(() => Array.from({ length: this.pageSize() }));

  readonly selectedSort = signal<string>('businessName');
  readonly sortOptions:SortOption[] = [
      { id: 'ratingAvg',    labelKey: 'vendorDirectory.sortByRating',       icon: 'star' },
      { id: 'businessName', labelKey: 'vendorDirectory.sortByBusinessName', icon: 'sort_by_alpha' },
  ];

  ngOnInit(): void {
    this.categoryService.searchCategories({
          type: 'CUISINE',
          size: 6,
          moderationStatus: 'APPROVED',
          sortBy: 'name',
          sortDirection:'ASC',
        }).subscribe({
          next: (page) => {
            this.lastCategories = page.content;
            this.buildChips(page.content);

          },
          error: (err) => {
            console.error('[VendorDirectoryViewComponent] fetch error', err);
          },
        });

      this.translate.onLangChange
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              if (this.lastCategories.length > 0) {
                this.buildChips(this.lastCategories);
              }
            });
  }

  // ═════════════════════════════════════════════════════════════
  //  Chip building
  // ═════════════════════════════════════════════════════════════

  private buildChips(categories: Category[]): void {
      this.translate
        .get('vendorDirectory.defaultChipLabel')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((defaultChipLabel) => {
          const chips: SubCategoryChip[] = [
            {
              id: 'all',
              name: defaultChipLabel,
              kind: 'ALL',
            },
          ];

          for (const cuisine of categories) {
            chips.push({
              id: cuisine.id,
              name: cuisine.name,          // API data — not translated
              iconUrl: cuisine.iconUrl ?? '',
              kind: 'CUISINE',
            });
          }

          this.subCategoryOptions.set(chips);
        });
    }
  // ─── Event Triggers ───────────────────────────────────────────────
  onLocationsChange(locations: LocationSummary[]): void {
    this.selectedLocations.set(locations);
    this.selectedLocationIds.set(locations.map((l) => l.id));
    this.currentPage.set(1);
    this.emitState();
  }

  onCriteriaChange(criteria: {
    cityId: string;
    cityName: string;
    areaName?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
  }): void {
    // Empty criteria means the user cleared the zone.
    const isEmpty = !criteria.cityId;
    this.locationCriteria.set(isEmpty ? null : criteria);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.emitState();
  }

  onSubCategoryChange(selected: SubCategoryChip[]): void {
    this.selectedSubCategories.set(selected);
    this.currentPage.set(1);
    this.emitState();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.emitState();
  }

  onSortChange(sort: SortOption): void {
    this.selectedSort.set(sort.id);
    this.emitState();
  }

  onResetFilters(): void {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
    this.currentPage.set(1);
    this.emitState();
  }

  private emitState(): void {
    this.filterChange.emit({
      query: this.searchQuery(),
      anyLocationIds: this.selectedLocationIds(),
      categoryIds: this.selectedSubCategoryIds(),
      page: this.currentPage(),
      sortBy: this.selectedSort(),
      sortDirection: this.selectedSort() === 'businessName' ? 'ASC': 'DESC',
    });
  }
}

/** What the view emits on any filter change. */
export interface DirectoryFilterState {
 readonly query: string | undefined;
 readonly anyLocationIds?: string[];
 readonly categoryIds?: string[];
 readonly page: number;
 readonly sortBy: string;
 readonly sortDirection: 'ASC' | 'DESC';
}

export const DEFAULT_VENDOR_FILTER: DirectoryFilterState = {
  page:0,sortBy:'businessName', sortDirection: 'ASC', query:""
  }
