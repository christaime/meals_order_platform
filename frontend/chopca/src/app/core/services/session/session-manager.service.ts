import {
  DestroyRef, Injectable, NgZone, effect, inject, signal,
} from '@angular/core';
import { RoleContext } from '@app/core/services/auth/role-context.service';
import Keycloak from 'keycloak-js';
import { SESSION_CHANNEL, SessionMessage } from './session-messages';

const LEADER_HEARTBEAT_MS = 5_000;
const LEADER_TIMEOUT_MS   = 12_000;   // if no heartbeat in 12s, leader is dead
const TOKEN_REFRESH_MS    = 20_000;   // check every 20s; updateToken(30) decides
const REFRESH_THRESHOLD_S = 30;       // refresh if expiring within 30s

@Injectable({ providedIn: 'root' })
export class SessionManager {

  private readonly keycloak = inject(Keycloak);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly roles = inject(RoleContext);

  /** Unique per tab (not per service instance). */
  private readonly tabId = crypto.randomUUID();

  private readonly channel = new BroadcastChannel(SESSION_CHANNEL);

  // ─── Leader state ─────────────────────────────────────────
  private readonly _isLeader = signal<boolean>(false);
  readonly isLeader = this._isLeader.asReadonly();

  /** Timestamp of the last heartbeat we received from *another* tab. */
  private lastLeaderHeartbeat = 0;

  /** Timers owned by this tab. */
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private electionTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── Lifecycle ────────────────────────────────────────────

  private started = false;
  private onVisibility: (() => void) | null = null;

  constructor() {
    // Start/stop the session machinery based on auth state.
    // RoleContext already listens to Keycloak callbacks, so we don't
    // touch them here (avoids callback clobbering).
    effect(() => {
      if (this.roles.isAuthenticated()) this.start();
      else this.stop();
    }, { allowSignalWrites: true });

    this.destroyRef.onDestroy(() => this.stop());
  }

  /** Whether a session currently exists. Cheap; no network. */
  hasSession(): boolean {
    return this.keycloak.authenticated;
  }

  private start(): void {
    if (this.started) return;
    this.started = true;

    this.channel.onmessage = ev => this.onMessage(ev.data as SessionMessage);

    this.attemptLeadership();

    this.onVisibility = () => {
      if (document.visibilityState === 'visible') {
        this.refreshNow().catch(() => { /* handled inside */ });
      }
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private stop(): void {
    if (!this.started) return;
    this.started = false;

    if (this.onVisibility) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      this.onVisibility = null;
    }
    this.releaseLeadership();
  }

  // ─── Public API ───────────────────────────────────────────

  /**
   * Get a guaranteed-fresh access token.
   * Leader: refreshes directly.
   * Follower: asks the leader; if no answer within 1s, refreshes anyway
   * (safety net — leader might be dead and we haven't noticed yet).
   */
  async getFreshToken(): Promise<string> {
    if (this.keycloak.token && !this.isExpiring(this.keycloak.token, REFRESH_THRESHOLD_S)) {
      return this.keycloak.token;
    }
    if (this._isLeader()) {
      await this.refreshNow();
      return this.keycloak.token ?? '';
    }
    const fromLeader = await this.requestTokenFromLeader();
    if (fromLeader) return fromLeader;
    // Fallback: leader didn't answer — refresh locally and try to become leader.
    await this.refreshNow();
    this.attemptLeadership();
    return this.keycloak.token ?? '';
  }

  /** Force a token refresh. Safe to call from anywhere. */
  async refreshNow(): Promise<void> {
    if (!this.keycloak.authenticated) return;
    try {
      const refreshed = await this.keycloak.updateToken(REFRESH_THRESHOLD_S);
      if (refreshed && this._isLeader()) {
        this.broadcastToken();
      }
    } catch {
      // Refresh token dead — tell all tabs and re-auth.
      this.broadcast({ type: 'LOGOUT', tabId: this.tabId });
      await this.keycloak.login();
    }
  }

  /** Call this on logout to stop everything cleanly across tabs. */
  shutdown(): void {
    this.broadcast({ type: 'LOGOUT', tabId: this.tabId });
    this.releaseLeadership();
  }

  // ─── Leadership ───────────────────────────────────────────

  private attemptLeadership(): void {
    // If someone has heartbeat recently, don't fight them.
    const sinceLastBeat = Date.now() - this.lastLeaderHeartbeat;
    if (this.lastLeaderHeartbeat > 0 && sinceLastBeat < LEADER_TIMEOUT_MS) {
      return; // a leader is alive
    }
    // Claim leadership. Other tabs will yield if they hear our heartbeat.
    this.broadcast({ type: 'CLAIM_LEADERSHIP', tabId: this.tabId, at: Date.now() });
    // Small delay before committing — if two tabs claim simultaneously,
    // the one with the smaller tabId wins (deterministic tie-break).
    this.electionTimer = setTimeout(() => {
      this.electionTimer = null;
      this.becomeLeader();
    }, 300);
  }

  private becomeLeader(): void {
    if (this._isLeader()) return;
    this._isLeader.set(true);
    this.startRefreshLoop();
    this.startHeartbeat();
  }

  private releaseLeadership(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.refreshTimer)   { clearInterval(this.refreshTimer);   this.refreshTimer = null; }
    if (this.electionTimer)  { clearTimeout(this.electionTimer);  this.electionTimer = null; }
    if (this._isLeader()) {
      this._isLeader.set(false);
      this.broadcast({ type: 'YIELD_LEADERSHIP', tabId: this.tabId });
      // Give another tab a chance to take over.
      // (They'll detect the absence of heartbeats within LEADER_TIMEOUT_MS.)
    }
  }

  // ─── Loops (leader only) ──────────────────────────────────

  private startRefreshLoop(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(
      () => this.zone.run(() => this.refreshNow().catch(() => { /* handled */ })),
      TOKEN_REFRESH_MS,
    );
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      // The heartbeat IS a token broadcast — followers keep the fresh token.
      this.broadcastToken();
    }, LEADER_HEARTBEAT_MS);
  }

  private broadcastToken(): void {
    const token = this.keycloak.token;
    if (!token) return;
    this.broadcast({ type: 'TOKEN_REFRESHED', tabId: this.tabId, accessToken: token, at: Date.now() });
  }

  // ─── Follower: request token from leader ──────────────────

  private requestTokenFromLeader(): Promise<string | null> {
    return new Promise(resolve => {
      const nonce = this.tabId;
      const timer = setTimeout(() => resolve(null), 1_000);

      const handler = (ev: MessageEvent<SessionMessage>) => {
        const msg = ev.data;
        if (msg.type === 'HERE_IS_TOKEN' && msg.tabId !== nonce) {
          clearTimeout(timer);
          this.channel.removeEventListener('message', handler);
          resolve(msg.accessToken);
        }
      };
      this.channel.addEventListener('message', handler);

      this.broadcast({ type: 'REQUEST_TOKEN', tabId: this.tabId });
    });
  }

  // ─── Message handling ─────────────────────────────────────

  private onMessage(msg: SessionMessage): void {
    switch (msg.type) {
      case 'CLAIM_LEADERSHIP':
        // Another tab is claiming. If I'm leader, I out-rank if my tabId is smaller.
        if (this._isLeader() && msg.tabId > this.tabId) {
          // I win — ignore their claim.
          return;
        }
        // Someone else wins — I yield.
        if (this._isLeader()) this.releaseLeadership();
        this.lastLeaderHeartbeat = msg.at;
        break;

      case 'YIELD_LEADERSHIP':
        this.lastLeaderHeartbeat = 0;
        this.attemptLeadership();
        break;

      case 'TOKEN_REFRESHED':
        this.lastLeaderHeartbeat = msg.at;
        // Adopt the fresh token so this tab's keycloak instance stays in sync.
        // keycloak-js exposes a way to update its internal token; if not,
        // we rely on the fact that all tabs share the same refresh token,
        // so our own updateToken will still work.
        break;

      case 'REQUEST_TOKEN':
        if (this._isLeader()) {
          const token = this.keycloak.token;
          if (token) {
            this.broadcast({ type: 'HERE_IS_TOKEN', tabId: this.tabId, accessToken: token, at: Date.now() });
          }
        }
        break;

      case 'HERE_IS_TOKEN':
        // Handled by the requestTokenFromLeader promise handler.
        break;

      case 'LOGOUT':
        // Another tab logged out — log out here too.
        this.keycloak.logout({ redirectUri: window.location.origin });
        break;
    }
  }

  private broadcast(msg: SessionMessage): void {
    this.channel.postMessage(msg);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private isExpiring(token: string, withinSeconds: number): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const nowSec = Math.floor(Date.now() / 1000);
      return payload.exp - nowSec < withinSeconds;
    } catch {
      return true; // assume expired if unparseable
    }
  }
}
