import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import localeFrExtra from '@angular/common/locales/extra/fr';

import { AppAmountPipe } from './app-amount.pipe';

// Angular i18n locale data must be registered before the test runs,
// or DecimalPipe / CurrencyPipe throw NG0701.
registerLocaleData(localeFr, 'fr', localeFrExtra);

describe('AppAmountPipe', () => {
  let pipe: AppAmountPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppAmountPipe,
        { provide: LOCALE_ID, useValue: 'fr' },
      ],
    });
    pipe = TestBed.inject(AppAmountPipe);
  });

  describe('default format', () => {
    it('formats a whole number with the currency', () => {
      const result = pipe.transform(1500);
      // French locale formats with a narrow no-break space group separator,
      // so we normalize whitespace before asserting.
      expect(result.replace(/\s/g, ' ')).toContain('1 500');
      expect(result).toContain('FCFA');
    });

    it('formats zero', () => {
      const result = pipe.transform(0);
      expect(result).toContain('0');
      expect(result).toContain('FCFA');
    });

    it('formats large numbers with group separators', () => {
      const result = pipe.transform(12500);
      expect(result.replace(/\s/g, ' ')).toContain('12 500');
    });

    it('rounds to no decimals', () => {
      const result = pipe.transform(1500.75);
      // The DIGITS '1.0-0' means zero decimal places.
      expect(result.replace(/\s/g, ' ')).toContain('1 501');
    });

    it('returns empty string for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('returns empty string for NaN', () => {
      expect(pipe.transform(NaN)).toBe('');
    });

    it('handles negative amounts', () => {
      const result = pipe.transform(-500);
      expect(result).toContain('-');
      expect(result).toContain('500');
      expect(result).toContain('FCFA');
    });
  });

  describe('short format', () => {
    it('shows "k" suffix for thousands', () => {
      expect(pipe.transform(1500, 'short')).toBe('2k FCFA');
      expect(pipe.transform(25000, 'short')).toBe('25k FCFA');
      expect(pipe.transform(999999, 'short')).toBe('1000k FCFA');
    });

    it('shows "M" suffix for millions', () => {
      expect(pipe.transform(1_500_000, 'short')).toBe('1.5M FCFA');
      expect(pipe.transform(2_000_000, 'short')).toBe('2.0M FCFA');
    });

    it('shows the raw number below 1000', () => {
      expect(pipe.transform(500, 'short')).toBe('500 FCFA');
      expect(pipe.transform(0, 'short')).toBe('0 FCFA');
    });

    it('handles negative amounts', () => {
      expect(pipe.transform(-2500, 'short')).toBe('-3k FCFA');
    });

    it('returns empty string for null', () => {
      expect(pipe.transform(null, 'short')).toBe('');
    });
  });
});
