import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NewLocationDialogComponent } from '../../../location/dialogs/new-location-dialog/new-location-dialog.component';

import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import {
  Location,
  LocationSummary,
  LocationSearchRequest,
} from '@app/core/models/marketplace';

/**
 * Step 3 — Pricing & distribution.
 *
 * Fields:
 * - price (required)
 * - promoPrice (optional, < price)
 * - distributionLocationIds (chips + autocomplete + create dialog)
 */
@Component({
  selector: 'app-step-pricing',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './step-pricing.component.html',
  styleUrl: './step-pricing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepPricingComponent implements OnInit {

  private readonly locationService = inject(LOCATION_SERVICE);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = input.required<FormGroup>();

  // ─── Locations ────────────────────────────────────────────
  readonly locationFilter = signal<string>('');
  private readonly searchResults = signal<LocationSummary[]>([]);
  readonly selectedLocations = signal<LocationSummary[]>([]);
  private readonly locationCache = signal<Map<string, LocationSummary>>(new Map());

  protected readonly filteredLocations = computed(() => {
    const selected = new Set(this.selectedLocations().map(l => l.id));
    return this.searchResults().filter(l => !selected.has(l.id));
  });

  private searchTimer?: ReturnType<typeof setTimeout>;

  // ─── Accessors ────────────────────────────────────────────
  protected get price(): FormControl<number | null> {
    return this.form().controls['price'] as FormControl<number | null>;
  }
  protected get promoPrice(): FormControl<number | null> {
    return this.form().controls['promoPrice'] as FormControl<number | null>;
  }
  protected get locationIds(): FormControl<string[]> {
    return this.form().controls['distributionLocationIds'] as FormControl<string[]>;
  }

  // ─── Derived pricing ──────────────────────────────────────
  protected readonly commissionRate = 12;

  protected readonly commissionAmount = computed(() => {
    const price = this.effectivePrice();
    return Math.round((price * this.commissionRate) / 100);
  });

  protected readonly netPayout = computed(
    () => this.effectivePrice() - this.commissionAmount()
  );

  private readonly _effectivePrice = signal<number>(0);
  protected readonly effectivePrice = this._effectivePrice.asReadonly();

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    // Sync chips with form
    this.locationIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ids => this.syncSelected(ids ?? []));

    this.syncSelected(this.locationIds.value ?? []);

    // Sync pricing
    this.price.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recomputePrice());
    this.promoPrice.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recomputePrice());

    this.recomputePrice();
  }

  private recomputePrice(): void {
    const base = this.price.value ?? 0;
    const promo = this.promoPrice.value;
    if (promo != null && promo > 0 && promo < base) {
      this._effectivePrice.set(promo);
    } else {
      this._effectivePrice.set(base);
    }
  }

  // ─── Locations ────────────────────────────────────────────

  private syncSelected(ids: string[]): void {
    if (!ids.length) {
      this.selectedLocations.set([]);
      return;
    }

    const cache = this.locationCache();
    const missing = ids.filter(id => !cache.has(id));

    if (missing.length) {
      this.locationService
        .searchLocations({ size: 100 } as LocationSearchRequest)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (page) => {
            const next = new Map(cache);
            for (const l of page.content) next.set(l.id, l);
            this.locationCache.set(next);
            this.updateSelectedFromCache(ids);
          },
          error: () => this.updateSelectedFromCache(ids),
        });
    } else {
      this.updateSelectedFromCache(ids);
    }
  }

  private updateSelectedFromCache(ids: string[]): void {
    const cache = this.locationCache();
    const list = ids.map(id => cache.get(id)).filter((l): l is LocationSummary => !!l);
    this.selectedLocations.set(list);
  }

  onLocationFilterInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.locationFilter.set(value);

    if (value.trim().length < 2) {
      this.searchResults.set([]);
      return;
    }

    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.performSearch(value.trim()), 250);
  }

  private performSearch(keyword: string): void {
    this.locationService
      .searchLocations({ keyword, size: 10 } as LocationSearchRequest)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.searchResults.set(page.content),
        error: (err) => {
          console.error('[StepPricing] search error', err);
          this.searchResults.set([]);
        },
      });
  }

  addLocation(location: LocationSummary): void {
    if (this.selectedLocations().some(l => l.id === location.id)) return;

    const cache = new Map(this.locationCache());
    cache.set(location.id, location);
    this.locationCache.set(cache);

    this.locationIds.setValue([...this.locationIds.value, location.id]);
    this.locationIds.markAsTouched();
    this.locationFilter.set('');
    this.searchResults.set([]);
  }

  removeLocation(location: LocationSummary): void {
    const next = this.locationIds.value.filter(id => id !== location.id);
    this.locationIds.setValue(next);
    this.locationIds.markAsTouched();
  }

  openCreateLocationDialog(): void {
    const ref = this.dialog.open(NewLocationDialogComponent, {
      width: '640px',
      maxHeight: '90vh',
    });

    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created: Location | undefined) => {
        if (!created) return;
        this.addLocation({
          id: created.id,
          name: created.name,
          address: created.address,
          moderationStatus: created.moderationStatus,
        } as LocationSummary);
        this.snackBar.open(`« ${created.name} » ajouté`, 'OK', { duration: 3000 });
      });
  }

  // ─── Errors ───────────────────────────────────────────────

  protected priceError(): string | null {
    const c = this.price;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required']) return 'Le prix est requis';
    if (c.errors['min']) return 'Le prix minimum est de 100 FCFA';
    if (c.errors['max']) return 'Le prix maximum est de 1 000 000 FCFA';
    return null;
  }

  protected promoPriceError(): string | null {
    const c = this.promoPrice;
    if (!c.touched) return null;
    const promo = c.value;
    if (promo == null || promo <= 0) return null;
    const base = this.price.value ?? 0;
    if (promo >= base) return 'Le prix promo doit être inférieur au prix normal';
    if (promo < 100) return 'Minimum 100 FCFA';
    return null;
  }

  protected showCreateHint(): boolean {
    return this.locationFilter().trim().length >= 2;
  }

  protected formatPrice(v: number): string {
    return `${v.toLocaleString('fr-FR')} FCFA`;
  }
}
