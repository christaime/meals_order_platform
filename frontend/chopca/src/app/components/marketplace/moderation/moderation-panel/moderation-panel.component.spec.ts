import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ModerationPanelComponent } from './moderation-panel.component';
import { MODERATION_SERVICE } from '@app/core/services/marketplace/moderation.service';
import { ModerationStatus } from '@app/core/models/marketplace/enum-type.model';

describe('ModerationPanelComponent', () => {
  let fixture: ComponentFixture<ModerationPanelComponent>;
  let component: ModerationPanelComponent;
  let moderationMock: jasmine.SpyObj<any>;

  async function setup(status: ModerationStatus): Promise<void> {
    moderationMock = jasmine.createSpyObj('ModerationService', ['moderate', 'getLatest']);
    moderationMock.moderate.and.returnValue(of({}));
    moderationMock.getLatest.and.returnValue(of(null));

    await TestBed.configureTestingModule({
      imports: [ModerationPanelComponent],
      providers: [{ provide: MODERATION_SERVICE, useValue: moderationMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(ModerationPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('targetType', 'MEAL');
    fixture.componentRef.setInput('targetId', 'meal-taro');
    fixture.componentRef.setInput('currentStatus', status);
    fixture.detectChanges();
  }

  // ═══════════════════════════════════════════════════════════
  //  Status display
  // ═══════════════════════════════════════════════════════════

  describe('status', () => {
    it('exposes the current status as a data attribute', async () => {
      await setup('PENDING');
      const el = query('[data-testid=moderation-panel-status]');
      expect(el!.getAttribute('data-status')).toBe('PENDING');
    });

    it('labels PENDING as "En attente"', async () => {
      await setup('PENDING');
      expect(query('[data-testid=moderation-panel-status]')!.textContent).toContain('En attente');
    });

    it('labels APPROVED as "Approuvé"', async () => {
      await setup('APPROVED');
      expect(query('[data-testid=moderation-panel-status]')!.textContent).toContain('Approuvé');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Decisions per status
  // ═══════════════════════════════════════════════════════════

  describe('decisions', () => {
    it('offers APPROVE and REJECT for PENDING', async () => {
      await setup('PENDING');
      expect(query('[data-testid=moderation-panel-decision-APPROVE]')).toBeTruthy();
      expect(query('[data-testid=moderation-panel-decision-REJECT]')).toBeTruthy();
    });

    it('offers DISABLE and REVOKE for APPROVED', async () => {
      await setup('APPROVED');
      expect(query('[data-testid=moderation-panel-decision-DISABLE]')).toBeTruthy();
      expect(query('[data-testid=moderation-panel-decision-REVOKE]')).toBeTruthy();
    });

    it('offers REACTIVATE for DISABLED', async () => {
      await setup('DISABLED');
      expect(query('[data-testid=moderation-panel-decision-REACTIVATE]')).toBeTruthy();
    });

    it('offers no decision for REJECTED', async () => {
      await setup('REJECTED');
      expect(query('[data-testid=moderation-panel-no-decision]')).toBeTruthy();
      expect(query('[data-testid=moderation-panel-decision-APPROVE]')).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Reason
  // ═══════════════════════════════════════════════════════════

  describe('reason', () => {
    it('shows the reason textarea when a decision requires it', async () => {
      await setup('PENDING');
      expect(query('[data-testid=moderation-panel-reason]')).toBeTruthy();
    });

    it('blocks submit when the reason is required but empty', async () => {
      await setup('PENDING');
      const reject = query('[data-testid=moderation-panel-decision-REJECT]') as HTMLButtonElement;
      reject.click();
      fixture.detectChanges();
      expect(moderationMock.moderate).not.toHaveBeenCalled();
      expect(query('[data-testid=moderation-panel-error]')).toBeTruthy();
    });

    it('submits with the reason when provided', async () => {
      await setup('PENDING');
      const ta = query('[data-testid=moderation-panel-reason]') as HTMLTextAreaElement;
      ta.value = 'Contenu incomplet';
      ta.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      click('[data-testid=moderation-panel-decision-REJECT]');

      expect(moderationMock.moderate).toHaveBeenCalledTimes(1);
      const [, , payload] = moderationMock.moderate.calls.mostRecent().args;
      expect(payload.decision).toBe('REJECT');
      expect(payload.reason).toBe('Contenu incomplet');
    });
  });

  // ═══════════════════════════════════════════════════════════
  //  Busy
  // ═══════════════════════════════════════════════════════════

  describe('busy', () => {
    it('disables the decision buttons while a request is in flight', async () => {
      await setup('PENDING');
      moderationMock.moderate.and.returnValue(new Promise(() => {}) as any);
      // Not a perfect simulation but enough to assert the busy flag wiring.
      component['busy'].set(true);
      fixture.detectChanges();

      const btn = query('[data-testid=moderation-panel-decision-APPROVE]') as HTMLButtonElement;
      expect(btn.disabled).toBeTrue();
    });
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
});
