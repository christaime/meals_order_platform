import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IconComponent,
  PriceTagComponent,
  RatingStarsComponent,
} from '@components/shared';

export interface MealOptionGroup {
  readonly id: string;
  readonly title: string;
  readonly required: boolean;
  readonly maxSelectable?: number;
  readonly options: {
    readonly id: string;
    readonly name: string;
    readonly extraPrice: number;
  }[];
}

export interface MealDetail {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly basePrice: number;
  readonly images: string[];
  readonly rating: number;
  readonly reviewCount: number;
  readonly preparationTimeMinutes: number;
  readonly isAvailable: boolean;
  readonly vendor: {
    readonly id: string;
    readonly name: string;
    readonly logoUrl?: string;
    readonly rating: number;
  };
  readonly allergens?: string[];
  readonly optionGroups?: MealOptionGroup[];
}

@Component({
  selector: 'app-meal-detail-view',
  standalone: true,
  imports: [
    CommonModule,
    IconComponent,
    PriceTagComponent,
    RatingStarsComponent,
  ],
  templateUrl: './meal-detail-view.component.html',
  styleUrl: './meal-detail-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealDetailViewComponent {
  // ─── Inputs & Outputs ──────────────────────────────────────────────
  readonly meal = input<MealDetail | null>(null);
  readonly isLoading = input<boolean>(false);

  readonly addToCart = output<{
    mealId: string;
    quantity: number;
    selectedOptions: string[];
    totalPrice: number;
  }>();
  readonly selectVendor = output<string>();

  // ─── Local State Signals ──────────────────────────────────────────
  readonly selectedImageIndex = signal<number>(0);
  readonly quantity = signal<number>(1);
  readonly selectedOptionIds = signal<Set<string>>(new Set());

  // ─── Computed Properties ──────────────────────────────────────────
  readonly activeImage = computed(() => {
    const images = this.meal()?.images;
    if (!images || images.length === 0) return null;
    return images[this.selectedImageIndex()] || images[0];
  });

  readonly optionsTotalPrice = computed(() => {
    const meal = this.meal();
    if (!meal || !meal.optionGroups) return 0;

    let extra = 0;
    const selected = this.selectedOptionIds();

    for (const group of meal.optionGroups) {
      for (const opt of group.options) {
        if (selected.has(opt.id)) {
          extra += opt.extraPrice;
        }
      }
    }
    return extra;
  });

  readonly unitPrice = computed(() => {
    const base = this.meal()?.basePrice ?? 0;
    return base + this.optionsTotalPrice();
  });

  readonly grandTotal = computed(() => this.unitPrice() * this.quantity());

  // ─── Event Handlers ───────────────────────────────────────────────
  onSelectImage(index: number): void {
    this.selectedImageIndex.set(index);
  }

  onIncrement(): void {
    this.quantity.update((q) => q + 1);
  }

  onDecrement(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  toggleOption(groupId: string, optionId: string, isSingleSelect: boolean): void {
    const current = new Set(this.selectedOptionIds());

    if (isSingleSelect) {
      const group = this.meal()?.optionGroups?.find((g) => g.id === groupId);
      if (group) {
        group.options.forEach((opt) => current.delete(opt.id));
      }
      current.add(optionId);
    } else {
      if (current.has(optionId)) {
        current.delete(optionId);
      } else {
        current.add(optionId);
      }
    }

    this.selectedOptionIds.set(current);
  }

  onAddToCart(): void {
    const currentMeal = this.meal();
    if (!currentMeal) return;

    this.addToCart.emit({
      mealId: currentMeal.id,
      quantity: this.quantity(),
      selectedOptions: Array.from(this.selectedOptionIds()),
      totalPrice: this.grandTotal(),
    });
  }
}
