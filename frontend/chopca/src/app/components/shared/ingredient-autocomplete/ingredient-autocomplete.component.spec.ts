import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { IngredientAutocompleteComponent } from './ingredient-autocomplete.component';
import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import { IngredientSummary } from '@app/core/models/marketplace';

const ALL_INGREDIENTS: IngredientSummary[] = [
  { id: 'ing-taro',       name: 'Taro',       isAllergen: false, moderationStatus: 'APPROVED' },
  { id: 'ing-arachide',   name: 'Arachide',   isAllergen: true,  moderationStatus: 'APPROVED' },
  { id: 'ing-tomate',     name: 'Tomate',     isAllergen: false, moderationStatus: 'APPROVED' },
  { id: 'ing-mozzarella', name: 'Mozzarella', isAllergen: true,  moderationStatus: 'APPROVED' },
];

describe('IngredientAutocompleteComponent', () => {
  let fixture: ComponentFixture<IngredientAutocompleteComponent>;
  let component: IngredientAutocompleteComponent;
  let ingredientServiceMock: jasmine.SpyObj<any>;

  beforeEach(async () => {
    ingredientServiceMock = jasmine.createSpyObj('IngredientService', ['searchIngredientsFlat']);
    ingredientServiceMock.searchIngredientsFlat.and.returnValue(of(ALL_INGREDIENTS));

    await TestBed.configureTestingModule({
      imports: [IngredientAutocompleteComponent, ReactiveFormsModule],
      providers: [
        { provide: INGREDIENT_SERVICE, useValue: ingredientServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IngredientAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ═══════════════════════════════════════════════════════════
  //  Initial selection
  // ═══════════════════════════════════════════════════════════

  describe('initial selection', () => {
    it('renders the initial selection as chips', () => {
      fixture.componentRef.setInput('initialSelection', [ALL_INGREDIENTS[0]]);
      fixture.detectChanges();

      const chip = query(`[data-testid=ingredient-chip-${ALL_INGREDIENTS[0].id}]`);
      expect(chip).toBeTruthy();
      expect(chip?.textContent).toContain('Taro');
    });

    it('shows no chips when the initial selection is empty', () => {
      expect(query('[data-testid=ingredient-autocomplete-selection]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Search
  // ═══════════════════════════════════════════════════════════

  describe('search', () => {
    it('calls the service with the trimmed keyword after debounce', fakeAsync(() => {
      const input = getInput();
      input.value = '  taro  ';
      input.dispatchEvent(new Event('input'));
      tick(300);

      expect(ingredientServiceMock.searchIngredientsFlat).toHaveBeenCalledTimes(1);
      const call = ingredientServiceMock.searchIngredientsFlat.calls.mostRecent().args[0];
      expect(call.keyword).toBe('taro');
      expect(call.moderationStatus).toBe('APPROVED');
    }));

    it('does not call the service when the input is empty', fakeAsync(() => {
      const input = getInput();
      input.value = '';
      input.dispatchEvent(new Event('input'));
      tick(300);

      expect(ingredientServiceMock.searchIngredientsFlat).not.toHaveBeenCalled();
    }));

    it('renders the results in the dropdown', fakeAsync(() => {
      const input = getInput();
      input.value = 'to';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      expect(ingredientServiceMock.searchIngredientsFlat).toHaveBeenCalled();
      const options = fixture.nativeElement.querySelectorAll(
        '[data-testid^=ingredient-option-]',
      );
      expect(options.length).toBe(ALL_INGREDIENTS.length);

      for (const ing of ALL_INGREDIENTS) {
        expect(query(`[data-testid=ingredient-option-${ing.id}]`)).toBeTruthy();
      }
    }));

    it('shows an empty-state hint when no results match', fakeAsync(() => {
      ingredientServiceMock.searchIngredientsFlat.and.returnValue(of([]));

      const input = getInput();
      input.value = 'zzzzz';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-autocomplete-empty]')).toBeTruthy();
    }));

    it('shows an empty dropdown when the service errors', fakeAsync(() => {
      ingredientServiceMock.searchIngredientsFlat.and.returnValue(
        throwError(() => new Error('boom')),
      );

      const input = getInput();
      input.value = 'to';
      input.dispatchEvent(new Event('input'));
      tick(300);

      expect(query('[data-testid=ingredient-autocomplete-dropdown]')).toBeFalsy();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Selection
  // ═══════════════════════════════════════════════════════════

  describe('selection', () => {
    it('emits selectionChange with the selected ingredient', () => {
      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);

      component['add'](ALL_INGREDIENTS[0]);

      expect(spy).toHaveBeenCalledOnceWith([ALL_INGREDIENTS[0]]);
    });

    it('renders a chip after adding', () => {
      component['add'](ALL_INGREDIENTS[0]);
      fixture.detectChanges();

      expect(query(`[data-testid=ingredient-chip-${ALL_INGREDIENTS[0].id}]`)).toBeTruthy();
    });

    it('does not add the same ingredient twice', () => {
      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);

      component['add'](ALL_INGREDIENTS[0]);
      component['add'](ALL_INGREDIENTS[0]);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('removes an ingredient when the chip × is clicked', () => {
      fixture.componentRef.setInput('initialSelection', [ALL_INGREDIENTS[0]]);
      fixture.detectChanges();

      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);

      click(`[data-testid=ingredient-chip-remove-${ALL_INGREDIENTS[0].id}]`);

      expect(spy).toHaveBeenCalledOnceWith([]);
    });

    it('hides an already-selected ingredient from the dropdown', fakeAsync(() => {
      fixture.componentRef.setInput('initialSelection', [ALL_INGREDIENTS[0]]);
      fixture.detectChanges();

      const input = getInput();
      input.value = 'to';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      // Taro is already selected, so it must not appear as an option.
      expect(query(`[data-testid=ingredient-option-${ALL_INGREDIENTS[0].id}]`)).toBeFalsy();
      expect(query(`[data-testid=ingredient-option-${ALL_INGREDIENTS[1].id}]`)).toBeTruthy();
    }));

    it('clears the search input after selecting', () => {
      const input = getInput();
      input.value = 'taro';
      input.dispatchEvent(new Event('input'));

      component['add'](ALL_INGREDIENTS[0]);
      fixture.detectChanges();

      expect(getInput().value).toBe('');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Keyboard
  // ═══════════════════════════════════════════════════════════

  describe('keyboard', () => {
    it('adds the first available result on Enter', fakeAsync(() => {
      const input = getInput();
      input.value = 'to';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
    }));

    it('closes the dropdown on Escape', fakeAsync(() => {
      const input = getInput();
      input.value = 'to';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();
      expect(query('[data-testid=ingredient-autocomplete-dropdown]')).toBeTruthy();

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(query('[data-testid=ingredient-autocomplete-dropdown]')).toBeFalsy();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Max selection
  // ═══════════════════════════════════════════════════════════

  describe('max selection', () => {
    it('does not add an ingredient past the limit', () => {
      fixture.componentRef.setInput('maxSelection', 2);
      fixture.detectChanges();

      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);

      component['add'](ALL_INGREDIENTS[0]);
      component['add'](ALL_INGREDIENTS[1]);
      component['add'](ALL_INGREDIENTS[2]);

      expect(spy).toHaveBeenCalledTimes(2);
      expect(component['selected']().length).toBe(2);
    });

    it('removing a chip frees a slot for a new ingredient', () => {
      fixture.componentRef.setInput('maxSelection', 2);
      fixture.detectChanges();

      component['add'](ALL_INGREDIENTS[0]);
      component['add'](ALL_INGREDIENTS[1]);
      expect(component['selected']().length).toBe(2);

      component['remove'](ALL_INGREDIENTS[0]);
      component['add'](ALL_INGREDIENTS[2]);

      expect(component['selected']().length).toBe(2);
      expect(component['selected']().map((i) => i.id)).toContain(ALL_INGREDIENTS[2].id);
    });

    it('shows the limit hint when at capacity', () => {
      fixture.componentRef.setInput('maxSelection', 1);
      fixture.detectChanges();

      component['add'](ALL_INGREDIENTS[0]);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-autocomplete-limit-hint]')).toBeTruthy();
    });

    it('does not show the limit hint below capacity', () => {
      fixture.componentRef.setInput('maxSelection', 3);
      fixture.detectChanges();

      component['add'](ALL_INGREDIENTS[0]);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-autocomplete-limit-hint]')).toBeFalsy();
    });

    it('disables the options when at capacity', fakeAsync(() => {
      fixture.componentRef.setInput('maxSelection', 1);
      fixture.detectChanges();
      component['add'](ALL_INGREDIENTS[0]);
      fixture.detectChanges();

      const input = getInput();
      input.value = 'to';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const options = fixture.nativeElement.querySelectorAll(
        '[data-testid^=ingredient-option-]',
      ) as NodeListOf<HTMLButtonElement>;

      expect(options.length).toBeGreaterThan(0);
      options.forEach((opt) => expect(opt.disabled).toBeTrue());
    }));

    it('does not add via Enter when at capacity', fakeAsync(() => {
      fixture.componentRef.setInput('maxSelection', 1);
      fixture.detectChanges();
      component['add'](ALL_INGREDIENTS[0]);

      const input = getInput();
      input.value = 'tomate';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      const spy = jasmine.createSpy('selectionChange');
      component.selectionChange.subscribe(spy);

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      fixture.detectChanges();

      expect(spy).not.toHaveBeenCalled();
    }));

    it('does not truncate an initialSelection longer than the limit', () => {
      fixture.componentRef.setInput('maxSelection', 2);
      fixture.componentRef.setInput('initialSelection', [...ALL_INGREDIENTS]);
      fixture.detectChanges();

      // The parent's committed state wins — no silent data loss.
      expect(component['selected']().length).toBe(ALL_INGREDIENTS.length);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(selector: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(selector);
  }

  function getInput(): HTMLInputElement {
    return query('[data-testid=ingredient-autocomplete-input]') as HTMLInputElement;
  }

  function click(selector: string): void {
    const el = query(selector);
    el?.click();
    fixture.detectChanges();
  }
});
