import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationControlsComponent } from './pagination-controls.component';

describe('PaginationControlsComponent', () => {
  let fixture: ComponentFixture<PaginationControlsComponent>;
  let component: PaginationControlsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationControlsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('rendering', () => {
    it('does not render when there is only one page', () => {
      fixture.componentRef.setInput('totalItems', 5);
      fixture.componentRef.setInput('pageSize', 12);
      fixture.detectChanges();
      expect(query('[data-testid=pagination]')).toBeFalsy();
    });

    it('renders when there are multiple pages', () => {
      fixture.componentRef.setInput('totalItems', 100);
      fixture.componentRef.setInput('pageSize', 12);
      fixture.detectChanges();
      expect(query('[data-testid=pagination]')).toBeTruthy();
    });

    it('renders the expected page buttons for a small set', () => {
      fixture.componentRef.setInput('totalItems', 48);   // 4 pages
      fixture.componentRef.setInput('pageSize', 12);
      fixture.detectChanges();

      for (let i = 1; i <= 4; i++) {
        expect(query(`[data-testid=pagination-page-${i}]`)).toBeTruthy();
      }
    });

    it('renders ellipses for large page sets', () => {
      fixture.componentRef.setInput('totalItems', 240);  // 20 pages
      fixture.componentRef.setInput('pageSize', 12);
      fixture.componentRef.setInput('currentPage', 10);
      fixture.detectChanges();

      expect(query('[data-testid=pagination-page-1]')).toBeTruthy();
      expect(query('[data-testid=pagination-page-20]')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('totalItems', 60);  // 10 pages
      fixture.componentRef.setInput('pageSize', 10);
      fixture.componentRef.setInput('currentPage', 1);
      fixture.detectChanges();
    });

    it('disables the previous button on the first page', () => {
      const prev = query('[data-testid=pagination-previous]') as HTMLButtonElement;
      expect(prev.disabled).toBe(true);
    });

    it('emits pageChange and updates currentPage on next', () => {
      const spy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(spy);

      click('[data-testid=pagination-next]');

      expect(component.currentPage()).toBe(2);
      expect(spy).toHaveBeenCalledOnceWith(2);
    });

    it('emits pageChange when a page number is clicked', () => {
      const spy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(spy);

      click('[data-testid=pagination-page-5]');

      expect(component.currentPage()).toBe(5);
      expect(spy).toHaveBeenCalledOnceWith(5);
    });

    it('does not emit when clicking the current page', () => {
      const spy = jasmine.createSpy('pageChange');
      component.pageChange.subscribe(spy);

      click('[data-testid=pagination-page-1]');

      expect(spy).not.toHaveBeenCalled();
    });

    it('marks the current page with aria-current', () => {
      fixture.componentRef.setInput('currentPage', 3);
      fixture.detectChanges();

      const el = query('[data-testid=pagination-page-3]');
      expect(el?.getAttribute('aria-current')).toBe('page');
    });
  });

  function query(sel: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(sel);
  }
  function click(sel: string): void {
    const el = query(sel);
    expect(el).toBeTruthy("Element to click on was not found "+sel);
    el?.click();
    fixture.detectChanges();
  }
});
