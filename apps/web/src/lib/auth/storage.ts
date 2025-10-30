const PROMPT_RETRY_KEY = "podcastTracker:auth:promptRetry";

export type PromptRetryStage = "login" | "consent";

const getSessionStorage = (): Storage => {
  if (typeof window === "undefined") {
    throw new Error("Session storage is unavailable on the server.");
  }
  if (!window.sessionStorage) {
    throw new Error("Session storage is not supported in this browser.");
  }
  return window.sessionStorage;
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
