import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  ChatHistoryMessage,
  ChatTurn,
  KnownPayload,
  MealCard,
  PAYLOAD_TYPE,
  VendorCard,
} from '@core/models/ai/chat.models';
import { CHAT_SERVICE, ChatSessionStore } from '@core/services/ai';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ChatMealCardComponent } from '../chat-meal-card/chat-meal-card.component';
import { ChatVendorCardComponent } from '../chat-vendor-card/chat-vendor-card.component';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [FormsModule, IconComponent, ChatMealCardComponent, ChatVendorCardComponent],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatWidgetComponent {

  private readonly chatService = inject(CHAT_SERVICE);
  private readonly chat = inject(ChatSessionStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  protected readonly PAYLOAD_TYPE = PAYLOAD_TYPE;

  @ViewChild('messageInput') messageInput?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  protected readonly input = signal<string>('');
  protected readonly turns = this.chat.turns;
  protected readonly isOpen = this.chat.isOpen;
  protected readonly sending = this.chat.sending;
  protected readonly hasMore = this.chat.hasMore;
  protected readonly loadingOlder = this.chat.loadingOlder;

  /**
   * True when the user has scrolled away from the bottom. Suppresses
   * auto-scroll on new turns and drives the "jump to latest" button.
   */
  protected readonly userScrolledUp = signal<boolean>(false);

  private static readonly SCROLL_THRESHOLD_PX = 60;
  private static readonly LOAD_OLDER_TRIGGER_PX = 80;
  private static readonly PAGE_SIZE = 10;

  constructor() {
    // Load history when the panel is open with an empty turn list and
    // we have not already tried. `historyLoadAttempted` prevents a
    // retry storm when the backend is unavailable.
    effect(() => {
      const open = this.isOpen();
      const empty = this.turns().length === 0;
      const loading = this.chat.loadingOlder();
      const loaded = this.chat.historyLoaded();
      const attempted = this.chat.historyLoadAttempted();

      if (open && empty && !loading && !loaded && !attempted) {
        void this.ensureHistoryLoaded();
      }
    });

    // Auto-scroll on append only — never on prepend.
    effect(() => {
      this.turns();
      if (!this.chat.lastAppend()) return;
      queueMicrotask(() => this.scrollToBottomIfNearBottom());
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  History loading
  // ═══════════════════════════════════════════════════════════

  private async ensureHistoryLoaded(): Promise<void> {
    const sid = this.chat.sessionId;
    if (!sid) return;
    if (this.chat.historyLoaded()) return;
    if (this.chat.loadingOlder()) return;
    if (this.chat.historyLoadAttempted()) return;

    this.chat.markHistoryLoadAttempted();
    this.chat.setLoadingOlder(true);

    try {
      const page = await firstValueFrom(
        this.chatService.history(sid, null, ChatWidgetComponent.PAGE_SIZE));

      this.chat.prependTurns(page.messages.map(this.toTurn));
      this.chat.setPagination(page.hasMore, page.nextCursor);
      this.chat.markHistoryLoaded();

      queueMicrotask(() => this.jumpToBottomNoAnim());
    } catch (e) {
      console.error('[MealMate] history load failed', e);
    } finally {
      this.chat.setLoadingOlder(false);
    }
  }

  private async loadOlder(): Promise<void> {
    const sid = this.chat.sessionId;
    const cursor = this.chat.nextCursor();
    if (!sid || !cursor) return;
    if (this.chat.loadingOlder()) return;

    const el = this.messagesContainer?.nativeElement;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;

    this.chat.setLoadingOlder(true);
    try {
      const page = await firstValueFrom(
        this.chatService.history(sid, cursor, ChatWidgetComponent.PAGE_SIZE));

      this.chat.prependTurns(page.messages.map(this.toTurn));
      this.chat.setPagination(page.hasMore, page.nextCursor);

      queueMicrotask(() => {
        if (!el) return;
        el.scrollTop = prevTop + (el.scrollHeight - prevHeight);
      });
    } catch (e) {
      console.error('[MealMate] older page load failed', e);
    } finally {
      this.chat.setLoadingOlder(false);
    }
  }

  private readonly toTurn = (m: ChatHistoryMessage): ChatTurn => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.createdAt),
    structured: m.structured ?? null,
  });

  // ═══════════════════════════════════════════════════════════
  //  Scroll behaviour
  // ═══════════════════════════════════════════════════════════

  protected onMessagesScroll(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.userScrolledUp.set(
      distanceFromBottom > ChatWidgetComponent.SCROLL_THRESHOLD_PX,
    );

    if (el.scrollTop < ChatWidgetComponent.LOAD_OLDER_TRIGGER_PX
        && this.chat.hasMore()
        && !this.chat.loadingOlder()) {
      void this.loadOlder();
    }
  }

  private scrollToBottomIfNearBottom(): void {
    if (!this.isOpen()) return;
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    if (this.userScrolledUp()) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  private jumpToBottomNoAnim(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    this.userScrolledUp.set(false);
  }

  protected scrollToLatest(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    this.userScrolledUp.set(false);
  }

  // ═══════════════════════════════════════════════════════════
  //  Panel / input
  // ═══════════════════════════════════════════════════════════

  protected onToggle(): void {
    this.chat.toggle();

    if (this.isOpen() && this.chat.historyLoaded()) {
      queueMicrotask(() => this.jumpToBottomNoAnim());
    }
  }

  protected onClose(): void {
    this.chat.close();
  }

  protected onInput(value: string): void {
    this.input.set(value);
  }

  protected onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.send();
  }

  protected send(): void {
    const text = this.input().trim();
    if (!text || this.sending()) return;

    this.userScrolledUp.set(false);

    this.chat.appendTurn({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    });

    this.input.set('');
    this.chat.sending.set(true);

    this.chatService
      .send({ message: text, sessionId: this.chat.sessionId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.sessionId && res.sessionId !== this.chat.sessionId) {
            this.chat.setSessionId(res.sessionId);
          }
          this.chat.appendTurn({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: res.reply,
            timestamp: new Date(),
            structured: res.structured ?? null,
          });
          this.chat.sending.set(false);
        },
        error: (err) => {
          console.error('[MealMate] chat error', err);
          this.chat.appendTurn({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Une erreur est survenue. Veuillez réessayer.',
            timestamp: new Date(),
          });
          this.chat.sending.set(false);
        },
      });
  }

  // ═══════════════════════════════════════════════════════════
  //  Payload narrowing — flattens the payload array into cards
  // ═══════════════════════════════════════════════════════════

  /**
   * Extract every meal from every MEALS payload in the turn's
   * payload array, in tool-call order.
   *
   * The type guard `p is MealsPayload` narrows `p.data` to
   * `MealListPayload`, so no cast is needed.
   */
  protected asMeals(payloads: KnownPayload[] | null | undefined): MealCard[] {
    if (!payloads?.length) return [];
    return payloads
      .filter((p): p is Extract<KnownPayload, { type: 'MEALS' }> =>
        p.type === PAYLOAD_TYPE.MEALS)
      .flatMap(p => p.data.meals ?? []);
  }

  protected asVendors(payloads: KnownPayload[] | null | undefined): VendorCard[] {
    if (!payloads?.length) return [];
    return payloads
      .filter((p): p is Extract<KnownPayload, { type: 'VENDORS' }> =>
        p.type === PAYLOAD_TYPE.VENDORS)
      .flatMap(p => p.data.vendors ?? []);
  }

  // ═══════════════════════════════════════════════════════════
  //  Navigation
  // ═══════════════════════════════════════════════════════════

  protected onMealClick(meal: MealCard): void {
    this.router.navigate(['/meals', meal.id]);
    this.chat.close();
  }

  protected onVendorClick(vendor: VendorCard): void {
    this.router.navigate(['meals/vendor/directory', vendor.id]);
    this.chat.close();
  }
}
