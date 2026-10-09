import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';

import { CategoryPillsSelectorComponent } from './category-pills-selector.component';
import { CATEGORY_SERVICE } from '@core/services/marketplace/category.service';
import { Category, CategoryType } from '@core/models/marketplace';

describe('CategoryPillsSelectorComponent', () => {
  let fixture: ComponentFixture<CategoryPillsSelectorComponent>;
  let component: CategoryPillsSelectorComponent;
  let control: FormControl<string[]>;
  let categoryServiceMock: jasmine.SpyObj<any>;

  const CATEGORIES: Category[] = [
    { id: 'cat-1', name: 'Camerounaise', iconUrl: 'flag' } as Category,
    { id: 'cat-2', name: 'Africaine',    iconUrl: 'public' } as Category,
    { id: 'cat-3', name: 'Italienne',    iconUrl: 'pizza' } as Category,
  ];

  beforeEach(async () => {
    categoryServiceMock = jasmine.createSpyObj('CategoryService', ['searchCategories']);
    categoryServiceMock.searchCategories.and.returnValue(
      of({ content: CATEGORIES, page: 0, size: 100, totalElements: 3, totalPages: 1 }),
    );

    await TestBed.configureTestingModule({
      imports: [CategoryPillsSelectorComponent, ReactiveFormsModule],
      providers: [
        { provide: CATEGORY_SERVICE, useValue: categoryServiceMock },
      ],
    }).compileComponents();

    control = new FormControl<string[]>([], { nonNullable: true });
    fixture = TestBed.createComponent(CategoryPillsSelectorComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('categoryType', 'CUISINE' as CategoryType);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('maxSelection', 3);
    fixture.componentRef.setInput('minSelection', 0);

    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════
  //  Loading and fetch
  // ═══════════════════════════════════════════════════════════

  describe('fetch', () => {
    it('calls the service with the correct category type', () => {
      expect(categoryServiceMock.searchCategories).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ type: 'CUISINE', moderationStatus: 'APPROVED' }),
      );
    });

    it('renders one pill per category after loading', () => {
      for (const cat of CATEGORIES) {
        const pill = fixture.nativeElement.querySelector(
          `[data-testid=category-pill-CUISINE-${cat.id}]`);
        expect(pill).toBeTruthy();
      }
    });

    it('shows an error when the service fails', () => {
      categoryServiceMock.searchCategories.and.returnValue(
        throwError(() => new Error('boom')),
      );

      // Recreate the component to trigger a new fetch with the failing mock.
      fixture = TestBed.createComponent(CategoryPillsSelectorComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('categoryType', 'CUISINE' as CategoryType);
      fixture.componentRef.setInput('control', new FormControl<string[]>([], { nonNullable: true }));
      fixture.detectChanges();

      // The component renders the error through <app-form-error>. Check
      // that the fetch failed and the error was recorded.
      expect(component['fetchError']()).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Toggle
  // ═══════════════════════════════════════════════════════════

  describe('toggle', () => {
    it('selects a pill on click', () => {
      clickPill('cat-1');
      expect(control.value).toEqual(['cat-1']);
    });

    it('deselects a pill when clicked twice', () => {
      clickPill('cat-1');
      clickPill('cat-1');
      expect(control.value).toEqual([]);
    });

    it('updates the counter', () => {
      clickPill('cat-1');
      clickPill('cat-2');
      const counter = fixture.nativeElement.querySelector(
        '[data-testid=category-pills-counter-CUISINE]');
      expect(counter?.textContent).toContain('2');
    });

    it('emits selectionChange on each toggle', () => {
      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);

      clickPill('cat-1');
      expect(spy).toHaveBeenCalledOnceWith(['cat-1']);
    });

    it('emits categoriesSelected with the full Category objects', () => {
      const spy = jasmine.createSpy('categoriesSelected');
      component.categoriesSelected.subscribe(spy);

      clickPill('cat-1');
      expect(spy.calls.mostRecent().args[0]).toEqual([CATEGORIES[0]]);
    });

    it('respects maxSelection', () => {
      fixture.componentRef.setInput('maxSelection', 2);
      fixture.detectChanges();

      clickPill('cat-1');
      clickPill('cat-2');
      clickPill('cat-3');   // should be blocked

      expect(control.value).toEqual(['cat-1', 'cat-2']);
    });

    it('replaces the selection in single-select mode', () => {
      fixture.componentRef.setInput('maxSelection', 1);
      fixture.detectChanges();

      clickPill('cat-1');
      clickPill('cat-2');
      expect(control.value).toEqual(['cat-2']);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  External control sync
  // ═══════════════════════════════════════════════════════════

  describe('control sync', () => {
    it('reflects external control changes in the selected state', () => {
      control.setValue(['cat-2']);
      fixture.detectChanges();

      const pill = fixture.nativeElement.querySelector(
        '[data-testid=category-pill-CUISINE-cat-2]');
      expect(pill.getAttribute('aria-pressed')).toBe('true');
    });

    it('marks external selections in the counter', () => {
      control.setValue(['cat-1', 'cat-3']);
      fixture.detectChanges();

      const counter = fixture.nativeElement.querySelector(
        '[data-testid=category-pills-counter-CUISINE]');
      expect(counter?.textContent).toContain('2');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function clickPill(id: string): void {
    const pill = fixture.nativeElement.querySelector(
      `[data-testid=category-pill-CUISINE-${id}]`);
    pill.click();
    fixture.detectChanges();
  }
});
