import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { StepCompositionComponent } from './step-composition.component';
import { INGREDIENT_SERVICE } from '@app/core/services/marketplace/ingredient.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IngredientSummary } from '@app/core/models/marketplace';

const ARACHIDE: IngredientSummary = {
  id: 'ing-arachide',
  name: 'Arachide',
  isAllergen: true,
  moderationStatus: 'APPROVED',
};

const TARO_PENDING: IngredientSummary = {
  id: 'ing-taro',
  name: 'Taro',
  isAllergen: false,
  moderationStatus: 'PENDING',
};

const SEL_DISABLED: IngredientSummary = {
  id: 'ing-sel',
  name: 'Sel',
  isAllergen: false,
  moderationStatus: 'DISABLED',
};

describe('StepCompositionComponent', () => {
  let fixture: ComponentFixture<StepCompositionComponent>;
  let component: StepCompositionComponent;
  let ingredientServiceMock: jasmine.SpyObj<any>;
  let dialogMock: jasmine.SpyObj<any>;
  let snackBarMock: jasmine.SpyObj<any>;
  let form: any;

  beforeEach(async () => {
    ingredientServiceMock = jasmine.createSpyObj('IngredientService', [
      'searchIngredients',
    ]);
    ingredientServiceMock.searchIngredients.and.returnValue(
      of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
    );

    dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    dialogMock.open.and.returnValue({ afterClosed: () => of(undefined) });

    snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [StepCompositionComponent, ReactiveFormsModule],
      providers: [
        { provide: INGREDIENT_SERVICE, useValue: ingredientServiceMock },
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();
  });

  function setup(initialIngredients: IngredientSummary[] | null = null): void {
    const fb = new FormBuilder();
    form = fb.nonNullable.group({
      prepTimeMinutes: [30 as number | null],
      ingredientIds: [[] as string[]],
    });

    fixture = TestBed.createComponent(StepCompositionComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('initialIngredients', initialIngredients);
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Prep time
  // ═══════════════════════════════════════════════════════════

  describe('prep time', () => {
    it('formats 30 minutes', () => {
      setup();
      expect(component['formatPrepTime'](30)).toBe('30 min');
    });

    it('formats 90 minutes as 1h 30min', () => {
      setup();
      expect(component['formatPrepTime'](90)).toBe('1h 30min');
    });

    it('formats null as "Non défini"', () => {
      setup();
      expect(component['formatPrepTime'](null)).toBe('Non défini');
    });

    it('renders the prep-time hint', () => {
      setup();
      const hint = fixture.nativeElement.textContent;
      expect(hint).toContain('après réception de la commande');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Chips — rendering
  // ═══════════════════════════════════════════════════════════

  describe('chips', () => {
    it('renders a chip per selected ingredient', () => {
      setup([ARACHIDE, TARO_PENDING]);
      form.controls.ingredientIds.setValue(['ing-arachide', 'ing-taro']);
      fixture.detectChanges();
      expect(query('[data-testid=ingredient-chip-ing-arachide]')).toBeTruthy();
      expect(query('[data-testid=ingredient-chip-ing-taro]')).toBeTruthy();
    });

    it('appends "(allergène)" to the name when isAllergen', () => {
      setup([ARACHIDE]);
      form.controls.ingredientIds.setValue(['ing-arachide']);
      fixture.detectChanges();
      expect(query('[data-testid=ingredient-chip-ing-arachide]')!.textContent)
        .toContain('(allergène)');
    });

    it('does not append "(allergène)" for non-allergens', () => {
      setup([TARO_PENDING]);
      form.controls.ingredientIds.setValue(['ing-taro']);
      fixture.detectChanges();
      expect(query('[data-testid=ingredient-chip-ing-taro]')!.textContent)
        .not.toContain('(allergène)');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Chips — edit affordance
  // ═══════════════════════════════════════════════════════════

  describe('edit affordance', () => {
    it('shows the edit button when moderationStatus is PENDING', () => {
      setup([TARO_PENDING]);
      form.controls.ingredientIds.setValue(['ing-taro']);
      fixture.detectChanges();
      expect(query('[data-testid=edit-ingredient-chip-ing-taro]')).toBeTruthy();
    });

    it('hides the edit button when moderationStatus is APPROVED', () => {
      setup([ARACHIDE]);
      form.controls.ingredientIds.setValue(['ing-arachide']);
      fixture.detectChanges();
      expect(query('[data-testid=edit-ingredient-chip-ing-arachide]')).toBeFalsy();
    });

    it('hides the edit button when moderationStatus is DISABLED', () => {
      setup([SEL_DISABLED]);
      form.controls.ingredientIds.setValue(['ing-sel']);
      fixture.detectChanges();
      expect(query('[data-testid=edit-ingredient-chip-ing-sel]')).toBeFalsy();
    });

    it('opens the dialog on edit click', () => {
      setup([TARO_PENDING]);
      form.controls.ingredientIds.setValue(['ing-taro']);
      fixture.detectChanges();

      click('[data-testid=edit-ingredient-chip-ing-taro]');

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Chips — remove
  // ═══════════════════════════════════════════════════════════

  describe('remove', () => {
    it('removes the id from the form on click', () => {
      setup([ARACHIDE]);
      form.controls.ingredientIds.setValue(['ing-arachide']);
      fixture.detectChanges();

      click('[data-testid=remove-ingredient-chip-ing-arachide]');

      expect(form.controls.ingredientIds.value).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Create button — appears only when search returns nothing
  // ═══════════════════════════════════════════════════════════

  describe('create button', () => {
    it('is hidden for a term shorter than 2 characters', () => {
      setup();
      typeInput('a');
      expect(query('[data-testid=ingredient-create]')).toBeFalsy();
    });

    it('appears when the search returns no result', fakeAsync(() => {
      setup();
      ingredientServiceMock.searchIngredients.and.returnValue(
        of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
      );

      typeInput('zzzzz');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-create]')).toBeTruthy();
    }));

    it('does not appear when the search returns results', fakeAsync(() => {
      setup();
      ingredientServiceMock.searchIngredients.and.returnValue(
        of({ content: [ARACHIDE], page: 0, size: 10, totalElements: 1, totalPages: 1 }),
      );

      typeInput('arachide');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-create]')).toBeFalsy();
    }));

    it('opens the create dialog on click', fakeAsync(() => {
      setup();
      ingredientServiceMock.searchIngredients.and.returnValue(
        of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
      );

      typeInput('zzzzz');
      tick(300);
      fixture.detectChanges();

      click('[data-testid=ingredient-create]');

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
      const [, config] = dialogMock.open.calls.mostRecent().args;
      expect((config as any).data.name).toBe('zzzzz');
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Enter key — form submit blocked
  // ═══════════════════════════════════════════════════════════

  describe('Enter key', () => {
    it('does not submit the parent form', fakeAsync(() => {
      setup();
      const submitSpy = jasmine.createSpy('submit');
      const input = query('[data-testid=ingredient-input]') as HTMLInputElement;
      input.closest('form')?.addEventListener('submit', submitSpy);

      input.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', bubbles: true, cancelable: true,
      }));
      tick();
      fixture.detectChanges();

      expect(submitSpy).not.toHaveBeenCalled();
    }));
  });

  // ═══════════════════════════════════════════════════════════
  //  Chip edit affordance
  // ═══════════════════════════════════════════════════════════

  describe('chip edit affordance', () => {
    it('shows the edit button when the ingredient status is PENDING', () => {
      const PENDING: IngredientSummary = {
        id: 'ing-piment',
        name: 'Piment',
        isAllergen: false,
        moderationStatus: 'PENDING',
      };

      setup([PENDING]);
      form.controls.ingredientIds.setValue(['ing-piment']);
      fixture.detectChanges();

      expect(query('[data-testid=edit-ingredient-chip-ing-piment]')).toBeTruthy();
    });

    it('hides the edit button when the ingredient status is APPROVED', () => {
      const APPROVED: IngredientSummary = {
        id: 'ing-gingembre',
        name: 'Gingembre',
        isAllergen: false,
        moderationStatus: 'APPROVED',
      };

      setup([APPROVED]);
      form.controls.ingredientIds.setValue(['ing-gingembre']);
      fixture.detectChanges();

      expect(query('[data-testid=edit-ingredient-chip-ing-gingembre]')).toBeFalsy();
    });

    it('opens the dialog pre-filled with the ingredient name', () => {
      const PENDING: IngredientSummary = {
        id: 'ing-piment',
        name: 'Piment',
        isAllergen: false,
        moderationStatus: 'PENDING',
      };

      setup([PENDING]);
      form.controls.ingredientIds.setValue(['ing-piment']);
      fixture.detectChanges();

      component['editIngredient'](PENDING);

      expect(dialogMock.open).toHaveBeenCalledTimes(1);
      const [, config] = dialogMock.open.calls.mostRecent().args;
      expect((config as any).data.name).toBe('Piment');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Allergen suffix
  // ═══════════════════════════════════════════════════════════

  describe('allergen chip', () => {
    it('appends "(allergène)" to the name when isAllergen', () => {
      const ARACHIDE: IngredientSummary = {
        id: 'ing-arachide',
        name: 'Arachide',
        isAllergen: true,
        moderationStatus: 'APPROVED',
      };

      setup([ARACHIDE]);
      form.controls.ingredientIds.setValue(['ing-arachide']);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-chip-ing-arachide]')!.textContent)
        .toContain('(allergène)');
    });

    it('does not render a warning icon on the chip', () => {
      const ARACHIDE: IngredientSummary = {
        id: 'ing-arachide',
        name: 'Arachide',
        isAllergen: true,
        moderationStatus: 'APPROVED',
      };

      setup([ARACHIDE]);
      form.controls.ingredientIds.setValue(['ing-arachide']);
      fixture.detectChanges();

      const chip = query('[data-testid=ingredient-chip-ing-arachide]')!;
      expect(chip.querySelector('app-icon[name=warning]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Create button visibility
  // ═══════════════════════════════════════════════════════════

  describe('create button visibility', () => {
    it('is hidden when the search returns results', fakeAsync(() => {
      setup();
      ingredientServiceMock.searchIngredients.and.returnValue(
        of({ content: [ARACHIDE], page: 0, size: 10, totalElements: 1, totalPages: 1 }),
      );

      typeInput('arachide');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-create]')).toBeFalsy();
    }));

    it('is shown when the search returns nothing', fakeAsync(() => {
      setup();
      ingredientServiceMock.searchIngredients.and.returnValue(
        of({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 }),
      );

      typeInput('zzzzz');
      tick(300);
      fixture.detectChanges();

      expect(query('[data-testid=ingredient-create]')).toBeTruthy();
    }));
  });
  // ═══════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }

  function click(sel: string): void {
    const el = query(sel);
    expect(el).withContext('not found: ' + sel).toBeTruthy();
    el!.click();
    fixture.detectChanges();
  }

  function typeInput(value: string): void {
    const input = query('[data-testid=ingredient-input]') as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }
});
