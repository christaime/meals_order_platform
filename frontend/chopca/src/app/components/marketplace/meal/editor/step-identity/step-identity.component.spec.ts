import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { MEDIA_SERVICE } from '@app/core/services/marketplace/media.service';
import { StepIdentityComponent } from './step-identity.component';
import { CATEGORY_SERVICE } from '@app/core/services/marketplace/category.service';
import { Category } from '@app/core/models/marketplace';

const CUISINES: Category[] = [
  { id: 'cuisine-camerounaise', name: 'Camerounaise' } as Category,
  { id: 'cuisine-libanaise',    name: 'Libanaise' }    as Category,
];

const DISH_TYPES: Category[] = [
  { id: 'dish-main', name: 'Plat de résistance' } as Category,
];

describe('StepIdentityComponent', () => {
  let fixture: ComponentFixture<StepIdentityComponent>;
  let component: StepIdentityComponent;
  let categoryServiceMock: jasmine.SpyObj<any>;
  let mediaServiceMock: jasmine.SpyObj<any>;
  let form: any;


  beforeEach(async () => {
    categoryServiceMock = jasmine.createSpyObj('CategoryService', ['searchCategories']);
    categoryServiceMock.searchCategories.and.callFake((req: any) => {
      return of({
        content: req.type === 'CUISINE' ? CUISINES : DISH_TYPES,
        page: 0, size: 100, totalElements: 0, totalPages: 0,
      });
    });
    mediaServiceMock = jasmine.createSpyObj('MediaService', ['upload']);
    mediaServiceMock.upload.and.returnValue(of({ id: 'media-1', url: 'https://example.com/x.jpg', storageRef: 'media/x.jpg' }));

    await TestBed.configureTestingModule({
      imports: [StepIdentityComponent, ReactiveFormsModule],
      providers: [
        { provide: CATEGORY_SERVICE, useValue: categoryServiceMock },
        { provide: MEDIA_SERVICE, useValue: mediaServiceMock },
      ],
    }).compileComponents();
  });

  /**
   * Creates the component and, optionally, seeds the form before the
   * first change-detection pass.
   *
   * Pass `initial` to pre-fill any subset of the form controls. The
   * values are applied before `detectChanges()`, so `ngOnInit` sees the
   * seeded form and the initial render reflects the values.
   */
  function setup(initial: {
    name?: string;
    description?: string;
    cuisineIds?: string[];
    dishTypeIds?: string[];
  } = {}): void {
    const fb = new FormBuilder();
    form = fb.nonNullable.group({
      name: [initial.name ?? '', []],
      description: [initial.description ?? '', []],
      cuisineIds: [initial.cuisineIds ?? ([] as string[]), []],
      dishTypeIds: [initial.dishTypeIds ?? ([] as string[]), []],
    });

    fixture = TestBed.createComponent(StepIdentityComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders the name input', () => {
      setup();
      expect(query('[data-testid=step-identity-name]')).toBeTruthy();
    });

    it('renders the description textarea', () => {
      setup();
      expect(query('[data-testid=step-identity-description]')).toBeTruthy();
    });

    it('renders the image uploader', () => {
      setup();
      expect(query('app-image-uploader')).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Name validation
  // ═══════════════════════════════════════════════════════════

  describe('name validation', () => {
    it('shows no error when untouched', () => {
      setup();
      expect(component['nameError']()).toBeNull();
    });

    it('shows a required error when touched and empty', () => {
      setup();
      form.controls.name.setValidators([(c: any) => c.value ? null : { required: true }]);
      form.controls.name.updateValueAndValidity();
      form.controls.name.markAsTouched();
      expect(component['nameError']()).toBe('Le nom est requis');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Description length
  // ═══════════════════════════════════════════════════════════

  describe('description length', () => {
    it('reports the current length', () => {
      setup();
      form.controls.description.setValue('Bonjour');
      expect(component['descriptionLength']()).toBe(7);
    });

    it('reflects the length as the user types', () => {
      setup();
      const textarea = query('[data-testid=step-identity-description]') as HTMLTextAreaElement;
      textarea.value = 'Taro frais';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component['descriptionLength']()).toBe(10);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }
});
