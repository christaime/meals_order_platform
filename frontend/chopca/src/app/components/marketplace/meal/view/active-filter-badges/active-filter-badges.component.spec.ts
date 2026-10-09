import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActiveFilterBadgesComponent,
  ActiveFilterItem,
} from './active-filter-badges.component';

describe('ActiveFilterBadgesComponent', () => {
  let fixture: ComponentFixture<ActiveFilterBadgesComponent>;
  let component: ActiveFilterBadgesComponent;

  const FILTERS: ActiveFilterItem[] = [
    { key: 'query',    label: 'Recherche: "taro"',  value: 'taro' },
    { key: 'maxPrice', label: 'Max 8000 FCFA',      value: 8000 },
    { key: 'cuisine',  label: 'Camerounaise',       value: 'cui-1' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveFilterBadgesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveFilterBadgesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('activeFilters', FILTERS);
    fixture.detectChanges();
  });

  describe('rendering', () => {
    it('does not render the bar when there are no filters', () => {
      fixture.componentRef.setInput('activeFilters', []);
      fixture.detectChanges();
      expect(query('[data-testid=active-filter-bar]')).toBeFalsy();
    });

    it('renders one badge per active filter', () => {
      for (const f of FILTERS) {
        const el = query(`[data-testid=active-filter-${f.key}]`);
        expect(el).toBeTruthy();
      }
    });

    it('renders the label of each filter', () => {
      const el = query('[data-testid=active-filter-query]');
      expect(el?.textContent).toContain('Recherche: "taro"');
    });

    it('renders the clear-all button', () => {
      expect(query('[data-testid=clear-all-active-filter]')).toBeTruthy();
    });
  });

  describe('removal', () => {
    it('emits removeFilter with the correct item when the × is clicked', () => {
      const spy = jasmine.createSpy('removeFilter');
      component.removeFilter.subscribe(spy);

      click('[data-testid=remove-active-filter-cuisine]');

      expect(spy).toHaveBeenCalledOnceWith(FILTERS[2]);
    });

    it('does not emit clearAll when removing a single filter', () => {
      const spy = jasmine.createSpy('clearAll');
      component.clearAll.subscribe(spy);

      click('[data-testid=remove-active-filter-query]');

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('clear all', () => {
    it('emits clearAll when the button is clicked', () => {
      const spy = jasmine.createSpy('clearAll');
      component.clearAll.subscribe(spy);

      click('[data-testid=clear-all-active-filter]');

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }
  function click(sel: string): void {
    const el = query(sel);
    expect(el).toBeTruthy("Element to click on is unexistent");
    el?.click();
    fixture.detectChanges();
  }
});
