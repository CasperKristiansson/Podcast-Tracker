const CODE_VERIFIER_KEY = "podcastTracker:auth:codeVerifier";
const STATE_KEY = "podcastTracker:auth:state";
const TOKENS_KEY = "podcastTracker:auth:tokens";
const PROMPT_RETRY_KEY = "podcastTracker:auth:promptRetry";

export type PromptRetryStage = "login" | "consent";

export interface StoredTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
}

const getSessionStorage = (): Storage => {
  if (typeof window === "undefined") {
    throw new Error("Session storage is unavailable on the server.");
  }
  if (!window.sessionStorage) {
    throw new Error("Session storage is not supported in this browser.");
  }
  return window.sessionStorage;
};

export const storeCodeVerifier = (verifier: string): void => {
  getSessionStorage().setItem(CODE_VERIFIER_KEY, verifier);
};

export const consumeCodeVerifier = (): string | null => {
  const storage = getSessionStorage();
  const verifier = storage.getItem(CODE_VERIFIER_KEY);
  if (verifier) {
    storage.removeItem(CODE_VERIFIER_KEY);
  }
  return verifier;
};

export const storeState = (state: string): void => {
  getSessionStorage().setItem(STATE_KEY, state);
};

export const consumeState = (): string | null => {
  const storage = getSessionStorage();
  const state = storage.getItem(STATE_KEY);
  if (state) {
    storage.removeItem(STATE_KEY);
  }
  return state;
};

export const storeTokens = (tokens: StoredTokens): void => {
  getSessionStorage().setItem(TOKENS_KEY, JSON.stringify(tokens));
};

export const getTokens = (): StoredTokens | null => {
  const raw = getSessionStorage().getItem(TOKENS_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
};

export const clearTokens = (): void => {
  getSessionStorage().removeItem(TOKENS_KEY);
};

export const getPromptRetryStage = (): PromptRetryStage | null => {
  const raw = getSessionStorage().getItem(PROMPT_RETRY_KEY);
  if (!raw) {
    return null;
  }
  if (raw === "1" || raw === "login") {
    return "login";
  }
  if (raw === "consent") {
    return "consent";
  }
  return null;
};

export const setPromptRetryStage = (stage: PromptRetryStage): void => {
  getSessionStorage().setItem(PROMPT_RETRY_KEY, stage);
};

export const clearPromptRetryStage = (): void => {
  getSessionStorage().removeItem(PROMPT_RETRY_KEY);
};
