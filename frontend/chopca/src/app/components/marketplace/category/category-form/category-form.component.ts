import {
  ChangeDetectionStrategy, Component, effect, inject, input, output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '@components/shared/icon/icon.component';
import { CategoryIconPickerComponent } from '../category-icon-picker/category-icon-picker.component';
import { Category, CategoryRequest } from '@app/core/models/marketplace';
import { CategoryType } from '@app/core/models/marketplace/enum-type.model';

interface TypeTab {
  readonly value: CategoryType;
  readonly label: string;
  readonly icon: string;
  readonly caption: string;
}

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, CategoryIconPickerComponent],
  templateUrl: './category-form.component.html',
  styleUrl: './category-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryFormComponent {

  private readonly fb = inject(FormBuilder);

  readonly editing = input<Category | null>(null);
  readonly submitting = input<boolean>(false);

  readonly submitted = output<CategoryRequest>();
  readonly cancelEdit = output<void>();

  /** Extend this array when the backend adds new CategoryType values. */
  protected readonly types: readonly TypeTab[] = [
    {
      value: 'CUISINE',
      label: 'Cuisine',
      icon: 'soup_kitchen',
      caption: 'Région, terroir ou tradition culinaire (ex: Sawa, Grassfields).',
    },
    {
      value: 'DISH_TYPE',
      label: 'Type de plat',
      icon: 'dinner_dining',
      caption: 'Rôle structurel du plat (ex: Entrée, Plat principal, Dessert).',
    },
  ];

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(250)]],
    iconUrl: [null as string | null],
    type: ['CUISINE' as CategoryType, Validators.required],
  });

  protected readonly charCount = () => this.form.controls.description.value.length;

  constructor() {
    // Hydrate / reset whenever the editing input changes.
    effect(() => {
      const cat = this.editing();
      if (cat) {
        this.form.reset({
          name: cat.name,
          description: cat.description ?? '',
          iconUrl: cat.iconUrl,
          type: cat.type,
        });
      } else {
        this.form.reset({
          name: '', description: '', iconUrl: null, type: 'CUISINE',
        });
      }
    });
  }

  protected selectType(type: CategoryType): void {
    this.form.controls.type.setValue(type);
  }

  protected onIconChange(glyph: string | null): void {
    this.form.controls.iconUrl.setValue(glyph);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: CategoryRequest = {
      name: raw.name.trim(),
      type: raw.type,
      ...(raw.description.trim() ? { description: raw.description.trim() } : {}),
      ...(raw.iconUrl ? { iconUrl: raw.iconUrl } : {}),
    };
    this.submitted.emit(payload);
  }

  protected onReset(): void {
    if (this.editing()) {
      this.cancelEdit.emit();
    } else {
      this.form.reset({ name: '', description: '', iconUrl: null, type: 'CUISINE' });
    }
  }

  protected currentType(): TypeTab {
    const t = this.form.controls.type.value;
    return this.types.find(x => x.value === t) ?? this.types[0];
  }
}
