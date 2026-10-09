import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubCategoryFilterChipsComponent, SubCategoryChip } from './sub-category-filter-chips.component';

describe('SubCategoryFilterChipsComponent', () => {
  let fixture: ComponentFixture<SubCategoryFilterChipsComponent>;
  let component: SubCategoryFilterChipsComponent;

  const CHIPS: SubCategoryChip[] = [
    { id: 'all',    name: 'Tous les types',        kind: 'ALL' },
    { id: 'cat-1',  name: 'Camerounaise',          kind: 'CUISINE',   count: 12 },
    { id: 'dish-1', name: 'Plats de résistance',   kind: 'DISH_TYPE', count: 8 },
    { id: 'express', name: 'Prépa ≤ 30 min',       kind: 'SHORTCUT',  count: 5 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubCategoryFilterChipsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SubCategoryFilterChipsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('subCategories', CHIPS);
    fixture.detectChanges();
  });

  describe('rendering', () => {
    it('renders one button per chip', () => {
      for (const chip of CHIPS) {
        const el = query(`[data-testid=subcategory-chip-${chip.kind}-${chip.id}]`);
        expect(el).toBeTruthy();
      }
    });

    it('renders the count badge when present', () => {
      const badge = query('[data-testid=subcategory-chip-CUISINE-cat-1-count]');
      expect(badge?.textContent?.trim()).toBe('12');
    });

    it('does not render a count badge when the count is undefined', () => {
      const badge = query('[data-testid=subcategory-chip-ALL-all-count]');
      expect(badge).toBeFalsy();
    });
  });

  describe('selection', () => {
    it('selects a chip on click', () => {
      clickChip('CUISINE', 'cat-1');
      expect(component.selectedSubCategoryIds()).toEqual(['cat-1']);
    });

    it('deselects a chip on second click', () => {
      clickChip('CUISINE', 'cat-1');
      clickChip('CUISINE', 'cat-1');
      expect(component.selectedSubCategoryIds()).toEqual([]);
    });

    it('emits subCategoryChange with the selected chips', () => {
      const spy = jasmine.createSpy('subCategoryChange');
      component.subCategoryChange.subscribe(spy);

      clickChip('CUISINE', 'cat-1');
      expect(spy.calls.mostRecent().args[0]).toEqual([CHIPS[1]]);

      clickChip('DISH_TYPE', 'dish-1');
      expect(spy.calls.mostRecent().args[0]).toEqual([CHIPS[1], CHIPS[2]]);
    });

    it('clears everything when ALL is clicked', () => {
      clickChip('CUISINE', 'cat-1');
      clickChip('DISH_TYPE', 'dish-1');
      clickChip('ALL', 'all');
      expect(component.selectedSubCategoryIds()).toEqual([]);
    });

    it('marks selected chips with aria-pressed', () => {
      clickChip('CUISINE', 'cat-1');
      const el = query('[data-testid=subcategory-chip-CUISINE-cat-1]');
      expect(el?.getAttribute('aria-pressed')).toBe('true');
    });

    it('marks unselected chips with aria-pressed=false', () => {
      const el = query('[data-testid=subcategory-chip-CUISINE-cat-1]');
      expect(el?.getAttribute('aria-pressed')).toBe('false');
    });

    it('treats the ALL chip as selected when nothing is selected', () => {
      const el = query('[data-testid=subcategory-chip-ALL-all]');
      expect(el?.getAttribute('aria-pressed')).toBe('true');
    });
  });

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function clickChip(kind: string, id: string): void {
    const el = query(`[data-testid=subcategory-chip-${kind}-${id}]`);
    el?.click();
    fixture.detectChanges();
  }
});
