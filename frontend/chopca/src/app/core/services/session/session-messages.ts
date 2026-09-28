/**
 * Messages exchanged between tabs over BroadcastChannel.
 * Keep this list small and serializable.
 */
export type SessionMessage =
  | { type: 'CLAIM_LEADERSHIP'; tabId: string; at: number }
  | { type: 'YIELD_LEADERSHIP'; tabId: string }
  | { type: 'TOKEN_REFRESHED'; tabId: string; accessToken: string; at: number }
  | { type: 'LOGOUT'; tabId: string }
  | { type: 'REQUEST_TOKEN'; tabId: string }
  | { type: 'HERE_IS_TOKEN'; tabId: string; accessToken: string; at: number };

export const SESSION_CHANNEL = 'mealmarket-session';
