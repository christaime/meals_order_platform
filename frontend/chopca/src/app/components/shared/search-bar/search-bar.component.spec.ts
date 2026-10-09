import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchBarComponent } from './search-bar.component';

describe('SearchBarComponent', () => {
  let fixture: ComponentFixture<SearchBarComponent>;
  let component: SearchBarComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════
  //  Rendering
  // ═══════════════════════════════════════════════════════════

  describe('rendering', () => {
    it('renders the input with the default placeholder', () => {
      const input = getInput();
      expect(input).toBeTruthy();
      expect(input.placeholder).toContain('Rechercher');
    });

    it('uses a custom placeholder when provided', () => {
      fixture.componentRef.setInput('placeholder', 'Trouver un plat');
      fixture.detectChanges();
      expect(getInput().placeholder).toBe('Trouver un plat');
    });

    it('does not render the clear button when the query is empty', () => {
      expect(query('[data-testid=search-bar-clear]')).toBeFalsy();
    });

    it('renders the clear button when the query is non-empty', () => {
      component.query.set('taro');
      fixture.detectChanges();
      expect(query('[data-testid=search-bar-clear]')).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Typing
  // ═══════════════════════════════════════════════════════════

  describe('typing', () => {
    it('updates the query model when the user types', () => {
      const input = getInput();
      input.value = 'salade';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(component.query()).toBe('salade');
    });

    it('reflects the query value in the input element', () => {
      component.query.set('poulet');
      fixture.detectChanges();
      expect(getInput().value).toBe('poulet');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Submit
  // ═══════════════════════════════════════════════════════════

  describe('submit', () => {
    it('emits search with the current query on button click', () => {
      const spy = jasmine.createSpy('search');
      component.search.subscribe(spy);

      component.query.set('taro');
      fixture.detectChanges();

      click('[data-testid=search-bar-submit]');
      expect(spy).toHaveBeenCalledOnceWith('taro');
    });

    it('emits search when Enter is pressed in the input', () => {
      const spy = jasmine.createSpy('search');
      component.search.subscribe(spy);

      component.query.set('taro');
      fixture.detectChanges();

      const input = getInput();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledOnceWith('taro');
    });

    it('does not emit on other keys', () => {
      const spy = jasmine.createSpy('search');
      component.search.subscribe(spy);

      const input = getInput();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Clear
  // ═══════════════════════════════════════════════════════════

  describe('clear', () => {
    it('empties the query when the clear button is clicked', () => {
      component.query.set('taro');
      fixture.detectChanges();

      click('[data-testid=search-bar-clear]');
      expect(component.query()).toBe('');
    });

    it('emits an empty search when clearing', () => {
      const spy = jasmine.createSpy('search');
      component.search.subscribe(spy);

      component.query.set('taro');
      fixture.detectChanges();

      click('[data-testid=search-bar-clear]');
      expect(spy).toHaveBeenCalledOnceWith('');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function getInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid=search-bar-input]');
  }

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function click(selector: string): void {
    const el = fixture.nativeElement.querySelector(selector);
    el.click();
    fixture.detectChanges();
  }
});
