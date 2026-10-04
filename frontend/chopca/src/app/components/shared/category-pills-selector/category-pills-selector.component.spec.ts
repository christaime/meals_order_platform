import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { CategoryPillsSelectorComponent } from './category-pills-selector.component';
import { CATEGORY_SERVICE, CategoryService } from '@app/core/services/marketplace/category.service';
import { DataPage } from '@app/core/models/shared';
import { Category, CategoryType } from '@app/core/models/marketplace';
import { aCategory } from 'src/testing/factories';

@Component({
  standalone: true,
  imports: [CategoryPillsSelectorComponent, ReactiveFormsModule],
  template: `
    <app-category-pills-selector
      [categoryType]="categoryType"
      [control]="control"
      [maxSelection]="3"
      [minSelection]="1" />
  `,
})
class HostComponent {
  readonly categoryType: CategoryType = 'CUISINE';
  readonly control = new FormControl<string[]>([], { nonNullable: true });
}

describe('CategoryPillsSelectorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let categoryService: jasmine.SpyObj<CategoryService>;

  const CATEGORIES: Category[] = [
    aCategory({ id: 'c1', name: 'Cuisine Sawa' }),
    aCategory({ id: 'c2', name: 'Cuisine Bamiléké' }),
    aCategory({ id: 'c3', name: 'Cuisine Beti' }),
    aCategory({ id: 'c4', name: 'Cuisine Douala' }),
  ];

  beforeEach(async () => {
    categoryService = jasmine.createSpyObj<CategoryService>('CategoryService', [
      'searchCategories',
    ]);

    categoryService.searchCategories.and.returnValue(
      of({
        content: CATEGORIES,
        page: 0, size: 100, totalElements: CATEGORIES.length,
        totalPages: 1, first: true, last: true, empty: false,
      } as DataPage<Category>),
    );

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        { provide: CATEGORY_SERVICE, useValue: categoryService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Query the rendered pills. Cast the NodeList to a typed array. */
  function pills(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
  }

  function findPill(name: string): HTMLButtonElement | undefined {
    return pills().find(b => b.textContent?.includes(name) ?? false);
  }

  function isSelected(pill: HTMLButtonElement): boolean {
    return pill.classList.contains('bg-primary-fixed');
  }

  it('fetches categories for the given type on init', () => {
    expect(categoryService.searchCategories).toHaveBeenCalledWith(
      jasmine.objectContaining({ type: 'CUISINE' }),
    );
  });

  it('renders one pill per returned category', () => {
    expect(pills().length).toBe(CATEGORIES.length);
  });

  it('seeds the selection from the FormControl value', () => {
    host.control.setValue(['c2']);
    fixture.detectChanges();

    const pill = findPill('Cuisine Bamiléké');
    expect(pill).toBeDefined();
    expect(isSelected(pill!)).toBe(true);
  });

  it('adds an id to the control when a pill is clicked', () => {
    findPill('Cuisine Sawa')!.click();
    fixture.detectChanges();

    expect(host.control.value).toEqual(['c1']);
  });

  it('removes the id when a selected pill is clicked again', () => {
    host.control.setValue(['c1']);
    fixture.detectChanges();

    findPill('Cuisine Sawa')!.click();
    fixture.detectChanges();

    expect(host.control.value).toEqual([]);
  });

  it('enforces the maxSelection limit', () => {
    host.control.setValue(['c1', 'c2', 'c3']);
    fixture.detectChanges();

    findPill('Cuisine Douala')!.click();
    fixture.detectChanges();

    expect(host.control.value).toEqual(['c1', 'c2', 'c3']);
  });

  describe('reset via programmatic control value', () => {
    it('deselects every pill when the control is set to []', () => {
      host.control.setValue(['c1', 'c2']);
      fixture.detectChanges();

      expect(isSelected(findPill('Cuisine Sawa')!)).toBe(true);
      expect(isSelected(findPill('Cuisine Bamiléké')!)).toBe(true);

      host.control.setValue([]);
      fixture.detectChanges();

      for (const pill of pills()) {
        expect(isSelected(pill)).toBe(false);
      }
    });

    it('deselects when the drawer-style reset writes with emitEvent: true', () => {
      host.control.setValue(['c1', 'c2']);
      fixture.detectChanges();
      expect(isSelected(findPill('Cuisine Sawa')!)).toBe(true);

      host.control.setValue([]);
      fixture.detectChanges();

      expect(isSelected(findPill('Cuisine Sawa')!)).toBe(false);
    });

    it('reacts to a fresh selection set programmatically', () => {
      host.control.setValue(['c1']);
      fixture.detectChanges();

      host.control.setValue(['c3']);
      fixture.detectChanges();

      expect(isSelected(findPill('Cuisine Sawa')!)).toBe(false);
      expect(isSelected(findPill('Cuisine Beti')!)).toBe(true);
    });
  });

  it('emits selectionChange when a pill is toggled', () => {
    const emitted: string[][] = [];
    // Cast on the same line, or wrap the chained expression in parens.
    const pillsComponent =
      fixture.debugElement.children[0].componentInstance as CategoryPillsSelectorComponent;

    pillsComponent.selectionChange.subscribe((v: string[]) => emitted.push(v));

    findPill('Cuisine Sawa')!.click();
    fixture.detectChanges();

    expect(emitted).toEqual([['c1']]);
  });
});
