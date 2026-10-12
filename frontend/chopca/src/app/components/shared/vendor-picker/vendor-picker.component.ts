import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  computed,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  catchError,
  map,
} from 'rxjs/operators';
import { Observable } from 'rxjs';
import { IconComponent } from '@components/shared/icon/icon.component';
import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import { Vendor, VendorSummary } from '@app/core/models/marketplace';

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_RESULT_LIMIT = 10;
const MIN_SEARCH_LENGTH = 2;

/**
 * VendorPickerComponent — searchable vendor selector.
 *
 * A keyword → search → dropdown chip autocomplete, capped at
 * `maxSelection` (default 1). Renders the vendor's image in both the
 * dropdown and the chip.
 *
 * The host owns the selected ids. `selectedVendorIds` seeds the chips
 * on first render; `vendorsSelected` emits the new selection on every
 * change.
 *
 * When `selectedVendorId` is provided (a legacy single-id input), it's
 * treated as the sole preselected value. Prefer `selectedVendorIds`.
 */
@Component({
  selector: 'app-vendor-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './vendor-picker.component.html',
  styleUrl: './vendor-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorPickerComponent {

  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  // ─── Inputs ───────────────────────────────────────────────
  /** Maximum number of vendors a user can pick. Defaults to 1. */
  readonly maxSelection = input<number>(1);

  /** Pre-selected vendor ids, if the parent has some. */
  readonly selectedVendorIds = input<string[]>([]);

  /** Legacy single-id input. Treated as a one-element `selectedVendorIds`. */
  readonly selectedVendorId = input<string | null>(null);

  // ─── Outputs ──────────────────────────────────────────────
  /** Emitted with the selected ids whenever the selection changes. */
  readonly vendorsSelected = output<VendorSummary[]>();

  /** Legacy single-id output. Emitted with the first selected id, or null. */
  readonly vendorSelected = output<string | null>();

  // ─── Search state ─────────────────────────────────────────
  protected readonly searchInput = signal<string>('');
  private readonly search$ = new Subject<string>();
  protected readonly searchResults = signal<VendorSummary[]>([]);
  protected readonly isSearching = signal<boolean>(false);
  protected readonly dropdownOpen = signal<boolean>(false);
  protected readonly inputFocused = signal<boolean>(false);

  /** Cached vendor objects for chips, keyed by id. */
  private readonly vendorCache = signal<Map<string, VendorSummary>>(new Map());

  /** Committed ids, mirrored from the inputs. */
  protected readonly selectedIds = signal<string[]>([]);

  // ─── Derived ──────────────────────────────────────────────
  protected readonly selectedVendors = computed<VendorSummary[]>(() => {
    const ids = this.selectedIds();
    if (ids.length === 0) return [];
    const cache = this.vendorCache();
    const out: VendorSummary[] = [];
    for (const id of ids) {
      const found = cache.get(id);
      if (found) out.push(found);
    }
    return out;
  });

  protected readonly selectedIdSet = computed(() => new Set(this.selectedIds()));

  protected readonly availableResults = computed(() => {
    const picked = this.selectedIdSet();
    return this.searchResults().filter((v) => !picked.has(v.id));
  });

  protected readonly atLimit = computed(
    () => this.selectedIds().length >= this.maxSelection(),
  );

  /** True when the empty state should show. */
  protected readonly showEmptyState = computed(() => {
    if (!this.inputFocused()) return false;
    if (this.isSearching()) return false;
    if (this.searchInput().trim().length < MIN_SEARCH_LENGTH) return false;
    return this.availableResults().length === 0;
  });

  protected readonly minSearchLength = MIN_SEARCH_LENGTH;

  /**
   * Flex-basis for each chip, so N chips fill the row.
   * `calc(100% / N - gap * (N - 1) / N)` — enough room for the chips
   * plus the gaps between them.
   */
  protected readonly chipBasis = computed(() => {
    const n = Math.max(1, this.maxSelection());
    // The container gap is 0.375rem (gap-1.5 in Tailwind). Adjust if
    // the container's gap changes.
    const gap = 0.375;
    // (n - 1) gaps distributed across n chips.
    const share = `calc((92% - ${(n - 1) * gap}rem) / ${n})`;
    return share;
  });

  constructor() {
    // ─── Seed the selection from inputs ───────────────────────
    effect(() => {
      const ids = this.selectedVendorIds().length > 0
        ? this.selectedVendorIds()
        : (this.selectedVendorId() ? [this.selectedVendorId()!] : []);
      this.selectedIds.set([...ids]);
    });

    // ─── Resolve preselected ids to objects ───────────────────
    effect(() => {
      const ids = this.selectedIds();
      const missing = ids.filter((id) => !this.vendorCache().has(id));
      if (missing.length === 0) return;

      for (const id of missing) {
        this.vendorService.getVendorById(id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (vendor: Vendor) => {
              this.vendorCache.update((m) => {
                const next = new Map(m);
                next.set(id, vendor as unknown as VendorSummary);
                return next;
              });
            },
            error: () => {
              // Leave it unresolved; the chip renders blank until the
              // vendor is fetched. Not fatal.
            },
          });
      }
    });

    // ─── Debounced search ─────────────────────────────────────
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((term): Observable<VendorSummary[]> => {
          const trimmed = term.trim();
          if (trimmed.length < MIN_SEARCH_LENGTH) {
            this.isSearching.set(false);
            return of<VendorSummary[]>([]);
          }
          this.isSearching.set(true);
          return this.vendorService.searchVendors({
            keyword: trimmed,
            size: SEARCH_RESULT_LIMIT,
            sortBy: 'businessName',
            sortDirection: 'ASC',
          }).pipe(
            map((page: any) => (page.content ?? []) as VendorSummary[]),
            catchError((err) => {
              console.error('[VendorPicker] search failed', err);
              return of<VendorSummary[]>([]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((content) => {
        this.searchResults.set(content);
        this.isSearching.set(false);
        this.dropdownOpen.set(this.inputFocused() && this.searchInput().trim().length > 0);
      });
  }

  // ═════════════════════════════════════════════════════════════
  //  Search interaction
  // ═════════════════════════════════════════════════════════════

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchInput.set(value);
    this.search$.next(value);
  }

  protected onFocus(): void {
    this.inputFocused.set(true);
    if (this.searchResults().length > 0) {
      this.dropdownOpen.set(true);
    }
  }

  protected onBlur(): void {
    setTimeout(() => {
      this.inputFocused.set(false);
      this.dropdownOpen.set(false);
    }, 150);
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = this.availableResults()[0];
      if (first) this.addVendor(first);
    } else if (event.key === 'Escape') {
      this.dropdownOpen.set(false);
    }
  }

  // ═════════════════════════════════════════════════════════════
  //  Selection
  // ═════════════════════════════════════════════════════════════

  protected addVendor(vendor: VendorSummary): void {
    if (this.atLimit()) return;
    if (this.selectedIdSet().has(vendor.id)) return;

    // Cache the object so the chip renders immediately.
    this.vendorCache.update((m) => {
      const next = new Map(m);
      next.set(vendor.id, vendor);
      return next;
    });

    const nextIds = [...this.selectedIds(), vendor.id];
    this.selectedIds.set(nextIds);

    // Clear input and close dropdown.
    this.searchInput.set('');
    this.searchResults.set([]);
    this.dropdownOpen.set(false);

    this.emitSelection(nextIds);
  }

  protected removeVendor(vendor: VendorSummary): void {
    const nextIds = this.selectedIds().filter((id) => id !== vendor.id);
    this.selectedIds.set(nextIds);
    this.emitSelection(nextIds);
  }

  private emitSelection(ids: string[]): void {
    const cache = this.vendorCache();
    const objects = ids.map((id) => cache.get(id)).filter(Boolean) as VendorSummary[];
    this.vendorsSelected.emit(objects);
    this.vendorSelected.emit(ids[0] ?? null);
  }
}
