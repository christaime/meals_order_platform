import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl, AbstractControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

// ── Registration wizard components ────────────────────────
import { StepperHeaderComponent } from '@components/marketplace/registration/vendor/stepper-header/stepper-header.component';
import { PreviewCardComponent } from '@components/marketplace/registration/vendor/preview-card/preview-card.component';
import { BenefitsSidebarComponent } from '@components/marketplace/registration/vendor/benefits-sidebar/benefits-sidebar.component';
import { PreviewState } from '@components/marketplace/registration/vendor/preview-card/preview-state.model';
import { IdentityComponent } from '@components/marketplace/registration/vendor/sections/identity/identity.component';
import { CuisineComponent } from '@components/marketplace/registration/vendor/sections/cuisine/cuisine.component';
import { VisualsComponent } from '@components/marketplace/registration/vendor/sections/visuals/visuals.component';
import { LogisticsComponent } from '@components/marketplace/registration/vendor/sections/logistics/logistics.component';
import { KycComponent } from '@components/marketplace/registration/vendor/sections/kyc/kyc.component';

// ── Shared ─────────────────────────────────────────────────
import { IconComponent } from '@components/shared/icon/icon.component';

// ── Domain / services ──────────────────────────────────────
import { VENDOR_SERVICE } from '@app/core/services/marketplace/vendor.service';
import {
  Category,
  CreateVendorRequest,
  MediaRef,
  MediaUploadResponse,
} from '@app/core/models/marketplace';
import { KeycloakService } from '@core/services/auth/keycloak.service';
import { UserContextService } from '@core/services/auth/user-context.service';
import { AppSessionStore, RETURN_URL_KEY } from '@core/storage/app.store';

/**
 * Vendor registration page.
 *
 * Owns the single source of truth for the wizard: the FormGroup.
 * Each section receives that form and reads it for display state.
 * The page handles all writes to the form, so the sections stay
 * presentational.
 *
 * Two kinds of state live here, not in the form:
 *   - resolved upload URLs (the form only holds storage refs)
 *   - the selected cuisine `Category` objects (the form only holds IDs)
 *
 * Both feed `PreviewState`, which is the only thing the preview card
 * ever sees.
 *
 * Wizard step grouping (matches StepperHeaderComponent.steps and
 * stepControls below):
 *   1 — Section A          (identity)
 *   2 — Sections B + C     (cuisine + visuals)
 *   3 — Section D          (logistics)
 *   4 — Section E          (KYC)
 *
 * DTO contract: see `CreateVendorRequest`. Form field names match the
 * DTO exactly — no remap in `buildPayload()`.
 */
@Component({
  selector: 'app-vendor-registration-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IconComponent,
    StepperHeaderComponent,
    PreviewCardComponent,
    BenefitsSidebarComponent,
    IdentityComponent,
    CuisineComponent,
    VisualsComponent,
    LogisticsComponent,
    KycComponent,
  ],
  templateUrl: './vendor-registration.page.html',
  styleUrl: './vendor-registration.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorRegistrationPage {

  // ══════════════════════════════════════════════════════════
  // Services
  // ══════════════════════════════════════════════════════════

  private readonly fb = inject(FormBuilder);
  private readonly vendorService = inject(VENDOR_SERVICE);
  private readonly keycloak = inject(KeycloakService);
  private readonly ctx = inject(UserContextService);
  private readonly router = inject(Router);

  // ══════════════════════════════════════════════════════════
  // Form — single source of truth
  // ══════════════════════════════════════════════════════════

  /**
   * Field names mirror `CreateVendorRequest` exactly.
   *
   * The CNI storage refs are `@NotBlank`-commented on the backend, but
   * we keep them required here as a business rule for the moderation
   * flow. Relax by removing `Validators.required` if you want the
   * backend's current policy to be the only one enforced.
   */
  protected readonly form: FormGroup = this.fb.nonNullable.group({
    // ── Section A ────────────────────────────────────────
    businessName: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]],
    ownerName: [this.keycloak!.getUserName(), [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(100),
    ]],
    phone: ['', [
      Validators.required,
      Validators.pattern(/^\+?[0-9]{8,15}$/),
    ]],
    description: ['', [Validators.maxLength(2000)]],

    // ── Section B ────────────────────────────────────────
    cuisineCategoryIds: [[] as string[], [
      Validators.required,
      Validators.minLength(1),
    ]],

    // ── Section C ────────────────────────────────────────
    profileImageStorageRef: [null as string | null, Validators.required],
    coverImageStorageRef:   [null as string | null, Validators.required],

    // ── Section D ────────────────────────────────────────
    cityId:       ['', [Validators.required]],
    address: ['', [
      Validators.required,
      Validators.maxLength(255),
    ]],
    pickupAddress:  ['', [Validators.maxLength(255)]],
    deliveryRadius: [8, [
      Validators.required,
      Validators.min(1),
      Validators.max(25),
    ]],

    // ── Section E ────────────────────────────────────────
    idCardFrontStorageRef: [null as string | null, Validators.required],
    idCardBackStorageRef:  [null as string | null, Validators.required],
    termsCertify:          [false, Validators.requiredTrue],
  });

  // ══════════════════════════════════════════════════════════
  // Wizard state
  // ══════════════════════════════════════════════════════════

  protected readonly currentStep = signal<number>(1);
  protected readonly submitting  = signal<boolean>(false);
  protected readonly submitError = signal<string | null>(null);

  /**
   * Resolved upload URLs. Not derivable from the form (which holds
   * only refs), so they live here. Keyed by field name so the four
   * `on*Uploaded` handlers stay symmetric.
   */
  private readonly uploadUrls = signal<Record<string, string | null>>({});

  /** Full selected `Category` objects, kept in sync by Section B. */
  private readonly selectedCuisines = signal<Category[]>([]);

  // ══════════════════════════════════════════════════════════
  // Derived: MediaRefs for edit-mode display
  // ══════════════════════════════════════════════════════════

  /**
   * `MediaRef.id` IS the storage ref. Built here from the form value
   * (ref) + the cached upload URL. Null on a fresh registration.
   */
  protected readonly profileMediaRef = computed<MediaRef | null>(() =>
    this.buildMediaRef('profileImageStorageRef', 'profile')
  );

  protected readonly coverMediaRef = computed<MediaRef | null>(() =>
    this.buildMediaRef('coverImageStorageRef', 'cover')
  );

  protected readonly frontMediaRef = computed<MediaRef | null>(() =>
    this.buildMediaRef('idCardFrontStorageRef', 'front')
  );

  protected readonly backMediaRef = computed<MediaRef | null>(() =>
    this.buildMediaRef('idCardBackStorageRef', 'back')
  );

  // ══════════════════════════════════════════════════════════
  // Derived: preview state
  // ══════════════════════════════════════════════════════════

  protected readonly previewState = computed<PreviewState>(() => {
    const v = this.form.getRawValue();
    const radius = typeof v.deliveryRadius === 'number' ? v.deliveryRadius : null;

    return {
      businessName:   (v.businessName ?? '').trim(),
      description:    (v.description ?? '').trim(),
      deliveryRadius: radius,
      logoUrl:        this.uploadUrls()['profile'] ?? null,
      coverUrl:       this.uploadUrls()['cover']   ?? null,
      cuisineLabels:  this.selectedCuisines().map(c => c.name),
    };
  });

  // ══════════════════════════════════════════════════════════
  // Derived: section error for the cuisine pills
  // ══════════════════════════════════════════════════════════

  protected readonly cuisineError = computed<string | null>(() => {
    const ctrl = this.form.get('cuisineCategoryIds');
    if (!ctrl || !ctrl.touched) return null;
    if (ctrl.hasError('minlength') || ctrl.hasError('required')) {
      return 'Sélectionnez au moins une spécialité culinaire.';
    }
    return null;
  });

  // ══════════════════════════════════════════════════════════
  // Section event handlers
  // ══════════════════════════════════════════════════════════

  // ── Section A ──────────────────────────────────────────

  protected onAppendInspiration(snippet: string): void {
    const ctrl = this.form.get('description') as FormControl<string>;
    const current = ctrl.value ?? '';
    ctrl.setValue(current.trim().length > 0 ? `${current} ${snippet}` : snippet);
    ctrl.markAsDirty();
  }

  // ── Section B ──────────────────────────────────────────

  protected onCategoriesSelected(cats: Category[]): void {
    this.selectedCuisines.set(cats);
  }

  // ── Section C — two independent uploaders ──────────────

  protected onLogoUploaded(res: MediaUploadResponse): void {
    this.writeUpload('profileImageStorageRef', 'profile', res);
  }

  protected onLogoCleared(): void {
    this.clearUpload('profileImageStorageRef', 'profile');
  }

  protected onCoverUploaded(res: MediaUploadResponse): void {
    this.writeUpload('coverImageStorageRef', 'cover', res);
  }

  protected onCoverCleared(): void {
    this.clearUpload('coverImageStorageRef', 'cover');
  }

  // ── Section E — two independent uploaders ──────────────

  protected onFrontUploaded(res: MediaUploadResponse): void {
    this.writeUpload('idCardFrontStorageRef', 'front', res);
  }

  protected onFrontCleared(): void {
    this.clearUpload('idCardFrontStorageRef', 'front');
  }

  protected onBackUploaded(res: MediaUploadResponse): void {
    this.writeUpload('idCardBackStorageRef', 'back', res);
  }

  protected onBackCleared(): void {
    this.clearUpload('idCardBackStorageRef', 'back');
  }

  // ══════════════════════════════════════════════════════════
  // Wizard navigation
  // ══════════════════════════════════════════════════════════

  protected next(): void {
    this.touchCurrentStep();
    if (!this.isCurrentStepValid()) return;
    this.currentStep.update(s => Math.min(s + 1, 4));
  }

  protected back(): void {
    this.currentStep.update(s => Math.max(s - 1, 1));
  }

  protected goToStep(step: number): void {
    if (step < 1 || step > 4) return;
    if (step < this.currentStep()) this.currentStep.set(step);
  }

  // ══════════════════════════════════════════════════════════
  // Actions
  // ══════════════════════════════════════════════════════════

  protected saveDraft(): void {
    try {
      localStorage.setItem(
        'vendor-registration.draft',
        JSON.stringify(this.form.getRawValue()),
      );
    } catch (e) {
      console.warn('[VendorRegistration] draft save failed', e);
    }
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.jumpToFirstInvalidStep();
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const payload = this.buildPayload();
      await firstValueFrom(this.vendorService.registerVendor(payload));

      // Success path:
      //   1. refresh the token so it picks up the VENDOR role
      //   2. reload context (now includes the vendor)
      //   3. navigate to the returnUrl
      await this.keycloak.refreshToken();
      this.ctx.clear();
      await this.ctx.ensureLoaded();
      // Consume the returnUrl (reads and clears it).
      const returnUrl = AppSessionStore.consume(RETURN_URL_KEY) ?? '/vendor/dashboard';
      await this.router.navigateByUrl(returnUrl);
    } catch (e: any) {
      this.submitError.set(
        e?.error?.message ?? "Échec de l'inscription. Veuillez réessayer.",
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected cancel(): void {
    // Consume the returnUrl (reads and clears it).
    const returnUrl = AppSessionStore.consume(RETURN_URL_KEY) ?? '/vendor/dashboard';
    void this.router.navigateByUrl(returnUrl);
  }

  // ══════════════════════════════════════════════════════════
  // Internals
  // ══════════════════════════════════════════════════════════

  /**
   * Build the payload. Form field names match the DTO exactly,
   * so no remapping is needed — only null-coalescing and trims.
   */
  private buildPayload(): CreateVendorRequest {
    const v = this.form.getRawValue();

    const address = (v.address ?? '').trim();
    const pickup  = (v.pickupAddress ?? '').trim();
    const desc    = (v.description ?? '').trim();

    return {
      businessName: v.businessName.trim(),
      ownerName:    v.ownerName.trim(),
      address,
      cityId: v.cityId,
      phone:        v.phone.trim(),
      description:  desc.length > 0 ? desc : null,
      deliveryRadius: typeof v.deliveryRadius === 'number' ? v.deliveryRadius : null,
      pickupAddress:  pickup.length > 0 ? pickup : null,
      profileImageStorageRef: v.profileImageStorageRef ?? null,
      coverImageStorageRef:   v.coverImageStorageRef ?? null,
      idCardFrontStorageRef:  v.idCardFrontStorageRef ?? null,
      idCardBackStorageRef:   v.idCardBackStorageRef ?? null,
      cuisineCategoryIds:     v.cuisineCategoryIds,
    };
  }

  /**
   * Shared writer for the four image upload handlers.
   * Writes the storage ref to the form and caches the resolved URL.
   */
  private writeUpload(
    formControlName: string,
    urlKey: string,
    res: MediaUploadResponse,
  ): void {
    const ctrl = this.form.get(formControlName);
    ctrl?.setValue(res.storageRef);       // res.id IS the storage ref
    ctrl?.markAsDirty();
    ctrl?.markAsTouched();

    this.uploadUrls.update(u => ({ ...u, [urlKey]: res.url }));
  }

  /**
   * Shared clearer for the four image clear handlers.
   * Nulls the form control and drops the cached URL.
   */
  private clearUpload(formControlName: string, urlKey: string): void {
    const ctrl = this.form.get(formControlName);
    ctrl?.setValue(null);
    ctrl?.markAsDirty();

    this.uploadUrls.update(u => ({ ...u, [urlKey]: null }));
  }

  /**
   * Build a `MediaRef` from a form control (the storage ref) plus the
   * cached upload URL. Returns null when either side is missing.
   */
  private buildMediaRef(
    formControlName: string,
    urlKey: string,
  ): MediaRef | null {
    const ref = this.form.get(formControlName)?.value;
    const url = this.uploadUrls()[urlKey];
    return ref && url ? { id: ref, url } : null;
  }

  private touchCurrentStep(): void {
    this.stepControls(this.currentStep()).forEach(c => c?.markAsTouched());
  }

  private isCurrentStepValid(): boolean {
    return this.stepControls(this.currentStep()).every(c => c?.valid ?? true);
  }

  private jumpToFirstInvalidStep(): void {
    for (let s = 1; s <= 4; s++) {
      if (!this.stepControls(s).every(c => c?.valid ?? true)) {
        this.currentStep.set(s);
        return;
      }
    }
  }

  /**
   * Map each wizard step to the controls that belong to it.
   *
   * Grouping (Option A — 4 steps):
   *   1 — Section A          (businessName, ownerName, phone, description)
   *   2 — Sections B + C     (cuisineCategoryIds, profileImageStorageRef,
   *                           coverImageStorageRef)
   *   3 — Section D          (address, pickupAddress, deliveryRadius)
   *   4 — Section E          (idCardFrontStorageRef, idCardBackStorageRef,
   *                           termsCertify)
   */
   private stepControls(step: number): AbstractControl[] {
     return this.stepControlNames(step)
       .map(n => this.form.get(n))
       .filter((c): c is AbstractControl => c !== null);
   }

 private stepControlNames(step: number): string[] {
     switch (step) {
       case 1:
         return ['businessName', 'ownerName', 'phone', 'description'];
       case 2:
         return [
           'cuisineCategoryIds',
           'profileImageStorageRef',
           'coverImageStorageRef',
         ];
       case 3:
         return ['address', 'pickupAddress', 'deliveryRadius'];
       case 4:
         return [
           'idCardFrontStorageRef',
           'idCardBackStorageRef',
           'termsCertify',
         ];
       default:
         return [];
     }
   }
}
