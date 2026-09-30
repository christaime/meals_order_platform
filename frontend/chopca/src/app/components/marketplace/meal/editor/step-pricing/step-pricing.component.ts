import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  input,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
  HostListener,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { IconComponent } from '@components/shared/icon/icon.component';
import {
  NewLocationDialogComponent,
} from '../../../location/dialogs/new-location-dialog/new-location-dialog.component';

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
 * - price (plain number input, required)
 * - promoPrice (plain number input, optional, < price)
 * - distributionLocationIds (plain chip input + custom autocomplete + create dialog)
 *
 * Location resolution:
 * - When `initialLocations` is provided (editing an existing meal, whose
 *   MealResponse already carries the full distribution-location summaries),
 *   the component resolves the form's location ids against that list —
 *   no backend call.
 * - When it's null (create mode, or a bare mount), the component falls
 *   back to fetching. In practice this path is rarely hit because the
 *   user adds locations one at a time via `addLocation()`.
 */
@Component({
  selector: 'app-step-pricing',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
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

  @ViewChild('locationInput')
  private locationInputRef?: ElementRef<HTMLInputElement>;

  readonly form = input.required<FormGroup>();

  /**
   * Optional pre-supplied distribution-location list. When provided, the
   * component resolves `distributionLocationIds` against this list
   * instead of calling the backend — used when editing an existing meal,
   * whose `MealResponse` already carries the location summaries.
   */
  readonly initialLocations = input<LocationSummary[] | null>(null);

  // ─── Location state ───────────────────────────────────────
  readonly locationFilter = signal<string>('');
  private readonly searchResults = signal<LocationSummary[]>([]);
  readonly selectedLocations = signal<LocationSummary[]>([]);
  readonly highlightIndex = signal<number>(-1);
  readonly dropdownOpen = signal<boolean>(false);

  private readonly locationCache = signal<Map<string, LocationSummary>>(new Map());

  protected readonly filteredLocations = computed(() => {
    const selected = new Set(this.selectedLocations().map(l => l.id));
    return this.searchResults().filter(l => !selected.has(l.id));
  });

  protected readonly showDropdown = computed(
    () => this.dropdownOpen() && this.filteredLocations().length > 0,
  );

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

  private readonly _effectivePrice = signal<number>(0);
  protected readonly effectivePrice = this._effectivePrice.asReadonly();

  protected readonly commissionAmount = computed(() =>
    Math.round((this.effectivePrice() * this.commissionRate) / 100),
  );

  protected readonly netPayout = computed(
    () => this.effectivePrice() - this.commissionAmount(),
  );

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    // Seed the local cache from the caller-provided list, if any.
    // This must happen before the valueChanges subscription fires so
    // the first `syncSelected` resolves against a populated cache.
    const provided = this.initialLocations();
    if (provided && provided.length > 0) {
      const next = new Map(this.locationCache());
      for (const l of provided) next.set(l.id, l);
      this.locationCache.set(next);
    }

    this.locationIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ids => this.syncSelected(ids ?? []));

    this.syncSelected(this.locationIds.value ?? []);

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

  // ─── Location selection sync ──────────────────────────────

  private syncSelected(ids: string[]): void {
    if (!ids.length) {
      this.selectedLocations.set([]);
      return;
    }

    const cache = this.locationCache();
    const missing = ids.filter(id => !cache.has(id));

    if (missing.length) {
      // When a caller-provided list is used, any id not present in it is
      // either deleted or DISABLED (hidden by @SQLRestriction on the
      // backend). Re-fetching won't find it — resolve what we have and
      // log the rest.
      if (this.initialLocations() !== null) {
        console.warn(
          '[StepPricing] location ids not in the supplied list, skipping:',
          missing,
        );
        this.updateSelectedFromCache(ids);
        return;
      }

      // Fallback path (no initial list): fetch a page and hope it covers
      // the ids. Rarely hit — the create flow adds locations one at a time.
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
    const list: LocationSummary[] = [];
    for (const id of ids) {
      const loc = cache.get(id);
      if (loc) {
        list.push(loc);
      } else {
        console.warn('[StepPricing] unresolved location id', id);
      }
    }
    this.selectedLocations.set(list);
  }

  // ─── Location search ──────────────────────────────────────

  protected onLocationInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.locationFilter.set(value);
    this.highlightIndex.set(-1);

    if (value.trim().length < 2) {
      this.searchResults.set([]);
      this.dropdownOpen.set(false);
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
        next: (page) => {
          this.searchResults.set(page.content);
          this.dropdownOpen.set(true);
          this.highlightIndex.set(page.content.length > 0 ? 0 : -1);
        },
        error: (err) => {
          console.error('[StepPricing] search error', err);
          this.searchResults.set([]);
          this.dropdownOpen.set(false);
        },
      });
  }

  // ─── Keyboard navigation ──────────────────────────────────

  protected onInputKeydown(event: KeyboardEvent): void {
    const results = this.filteredLocations();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.dropdownOpen()) {
        this.dropdownOpen.set(true);
        return;
      }
      this.highlightIndex.update(i => Math.min(i + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightIndex.update(i => Math.max(i - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      if (this.dropdownOpen() && this.highlightIndex() >= 0 && results[this.highlightIndex()]) {
        event.preventDefault();
        this.addLocation(results[this.highlightIndex()]);
      }
      return;
    }

    if (event.key === 'Escape') {
      this.dropdownOpen.set(false);
      this.highlightIndex.set(-1);
    }
  }

  // ─── Add / remove ─────────────────────────────────────────

  addLocation(location: LocationSummary): void {
    if (this.selectedLocations().some(l => l.id === location.id)) return;

    const cache = new Map(this.locationCache());
    cache.set(location.id, location);
    this.locationCache.set(cache);

    this.locationIds.setValue([...this.locationIds.value, location.id]);
    this.locationIds.markAsTouched();
    this.clearFilter();
  }

  removeLocation(location: LocationSummary): void {
    const next = this.locationIds.value.filter(id => id !== location.id);
    this.locationIds.setValue(next);
    this.locationIds.markAsTouched();
  }

  private clearFilter(): void {
    this.locationFilter.set('');
    this.searchResults.set([]);
    this.dropdownOpen.set(false);
    this.highlightIndex.set(-1);
    this.locationInputRef?.nativeElement.focus();
  }

  // ─── Create dialog ────────────────────────────────────────

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

  // ─── Outside-click closes dropdown ────────────────────────

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownOpen()) return;
    const host = (event.target as HTMLElement).closest('app-step-pricing');
    if (!host) this.dropdownOpen.set(false);
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
