import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { VendorModerationPanelComponent } from './vendor-moderation-panel.component';
import { VENDOR_SERVICE, VendorService } from '@app/core/services/marketplace/vendor.service';
import { ToastService } from '@components/shared/toast';
import { VendorStatus } from '@app/core/models/marketplace/enum-type.model';
import { aVendor } from 'src/testing/factories';

describe('VendorModerationPanelComponent', () => {
  let fixture: ComponentFixture<VendorModerationPanelComponent>;
  let component: VendorModerationPanelComponent;
  let vendorService: jasmine.SpyObj<VendorService>;
  let toast: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    vendorService = jasmine.createSpyObj<VendorService>('VendorService', [
      'activateVendor', 'suspendVendor', 'banVendor', 'deactivateVendor',
    ]);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);

    const v = aVendor();
    vendorService.activateVendor.and.returnValue(of(v));
    vendorService.suspendVendor.and.returnValue(of(v));
    vendorService.banVendor.and.returnValue(of(v));
    vendorService.deactivateVendor.and.returnValue(of(v));

    await TestBed.configureTestingModule({
      imports: [VendorModerationPanelComponent],
      providers: [
        { provide: VENDOR_SERVICE, useValue: vendorService },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VendorModerationPanelComponent);
    component = fixture.componentInstance;
  });

  function buttons(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return buttons().find(b => b.textContent?.trim().includes(label) ?? false);
  }

  function textarea(): HTMLTextAreaElement | null {
    return fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement | null;
  }

  function renderAt(status: VendorStatus): void {
    fixture.componentRef.setInput('vendorId', 'vendor-1');
    fixture.componentRef.setInput('businessName', 'Le Chaudron');
    fixture.componentRef.setInput('currentStatus', status);
    fixture.detectChanges();
  }

  function typeReason(text: string): void {
    const ta = textarea()!;
    ta.value = text;
    ta.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Valid actions per status
  // ═══════════════════════════════════════════════════════════

  describe('valid actions per status', () => {
    it('PENDING shows Activer and Désactiver', () => {
      renderAt('PENDING');
      expect(findButton('Activer')).toBeDefined();
      expect(findButton('Désactiver')).toBeDefined();
      expect(findButton('Suspendre')).toBeUndefined();
      expect(findButton('Bannir')).toBeUndefined();
    });

    it('ACTIVE shows Suspendre, Bannir and Désactiver', () => {
      renderAt('ACTIVE');
      expect(findButton('Suspendre')).toBeDefined();
      expect(findButton('Bannir')).toBeDefined();
      expect(findButton('Désactiver')).toBeDefined();
      expect(findButton('Activer')).toBeUndefined();
    });

    it('SUSPENDED shows Activer and Bannir', () => {
      renderAt('SUSPENDED');
      expect(findButton('Activer')).toBeDefined();
      expect(findButton('Bannir')).toBeDefined();
      expect(findButton('Suspendre')).toBeUndefined();
      expect(findButton('Désactiver')).toBeUndefined();
    });

    it('INACTIVE shows only Activer', () => {
      renderAt('INACTIVE');
      expect(findButton('Activer')).toBeDefined();
      expect(findButton('Suspendre')).toBeUndefined();
      expect(findButton('Bannir')).toBeUndefined();
      expect(findButton('Désactiver')).toBeUndefined();
    });

    it('BANNED shows no action buttons (terminal state)', () => {
      renderAt('BANNED');
      expect(findButton('Activer')).toBeUndefined();
      expect(findButton('Suspendre')).toBeUndefined();
      expect(findButton('Bannir')).toBeUndefined();
      expect(findButton('Désactiver')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Reason requirement
  // ═══════════════════════════════════════════════════════════

  describe('reason requirement', () => {
    it('Suspendre shows the reason textarea', () => {
      renderAt('ACTIVE');
      findButton('Suspendre')!.click();
      fixture.detectChanges();
      expect(textarea()).not.toBeNull();
    });

    it('Activer does not show a reason textarea', () => {
      renderAt('PENDING');
      findButton('Activer')!.click();
      fixture.detectChanges();
      expect(textarea()).toBeNull();
    });

    it('the confirm button is disabled until a 3+ character reason is entered', () => {
      renderAt('ACTIVE');
      findButton('Suspendre')!.click();
      fixture.detectChanges();

      const confirmBtn = findButton('Confirmer')!;
      expect(confirmBtn.disabled).toBe(true);

      typeReason('ab');
      expect(findButton('Confirmer')!.disabled).toBe(true);

      typeReason('abc');
      expect(findButton('Confirmer')!.disabled).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Confirming calls the right service method
  // ═══════════════════════════════════════════════════════════

  describe('confirming an action', () => {
    it('Activer calls activateVendor', () => {
      renderAt('PENDING');
      findButton('Activer')!.click();
      fixture.detectChanges();
      findButton('Confirmer')!.click();
      fixture.detectChanges();

      expect(vendorService.activateVendor).toHaveBeenCalledWith('vendor-1');
    });

    it('Suspendre calls suspendVendor with the typed reason', () => {
      renderAt('ACTIVE');
      findButton('Suspendre')!.click();
      fixture.detectChanges();
      typeReason('Comportement suspect');
      findButton('Confirmer')!.click();
      fixture.detectChanges();

      expect(vendorService.suspendVendor).toHaveBeenCalledWith(
        'vendor-1',
        'Comportement suspect',
      );
    });

    it('emits `moderated` with the updated vendor on success', () => {
      const updatedVendor = aVendor({ status: 'SUSPENDED' });
      vendorService.suspendVendor.and.returnValue(of(updatedVendor));

      renderAt('ACTIVE');

      let emitted: unknown = null;
      component.moderated.subscribe(v => (emitted = v));

      findButton('Suspendre')!.click();
      fixture.detectChanges();
      typeReason('Test reason');
      findButton('Confirmer')!.click();
      fixture.detectChanges();

      expect(emitted).toBe(updatedVendor);
    });

    it('shows an error toast when the service fails', () => {
      const consoleSpy = spyOn(console, 'error');

      vendorService.suspendVendor.and.returnValue(
        throwError(() => new Error('boom')),
      );

      renderAt('ACTIVE');
      findButton('Suspendre')!.click();
      fixture.detectChanges();
      typeReason('Test reason');
      findButton('Confirmer')!.click();
      fixture.detectChanges();

      expect(toast.show).toHaveBeenCalledWith(
        jasmine.stringContaining('Échec'),
        'error',
      );

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.calls.reset();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Cancel
  // ═══════════════════════════════════════════════════════════

  it('Annuler returns to the action list without calling any service', () => {
    renderAt('ACTIVE');
    findButton('Suspendre')!.click();
    fixture.detectChanges();
    findButton('Annuler')!.click();
    fixture.detectChanges();

    expect(vendorService.suspendVendor).not.toHaveBeenCalled();
    expect(findButton('Suspendre')).toBeDefined();
  });
});
