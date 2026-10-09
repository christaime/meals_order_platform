import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SortDropdownComponent, SortOption } from './sort-dropdown.component';

describe('SortDropdownComponent', () => {
  let fixture: ComponentFixture<SortDropdownComponent>;
  let component: SortDropdownComponent;

  const OPTIONS: SortOption[] = [
    { id: 'name',       label: 'Noms alphabetiquement', icon: 'sort_by_alpha' },
    { id: 'price-asc',  label: 'Prix croissant',                 icon: 'arrow_upward' },
    { id: 'price-desc', label: 'Prix décroissant',               icon: 'arrow_downward' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SortDropdownComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SortDropdownComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('shows the first option label in the trigger by default', () => {
      const label = fixture.nativeElement.querySelector('[data-testid=sort-dropdown-label]');
      expect(label?.textContent?.trim()).toBe('Noms alphabetiquement');
    });

    it('does not render the menu until the trigger is clicked', () => {
      const menu = fixture.nativeElement.querySelector('[data-testid=sort-dropdown-menu]');
      expect(menu).toBeFalsy();
    });

    it('renders one option per SortOption when open', () => {
      openMenu();
      for (const option of OPTIONS) {
        const el = fixture.nativeElement.querySelector(
          `[data-testid=sort-dropdown-option-${option.id}]`);
        expect(el).toBeTruthy();
        expect(el.textContent).toContain(option.label);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Open / close behavior
  // ═══════════════════════════════════════════════════════════

  describe('open/close', () => {
    it('opens the menu on trigger click', () => {
      openMenu();
      expect(fixture.nativeElement.querySelector('[data-testid=sort-dropdown-menu]')).toBeTruthy();
    });

    it('closes the menu when an option is selected', () => {
      openMenu();
      clickOption('name');
      expect(fixture.nativeElement.querySelector('[data-testid=sort-dropdown-menu]')).toBeFalsy();
    });

    it('toggles closed when the trigger is clicked twice', () => {
      const trigger = fixture.nativeElement.querySelector('[data-testid=sort-dropdown-trigger]');
      trigger.click();
      fixture.detectChanges();
      trigger.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid=sort-dropdown-menu]')).toBeFalsy();
    });

    it('closes the menu when clicking outside the component', () => {
      openMenu();
      // Dispatch a click on document.body, which is outside the component.
      const outsideClick = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(outsideClick, 'target', { value: document.body });
      document.dispatchEvent(outsideClick);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid=sort-dropdown-menu]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Selection behavior
  // ═══════════════════════════════════════════════════════════

  describe('selection', () => {
    it('updates selectedSortId when an option is clicked', () => {
      openMenu();
      clickOption('price-asc');
      expect(component.selectedSortId()).toBe('price-asc');
    });

    it('updates the trigger label after selection', () => {
      openMenu();
      clickOption('price-asc');
      const label = fixture.nativeElement.querySelector('[data-testid=sort-dropdown-label]');
      expect(label?.textContent?.trim()).toBe('Prix croissant');
    });

    it('emits sortChange with the selected option', () => {
      const spy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(spy);

      openMenu();
      clickOption('price-desc');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.calls.mostRecent().args[0]).toEqual(OPTIONS[2]);
    });

    it('does not emit sortChange when the menu is only opened', () => {
      const spy = jasmine.createSpy('sortChange');
      component.sortChange.subscribe(spy);
      openMenu();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function openMenu(): void {
    const trigger = fixture.nativeElement.querySelector('[data-testid=sort-dropdown-trigger]');
    trigger.click();
    fixture.detectChanges();
  }

  function clickOption(id: string): void {
    const el = fixture.nativeElement.querySelector(`[data-testid=sort-dropdown-option-${id}]`);
    el.click();
    fixture.detectChanges();
  }
});
