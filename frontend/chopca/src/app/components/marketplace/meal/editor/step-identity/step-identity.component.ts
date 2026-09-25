import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  inject,
  signal,
  computed,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { CATEGORY_SERVICE } from '@app/core/services/marketplace/category.service';
import {
  Category,
  CategorySearchRequest,
} from '@app/core/models/marketplace';

import { MediaRef, MediaUploadResponse } from '@app/core/models/marketplace';
import { ImageUploaderComponent } from '@components/shared/image-uploader/image-uploader.component';

/**
 * Step 1 — Identity.
 *
 * Fields:
 * - name (mat input)
 * - cuisineIds (chips + autocomplete, CUISINE category)
 * - dishTypeIds (chips + autocomplete, DISH_TYPE category)
 * - description (textarea)
 * - image URL (plain text field for now)
 */
@Component({
  selector: 'app-step-identity',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule,
    ImageUploaderComponent
  ],
  templateUrl: './step-identity.component.html',
  styleUrl: './step-identity.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepIdentityComponent implements OnInit {

  private readonly categoryService = inject(CATEGORY_SERVICE);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = input.required<FormGroup>();

  // inputs / outputs for media:
  readonly imageMedia = input<MediaRef | null>(null);
  readonly imageUploaded = output<MediaUploadResponse>();
  readonly imageCleared = output<void>();

  // ─── Categories ───────────────────────────────────────────
  readonly cuisines = signal<Category[]>([]);
  readonly dishTypes = signal<Category[]>([]);

  // ─── Selected items (for chip display) ────────────────────
  readonly selectedCuisines = signal<Category[]>([]);
  readonly selectedDishTypes = signal<Category[]>([]);

  // ─── Filtered autocomplete ────────────────────────────────
  readonly cuisineFilter = signal<string>('');
  readonly dishTypeFilter = signal<string>('');

  protected readonly filteredCuisines = computed(() => {
    const q = this.cuisineFilter().toLowerCase();
    const selected = new Set(this.selectedCuisines().map(c => c.id));
    return this.cuisines().filter(c =>
      !selected.has(c.id) && (!q || c.name.toLowerCase().includes(q))
    );
  });

  protected readonly filteredDishTypes = computed(() => {
    const q = this.dishTypeFilter().toLowerCase();
    const selected = new Set(this.selectedDishTypes().map(c => c.id));
    return this.dishTypes().filter(c =>
      !selected.has(c.id) && (!q || c.name.toLowerCase().includes(q))
    );
  });

  // ─── Accessors ────────────────────────────────────────────
  protected get name(): FormControl<string> {
    return this.form().controls['name'] as FormControl<string>;
  }
  protected get description(): FormControl<string> {
    return this.form().controls['description'] as FormControl<string>;
  }
  protected get cuisineIds(): FormControl<string[]> {
    return this.form().controls['cuisineIds'] as FormControl<string[]>;
  }
  protected get dishTypeIds(): FormControl<string[]> {
    return this.form().controls['dishTypeIds'] as FormControl<string[]>;
  }

  protected readonly descriptionLength = computed(
    () => this.description.value?.length ?? 0
  );

  // ─── Lifecycle ────────────────────────────────────────────

  ngOnInit(): void {
    this.loadCategories();

    // Sync chips when form values change (e.g. edit mode patch)
    this.cuisineIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ids => this.syncCuisines(ids ?? []));

    this.dishTypeIds.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(ids => this.syncDishTypes(ids ?? []));
  }

  private loadCategories(): void {
    const cuisineReq: CategorySearchRequest = { type: 'CUISINE', size: 100 };
    const dishReq: CategorySearchRequest = { type: 'DISH_TYPE', size: 100 };

    this.categoryService.searchCategories(cuisineReq)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.cuisines.set(page.content);
          this.syncCuisines(this.cuisineIds.value ?? []);
        },
        error: (err) => console.error('[StepIdentity] cuisines error', err),
      });

    this.categoryService.searchCategories(dishReq)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.dishTypes.set(page.content);
          this.syncDishTypes(this.dishTypeIds.value ?? []);
        },
        error: (err) => console.error('[StepIdentity] dish types error', err),
      });
  }

  private syncCuisines(ids: string[]): void {
    const all = this.cuisines();
    this.selectedCuisines.set(all.filter(c => ids.includes(c.id)));
  }
  private syncDishTypes(ids: string[]): void {
    const all = this.dishTypes();
    this.selectedDishTypes.set(all.filter(c => ids.includes(c.id)));
  }

  // ─── Cuisine actions ──────────────────────────────────────

  onCuisineFilterInput(event: Event): void {
    this.cuisineFilter.set((event.target as HTMLInputElement).value);
  }

  addCuisine(category: Category): void {
    if (this.selectedCuisines().some(c => c.id === category.id)) return;
    const next = [...this.cuisineIds.value, category.id];
    this.cuisineIds.setValue(next);
    this.cuisineIds.markAsTouched();
    this.cuisineFilter.set('');
  }

  removeCuisine(category: Category): void {
    const next = this.cuisineIds.value.filter(id => id !== category.id);
    this.cuisineIds.setValue(next);
    this.cuisineIds.markAsTouched();
  }

  // ─── Dish type actions ────────────────────────────────────

  onDishTypeFilterInput(event: Event): void {
    this.dishTypeFilter.set((event.target as HTMLInputElement).value);
  }

  addDishType(category: Category): void {
    if (this.selectedDishTypes().some(c => c.id === category.id)) return;
    const next = [...this.dishTypeIds.value, category.id];
    this.dishTypeIds.setValue(next);
    this.dishTypeIds.markAsTouched();
    this.dishTypeFilter.set('');
  }

  removeDishType(category: Category): void {
    const next = this.dishTypeIds.value.filter(id => id !== category.id);
    this.dishTypeIds.setValue(next);
    this.dishTypeIds.markAsTouched();
  }

  // ─── Errors ───────────────────────────────────────────────

  protected nameError(): string | null {
    const c = this.name;
    if (!c.touched || !c.errors) return null;
    if (c.errors['required'])  return 'Le nom est requis';
    if (c.errors['minlength']) return 'Minimum 3 caractères';
    if (c.errors['maxlength']) return 'Maximum 100 caractères';
    return null;
  }

  protected cuisineError(): string | null {
    const c = this.cuisineIds;
    if (!c.touched) return null;
    return (c.value ?? []).length === 0 ? 'Sélectionnez au moins une cuisine' : null;
  }

  protected dishTypeError(): string | null {
    const c = this.dishTypeIds;
    if (!c.touched) return null;
    return (c.value ?? []).length === 0 ? 'Sélectionnez au moins un type de plat' : null;
  }

}
