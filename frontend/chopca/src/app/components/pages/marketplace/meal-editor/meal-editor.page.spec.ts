import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { MealEditorPageComponent } from './meal-editor.page';
import { MEAL_SERVICE } from '@app/core/services/marketplace/meal.service';
import { CATEGORY_SERVICE } from '@app/core/services/marketplace/category.service';
import { MEDIA_SERVICE } from '@app/core/services/marketplace/media.service';
import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import { LOCATION_SERVICE } from '@app/core/services/marketplace/location.service';
import { USER_CONTEXT_SERVICE } from '@core/services/auth';

function emptyPage() {
  return {
    content: [] as any[],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
    first: true,
    last: true,
    empty: true,
  };
}

describe('MealEditorPageComponent', () => {
  let fixture: ComponentFixture<MealEditorPageComponent>;
  let component: MealEditorPageComponent;

  // Mocks — recreated per test in `beforeEach`.
  let mealServiceMock: jasmine.SpyObj<any>;
  let categoryServiceMock: jasmine.SpyObj<any>;
  let mediaServiceMock: jasmine.SpyObj<any>;
  let ingredientServiceMock: jasmine.SpyObj<any>;
  let locationServiceMock: jasmine.SpyObj<any>;
  let dialogMock: jasmine.SpyObj<any>;
  let snackBarMock: jasmine.SpyObj<any>;
  let userContextMock: any;

  beforeEach(async () => {
    // ─── Meal service ─────────────────────────────────────
    mealServiceMock = jasmine.createSpyObj('MealService', [
      'createMeal', 'updateMeal', 'getMealById', 'search',
    ]);
    mealServiceMock.getMealById.and.returnValue(of({}));
    mealServiceMock.createMeal.and.returnValue(of({}));
    mealServiceMock.updateMeal.and.returnValue(of({}));
    mealServiceMock.search.and.returnValue(of(emptyPage()));

    // ─── Category service ─────────────────────────────────
    categoryServiceMock = jasmine.createSpyObj('CategoryService', ['searchCategories']);
    categoryServiceMock.searchCategories.and.returnValue(of(emptyPage()));

    // ─── Ingredient service ───────────────────────────────
    ingredientServiceMock = jasmine.createSpyObj('IngredientService', [
      'searchIngredients', 'searchIngredientsFlat', 'getIngredientsByIds',
    ]);
    ingredientServiceMock.searchIngredients.and.returnValue(of(emptyPage()));
    ingredientServiceMock.searchIngredientsFlat.and.returnValue(of([]));
    ingredientServiceMock.getIngredientsByIds.and.returnValue(of([]));

    // ─── Location service ─────────────────────────────────
    locationServiceMock = jasmine.createSpyObj('LocationService', [
      'searchLocations', 'searchLocationsFlat', 'getLocationsByIds',
    ]);
    locationServiceMock.searchLocations.and.returnValue(of(emptyPage()));
    locationServiceMock.searchLocationsFlat.and.returnValue(of([]));
    locationServiceMock.getLocationsByIds.and.returnValue(of([]));

    // ─── Media service ────────────────────────────────────
    mediaServiceMock = jasmine.createSpyObj('MediaService', ['upload']);
    mediaServiceMock.upload.and.returnValue(of({
      id: 'media-1',
      url: 'https://example.com/x.jpg',
      storageRef: 'media/x.jpg',
    }));

    // ─── Dialog ───────────────────────────────────────────
    dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    dialogMock.open.and.returnValue({ afterClosed: () => of(undefined) });

    // ─── Snackbar ─────────────────────────────────────────
    snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

    // ─── User context ─────────────────────────────────────
    userContextMock = {
      context: signal(null),
      vendor: signal({ id: 'vendor-chaudron' }),
      customer: signal(null),
      admin: signal(null),
      hasVendor: signal(true),
      hasCustomer: signal(false),
      hasAdmin: signal(false),
      ensureLoaded: () => Promise.resolve(null),
      reload: () => Promise.resolve(null),
      clear: () => {},
    };

    await TestBed.configureTestingModule({
      imports: [MealEditorPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => null } } },
        },
        { provide: MEAL_SERVICE,        useValue: mealServiceMock },
        { provide: CATEGORY_SERVICE,    useValue: categoryServiceMock },
        { provide: MEDIA_SERVICE,       useValue: mediaServiceMock },
        { provide: INGREDIENT_SERVICE,  useValue: ingredientServiceMock },
        { provide: LOCATION_SERVICE,    useValue: locationServiceMock },
        { provide: USER_CONTEXT_SERVICE, useValue: userContextMock },
        { provide: MatDialog,           useValue: dialogMock },
        { provide: MatSnackBar,         useValue: snackBarMock },
      ],
    }).compileComponents();
  });

  /**
   * Creates the component with whatever mocks are currently in place.
   *
   * Called once per test. Adjust mock behaviour *before* calling this —
   * the component's `ngOnInit` reads the services immediately.
   */
  function createComponent(): void {
    fixture = TestBed.createComponent(MealEditorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Preview — the bug fix
  // ═══════════════════════════════════════════════════════════

  describe('preview', () => {
    it('is null when the name is empty', () => {
      createComponent();
      expect(component['previewMeal']()).toBeNull();
    });

    it('is non-null as soon as the name is set, even without a price', () => {
      createComponent();
      component.form.controls.name.setValue('Taro sauce jaune');
      fixture.detectChanges();
      const preview = component['previewMeal']();
      expect(preview).not.toBeNull();
      expect(preview!.name).toBe('Taro sauce jaune');
      expect(preview!.price).toBe(0);
    });

    it('reflects the description on each keystroke', () => {
      createComponent();
      component.form.controls.name.setValue('Taro');
      component.form.controls.description.setValue('Taro frais du marché');
      fixture.detectChanges();
      expect(component['previewMeal']()!.description).toBe('Taro frais du marché');
    });

    it('reflects the price once it is set', () => {
      createComponent();
      component.form.controls.name.setValue('Taro');
      component.form.controls.price.setValue(4500);
      fixture.detectChanges();
      expect(component['previewMeal']()!.price).toBe(4500);
    });

    it('reflects the prep time', () => {
      createComponent();
      component.form.controls.name.setValue('Taro');
      component.form.controls.prepTimeMinutes.setValue(45);
      fixture.detectChanges();
      expect(component['previewMeal']()!.prepTimeMinutes).toBe(45);
    });

    it('updates on every form change', () => {
      createComponent();
      component.form.controls.name.setValue('A');
      expect(component['previewMeal']()!.name).toBe('A');
      component.form.controls.name.setValue('Ab');
      expect(component['previewMeal']()!.name).toBe('Ab');
      component.form.controls.name.setValue('Abc');
      expect(component['previewMeal']()!.name).toBe('Abc');
    });

    it('reflects the image URL after an upload', () => {
      createComponent();
      component.form.controls.name.setValue('Taro');
      component['onImageUploaded']({
        id: 'media-1',
        url: 'https://example.com/taro.jpg',
        storageRef: 'media/taro.jpg',
      } as any);
      fixture.detectChanges();
      expect(component['previewMeal']()!.imageUrl).toBe('https://example.com/taro.jpg');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Categories in the preview
  // ═══════════════════════════════════════════════════════════

  describe('preview categories', () => {
    it('resolves a cuisine id to its CategorySummary', () => {
      // Adjust the category mock BEFORE creating the component, because
      // `loadCategories()` runs in `ngOnInit` and reads the mock once.
      categoryServiceMock.searchCategories.and.callFake((req: any) => {
        if (req.type === 'CUISINE') {
          return of({
            content: [{ id: 'cuisine-camerounaise', name: 'Camerounaise' }],
            page: 0,
            size: 100,
            totalElements: 1,
            totalPages: 1,
          });
        }
        return of(emptyPage());
      });

      createComponent();

      component.form.controls.name.setValue('Taro');
      component.form.controls.cuisineIds.setValue(['cuisine-camerounaise']);
      fixture.detectChanges();

      const preview = component['previewMeal']()!;
      expect(preview.cuisines.length).toBe(1);
      expect(preview.cuisines[0].name).toBe('Camerounaise');
    });

    it('resolves a dish-type id to its CategorySummary', () => {
      categoryServiceMock.searchCategories.and.callFake((req: any) => {
        if (req.type === 'DISH_TYPE') {
          return of({
            content: [{ id: 'dish-main', name: 'Plat de résistance' }],
            page: 0,
            size: 100,
            totalElements: 1,
            totalPages: 1,
          });
        }
        return of(emptyPage());
      });

      createComponent();

      component.form.controls.name.setValue('Taro');
      component.form.controls.dishTypeIds.setValue(['dish-main']);
      fixture.detectChanges();

      const preview = component['previewMeal']()!;
      expect(preview.dishTypes.length).toBe(1);
      expect(preview.dishTypes[0].name).toBe('Plat de résistance');
    });

    it('drops ids that are not in the catalog', () => {
      categoryServiceMock.searchCategories.and.returnValue(of({
        content: [{ id: 'cuisine-camerounaise', name: 'Camerounaise' }],
        page: 0, size: 100, totalElements: 1, totalPages: 1,
      }));

      createComponent();

      component.form.controls.name.setValue('Taro');
      component.form.controls.cuisineIds.setValue(['cuisine-camerounaise', 'cuisine-unknown']);
      fixture.detectChanges();

      const preview = component['previewMeal']()!;
      expect(preview.cuisines.length).toBe(1);
      expect(preview.cuisines[0].id).toBe('cuisine-camerounaise');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Edit mode
  // ═══════════════════════════════════════════════════════════

  describe('edit mode', () => {
    it('loads the meal and patches the form when a route id is present', () => {
      const MEAL = {
        id: 'meal-taro',
        name: 'Taro sauce jaune',
        description: 'Taro frais',
        price: 4500,
        prepTimeMinutes: 120,
        imageUrl: 'https://example.com/taro.jpg',
        imageStorageRef: 'media/taro.jpg',
        cuisines: [{ id: 'cuisine-camerounaise', name: 'Camerounaise' }],
        dishTypes: [{ id: 'dish-main', name: 'Plat de résistance' }],
        ingredients: [],
        distributionLocations: [],
      };
      mealServiceMock.getMealById.and.returnValue(of(MEAL));

      TestBed.overrideProvider(ActivatedRoute, {
        useValue: { snapshot: { paramMap: { get: () => 'meal-taro' } } },
      });

      createComponent();

      expect(component['isEditMode']()).toBeTrue();
      expect(component.form.controls.name.value).toBe('Taro sauce jaune');
      expect(component.form.controls.price.value).toBe(4500);
      expect(component.form.controls.prepTimeMinutes.value).toBe(120);
    });
  });
});
