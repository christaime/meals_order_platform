import { Injectable, signal } from '@angular/core';
import { ChatTurn } from '@core/models/ai/chat.models';

const SESSION_ID_KEY = 'mealmate_session_id';
const PANEL_OPEN_KEY = 'mealmate_panel_open';

/**
 * Root-provided store for the chat widget.
 *
 * Session id and open state live in localStorage so a new tab
 * resumes the same conversation with the panel in the same state.
 * The turn list itself is in-memory; it is re-hydrated from the
 * server on first open (see ChatWidgetComponent.ensureHistoryLoaded).
 */
@Injectable({ providedIn: 'root' })
export class ChatSessionStore {

  readonly turns = signal<ChatTurn[]>([]);
  readonly sending = signal<boolean>(false);
  readonly isOpen = signal<boolean>(this.readOpenFromStorage());

  // Pagination state
  readonly hasMore = signal<boolean>(false);
  readonly nextCursor = signal<string | null>(null);
  readonly loadingOlder = signal<boolean>(false);
  readonly historyLoaded = signal<boolean>(false);

  private readonly _historyLoadAttempted = signal<boolean>(false);
  readonly historyLoadAttempted = this._historyLoadAttempted.asReadonly();

  /**
   * false when the most recent change to `turns` was a prepend.
   * The widget's auto-scroll effect reads this to avoid yanking
   * the viewport to the bottom when older messages are inserted.
   */
  private readonly _lastAppend = signal<boolean>(true);
  readonly lastAppend = this._lastAppend.asReadonly();

  private _sessionId: string | null = this.readSessionFromStorage();

  get sessionId(): string | null {
    return this._sessionId;
  }

  setSessionId(id: string): void {
      if (id === this._sessionId) return;
      this._sessionId = id;
      localStorage.setItem(SESSION_ID_KEY, id);

      // A new session means new history to load.
      this._historyLoadAttempted.set(false);
      this.historyLoaded.set(false);
      this.hasMore.set(false);
      this.nextCursor.set(null);
    }

  // ═══════════════════════════════════════════════════════════
  //  Panel state
  // ═══════════════════════════════════════════════════════════

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    localStorage.setItem(PANEL_OPEN_KEY, next ? '1' : '0');
  }

  close(): void {
    this.isOpen.set(false);
    localStorage.setItem(PANEL_OPEN_KEY, '0');
  }

  // ═══════════════════════════════════════════════════════════
  //  Turns
  // ═══════════════════════════════════════════════════════════

  appendTurn(turn: ChatTurn): void {
    this._lastAppend.set(true);
    this.turns.update(t => [...t, turn]);
  }

  prependTurns(turns: ChatTurn[]): void {
    if (turns.length === 0) return;
    this._lastAppend.set(false);
    this.turns.update(existing => [...turns, ...existing]);
  }

  setPagination(hasMore: boolean, nextCursor: string | null): void {
    this.hasMore.set(hasMore);
    this.nextCursor.set(nextCursor);
  }

  setLoadingOlder(v: boolean): void {
    this.loadingOlder.set(v);
  }

  markHistoryLoaded(): void {
    this.historyLoaded.set(true);
  }

  // ═══════════════════════════════════════════════════════════
  //  Storage
  // ═══════════════════════════════════════════════════════════

  private readSessionFromStorage(): string | null {
    return localStorage.getItem(SESSION_ID_KEY);
  }

  private readOpenFromStorage(): boolean {
    return localStorage.getItem(PANEL_OPEN_KEY) === '1';
  }

  markHistoryLoadAttempted(): void {
    this._historyLoadAttempted.set(true);
  }

  resetHistoryLoadAttempted(): void {
    this._historyLoadAttempted.set(false);
  }

}
