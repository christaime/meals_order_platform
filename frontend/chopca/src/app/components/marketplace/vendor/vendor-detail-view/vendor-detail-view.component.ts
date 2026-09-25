import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MealSummary, VendorSummary, CategorySummary } from '@core/models/marketplace';
import {
  IconComponent,
  RatingStarsComponent,
} from '@components/shared';
import { MealCardComponent, MealCardSkeletonComponent } from '@components/marketplace/meal/view';

export interface VendorMenuCategory {
  readonly id: string;
  readonly name: string;
  readonly itemCount: number;
}

@Component({
  selector: 'app-vendor-detail-view',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    RatingStarsComponent,
    MealCardComponent,
    MealCardSkeletonComponent,
  ],
  templateUrl: './vendor-detail-view.component.html',
  styleUrl: './vendor-detail-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorDetailViewComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly vendor = input<VendorSummary | null>(null);
  readonly categories = input<VendorMenuCategory[]>([]);
  readonly meals = input<MealSummary[] | null>(null);
  readonly isLoading = input<boolean>(false);

  readonly addToCart = output<MealSummary>();
  readonly viewMealDetails = output<MealSummary>();
  readonly categorySelect = output<string>();

  // ─── Local State Signals ──────────────────────────────────────────
  readonly selectedCategoryId = signal<string>('all');

  // ─── Computed Properties ──────────────────────────────────────────
  readonly filteredMeals = computed(() => {
    const allMeals = this.meals();
    if (!allMeals) return [];
    const category = this.selectedCategoryId();
    if (category === 'all') return allMeals;

    return allMeals;/*.filter(
      (m) =>
       // m.subCategory?.toLowerCase() === category.toLowerCase() ||
        m.category?.toLowerCase() === category.toLowerCase()
    );*/
  });

  readonly isVendorOpen = computed(() => {
    const v = this.vendor();
    if (!v) return false;
    return v.isOpen ?? v.status === 'ACTIVE';
  });

  readonly skeletonArray = computed(() => Array.from({ length: 6 }));

  // ─── Handlers ─────────────────────────────────────────────────────
  onSelectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
    this.categorySelect.emit(categoryId);
  }
}
