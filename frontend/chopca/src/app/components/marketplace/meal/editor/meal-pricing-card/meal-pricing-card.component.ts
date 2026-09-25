import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  DestroyRef,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IconComponent } from '@components/shared/icon/icon.component';
import { FormFieldComponent } from '@components/shared/form-field/form-field.component';
import { INPUT_CLASSES } from '@components/shared/form-field/input-classes';

/**
 * Step 3 — Pricing card.
 *
 * Contains:
 * - Base price (required, 100–1 000 000 FCFA)
 * - Promo price (optional, must be < base price)
 * - Live commission preview
 * - Net payout preview
 *
 * The parent owns the FormGroup. Expected controls:
 * - price:      number, required
 * - promoPrice: number | null, optional
 */
@Component({
  selector: 'app-meal-pricing-card',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    FormFieldComponent,
  ],
  templateUrl: './meal-pricing-card.component.html',
  styleUrl: './meal-pricing-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealPricingCardComponent {

  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ───────────────────────────────────────────────
  readonly form = input.required<FormGroup>();

  /** Commission rate in percent (e.g. 12 for 12%). */
  readonly commissionRate = input<number>(12);

  /** Minimum allowed base price (XAF). */
  readonly minPrice = input<number>(100);

  /** Maximum allowed base price (XAF). */
  readonly maxPrice = input<number>(1_000_000);

  // ─── Exposed for the template ─────────────────────────────
  protected readonly INPUT_CLASSES = INPUT_CLASSES;

  // ─── Convenience accessors ────────────────────────────────
  protected get price(): FormControl<number | null> {
    return this.form().controls['price'] as FormControl<number | null>;
  }
  protected get promoPrice(): FormControl<number | null> {
    return this.form().controls['promoPrice'] as FormControl<number | null>;
  }

  // ─── Reactive mirrors of the control values ───────────────
  // Updated via valueChanges subscriptions — this keeps the computed()
  // signals reactive without needing toSignal() on each control.
  private readonly _price = signal<number>(0);
  private readonly _promoPrice = signal<number | null>(null);

  protected readonly priceValue = this._price.asReadonly();
  protected readonly promoPriceValue = this._promoPrice.asReadonly();

  // ─── Computed pricing ─────────────────────────────────────

  /** Effective price = promo price if set and valid, otherwise base price. */
  protected readonly effectivePrice = computed(() => {
    const base = this._price();
    const promo = this._promoPrice();
    if (promo != null && promo > 0 && promo < base) return promo;
    return base;
  });

  protected readonly commissionAmount = computed(() =>
    Math.round((this.effectivePrice() * this.commissionRate()) / 100)
  );

  protected readonly netPayout = computed(() =>
    this.effectivePrice() - this.commissionAmount()
  );

  protected readonly hasPromo = computed(() => {
    const base = this._price();
    const promo = this._promoPrice();
    return promo != null && promo > 0 && promo < base;
  });

  protected readonly discountPercent = computed(() => {
    if (!this.hasPromo()) return 0;
    const base = this._price();
    const promo = this._promoPrice()!;
    return Math.round(((base - promo) / base) * 100);
  });

  // ─── Lifecycle ────────────────────────────────────────────

  constructor() {
    queueMicrotask(() => this.wireSubscriptions());
  }

  private wireSubscriptions(): void {
    const priceCtrl = this.price;
    const promoCtrl = this.promoPrice;

    // Seed
    this._price.set(priceCtrl.value ?? 0);
    this._promoPrice.set(promoCtrl.value ?? null);

    // Mirror changes
    priceCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this._price.set(v ?? 0));

    promoCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this._promoPrice.set(v ?? null));
  }

  // ─── Error helpers ────────────────────────────────────────

  protected get priceError(): string | null {
    const ctrl = this.price;
    if (!ctrl.touched || !ctrl.errors) return null;
    if (ctrl.errors['required']) return 'Le prix est requis';
    if (ctrl.errors['min']) return `Le prix minimum est de ${this.minPrice()} FCFA`;
    if (ctrl.errors['max']) return `Le prix maximum est de ${this.maxPrice().toLocaleString('fr-FR')} FCFA`;
    return null;
  }

  protected get promoPriceError(): string | null {
    const ctrl = this.promoPrice;
    if (!ctrl.touched) return null;

    const base = this._price();
    const promo = ctrl.value;

    if (promo != null && promo > 0) {
      if (base != null && promo >= base) {
        return 'Le prix promo doit être inférieur au prix normal';
      }
      if (promo < this.minPrice()) {
        return `Le prix promo minimum est de ${this.minPrice()} FCFA`;
      }
    }
    return null;
  }

  // ─── Template helpers ─────────────────────────────────────

  protected formatPrice(value: number): string {
    return `${value.toLocaleString('fr-FR')} FCFA`;
  }
}
