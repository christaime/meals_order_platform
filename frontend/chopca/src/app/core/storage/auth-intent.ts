export type AuthIntent = 'vendor-registration' | 'customer-registration';

const INTENT_KEY = 'auth.intent';

export const AuthIntentStore = {
  set(intent: AuthIntent): void {
    localStorage.setItem(INTENT_KEY, intent);
  },

  get(): AuthIntent | null {
    const raw = localStorage.getItem(INTENT_KEY);
    return raw === 'vendor-registration' || raw === 'customer-registration'
      ? raw
      : null;
  },

  clear(): void {
    localStorage.removeItem(INTENT_KEY);
  },
};
