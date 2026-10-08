import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { IconComponent } from '@components/shared/icon/icon.component';
import { PaginatorComponent } from '@components/shared/paginator/paginator.component';
import { VendorPickerComponent }  from '@components/shared/vendor-picker/vendor-picker.component';
import { ToastService } from '@components/shared/toast';
import { ModerationPanelComponent } from '@components/marketplace/moderation/moderation-panel/moderation-panel.component';
import {
  LocationFiltersComponent,
  LocationTableComponent,
} from '@components/marketplace/location';
import { LocationFormComponent } from '@components/marketplace/location/location-form/location-form.component';

import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { UserContextService } from '@app/core/services/auth/user-context.service';
import { KEYCLOAK_SERVICE } from '@core/services/auth/keycloak.service';
import { Location, LocationSearchRequest } from '@app/core/models/marketplace';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';
import { ModerationDataResponse } from '@app/core/models/marketplace/moderation.model';
import { DataPage } from '@app/core/models/shared';
import { LocationSort } from '@components/marketplace/location/location-filters/location-filters.component';
import {
  DeleteEntityDialogComponent,
} from '@components/shared/delete-entity-dialog/delete-entity-dialog.component';


type Scope = 'vendor' | 'admin';

@Component({
  selector: 'app-locations-page',
  standalone: true,
  imports: [
    IconComponent,
    PaginatorComponent,
    ModerationPanelComponent,
    LocationFormComponent,
    LocationFiltersComponent,
    LocationTableComponent,
    VendorPickerComponent,
  ],
  templateUrl: './locations.page.html',
  styleUrl: './locations.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationsPageComponent {

  private readonly route = inject(ActivatedRoute);
  private readonly locationService = inject(LOCATION_SERVICE);
  private readonly userContext = inject(UserContextService);
  private readonly roleContext = inject(KEYCLOAK_SERVICE);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  /** Route-data driven: 'vendor' | 'admin'. */
  protected readonly scope = signal<Scope>(
    (this.route.snapshot.data['scope'] as Scope) ?? 'vendor',
  );

  // ─── Filters ──────────────────────────────────────────────
  /**
   * From `?name=…`. The route's query param name must be `name`.
   * Nullable — withComponentInputBinding binds after construction.
   */
  readonly initialKeyword = input<string | null>(null, { alias: 'name' });
  protected readonly name = signal<string>('');
  protected readonly moderationStatus = signal<ModerationStatus | 'ALL'>('ALL');
  protected readonly sort = signal<LocationSort>('name-asc');
  protected readonly page = signal<number>(0);
  protected readonly size = signal<number>(10);

  // ─── Admin-selected vendor ────────────────────────────────
  protected readonly adminVendorId = signal<string | null>(null);

  // ─── Effective vendor ID ──────────────────────────────────
  protected readonly effectiveVendorId = computed<string | null>(() => {
    if (this.scope() === 'vendor') {
      return this.userContext.vendor()?.id ?? null;
    }
    return this.adminVendorId();
  });

  // ─── Data ─────────────────────────────────────────────────
  protected readonly result = signal<DataPage<Location> | null>(null);
  protected readonly loading = signal<boolean>(false);

  // ─── Form / moderation selection ──────────────────────────
  protected readonly editing = signal<Location | null>(null);

  protected readonly moderableLocation = computed<Location | null>(() => {
    if (this.scope() !== 'admin') return null;
    if (!this.roleContext.isAdmin()) return null;
    return this.editing();
  });

  // ─── Query — null when no vendor selected ─────────────────
  private readonly query = computed<LocationSearchRequest | null>(() => {
    const vendorId = this.effectiveVendorId();
    if (!vendorId) return null;
    return {
      vendorId,
      page: this.page(),
      size: this.size(),
      ...(this.name() ? { keyword: this.name() } : {}),
      ...(this.moderationStatus() !== 'ALL'
        ? { moderationStatus: this.moderationStatus() as ModerationStatus }
        : {}),
      ...(this.sort() ? {
        sortBy: this.sort() === 'recent' ? 'createdAt' : 'name',
        sortDirection: this.sort() === 'name-desc' ? 'DESC' : 'ASC',
      } : {}),
    } as LocationSearchRequest;
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const vendorIdParam = params.get('vendorId');
    if (vendorIdParam) {
      this.adminVendorId.set(vendorIdParam);
    }
    effect(() => {
      const initial = this.initialKeyword();
      if (initial ) {
        this.name.set(initial);
      }
    }, { allowSignalWrites: true });
    effect(() => {
      const q = this.query();
      if (!q) {
        this.result.set(null);
        return;
      }
      this.load(q);
    });
  }

  private load(q: LocationSearchRequest): void {
    this.loading.set(true);
    this.locationService.searchLocations(q)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => { this.result.set(page); this.loading.set(false); },
        error: err => {
          this.loading.set(false);
          this.toast.show('Échec du chargement des emplacements', 'error');
          console.error(err);
        },
      });
  }

  private refresh(): void {
    const q = this.query();
    if (q) this.load(q);
  }

  // ─── Filter handlers ──────────────────────────────────────
  protected onNameChange(v: string): void { this.name.set(v); this.page.set(0); }
  protected onStatusChange(v: ModerationStatus | 'ALL'): void { this.moderationStatus.set(v); this.page.set(0); }
  protected onSortChange(v: LocationSort): void { this.sort.set(v); this.page.set(0); }
  protected onPageChange(p: number): void { this.page.set(p); }
  protected onSizeChange(s: number): void { this.size.set(s); this.page.set(0); }

  // ─── Admin vendor selection ───────────────────────────────
  protected onVendorSelected(vendorId: string): void {
    this.adminVendorId.set(vendorId);
    this.editing.set(null);
    this.page.set(0);
  }

  // ─── Row actions ──────────────────────────────────────────
  protected onEdit(loc: Location): void {
    this.editing.set(loc);
    document.getElementById('location-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onSelectForModeration(loc: Location): void {
    this.editing.set(loc);
    document.getElementById('location-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onCancelEdit(): void { this.editing.set(null); }

  protected onSaved(saved: Location): void {
    this.editing.set(saved);
    this.toast.show('Emplacement enregistré', 'success');
    this.refresh();
  }

  protected onDelete(loc: Location): void {
    this.dialog
      .open(DeleteEntityDialogComponent, {
        data: { name: loc.name, kind: 'location' },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.locationService.deleteLocation(loc.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.show('Emplacement supprimé', 'success');
              if (this.editing()?.id === loc.id) this.editing.set(null);
              this.refresh();
            },
            error: () => this.toast.show('Échec de la suppression', 'error'),
          });
      });
  }

  protected onModerated(_outcome: ModerationDataResponse | null): void {
    const current = this.editing();
    if (!current) return;
    this.locationService.getLocationById(current.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: fresh => { this.editing.set(fresh); this.refresh(); },
        error: () => this.refresh(),
      });
  }

  protected onQuickNew(): void {
    this.editing.set(null);
    document.getElementById('location-form-container')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
