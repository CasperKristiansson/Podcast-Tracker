import {
  type AuthError,
  fetchAuthSession,
  signInWithRedirect,
  signOut as amplifySignOut,
} from "aws-amplify/auth";
import { ensureAmplifyConfigured } from "./amplify";
import { logoutUri } from "./config";
import { clearPromptRetryStage } from "./storage";

type AuthorizePrompt = "login" | "select_account" | "consent";

const DEFAULT_PROMPT: AuthorizePrompt = "select_account";

type AmplifyPrompt = "NONE" | "LOGIN" | "CONSENT" | "SELECT_ACCOUNT";

const PROMPT_MAP: Record<AuthorizePrompt, AmplifyPrompt> = {
  consent: "CONSENT",
  login: "LOGIN",
  select_account: "SELECT_ACCOUNT",
};

export interface StoredTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
}

const isAuthError = (error: unknown): error is AuthError => {
  return Boolean(error && typeof error === "object" && "name" in error);
};

const isUserNotAuthenticatedError = (error: unknown): boolean => {
  return isAuthError(error) && error.name === "UserUnAuthenticatedException";
};

const toAmplifyPrompt = (prompt: AuthorizePrompt): AmplifyPrompt => {
  return PROMPT_MAP[prompt];
};

const toStoredTokens = (sessionTokens: {
  idToken?: { toString(): string; payload?: { exp?: number } };
  accessToken: { toString(): string; payload?: { exp?: number } };
  refreshToken?: string;
}): StoredTokens => {
  const idToken = sessionTokens.idToken?.toString();
  const accessToken = sessionTokens.accessToken.toString();
  const refreshToken = sessionTokens.refreshToken;

  if (!idToken) {
    throw new Error("Missing ID token from authenticated session.");
  }

  const expirySeconds =
    sessionTokens.idToken?.payload?.exp ??
    sessionTokens.accessToken?.payload?.exp;
  const expiresAt =
    typeof expirySeconds === "number"
      ? expirySeconds * 1000
      : Date.now() + 5 * 60 * 1000;

  return {
    idToken,
    accessToken,
    refreshToken,
    tokenType: "Bearer",
    expiresAt,
  };
};

export interface BeginLoginOptions {
  prompt?: AuthorizePrompt;
}

export const beginLogin = async (
  options?: BeginLoginOptions
): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("Login flow must be initiated in the browser.");
  }

  ensureAmplifyConfigured();

  const prompt = options?.prompt ?? DEFAULT_PROMPT;

  await signInWithRedirect({
    provider: "Google",
    options: {
      prompt: toAmplifyPrompt(prompt),
    },
  });
};

export interface CallbackResult {
  status: "success" | "error";
  message: string;
}

export const completeLogin = async (): Promise<CallbackResult> => {
  if (typeof window === "undefined") {
    throw new Error("Callback handling must run in the browser.");
  }

  ensureAmplifyConfigured();

  try {
    const session = await fetchAuthSession();
    const tokens = session.tokens;

    if (!tokens?.idToken || !tokens.accessToken) {
      return {
        status: "error",
        message: "Authentication tokens were not returned by Cognito.",
      };
    }

    clearPromptRetryStage();

    return {
      status: "success",
      message: "Signed in successfully.",
    };
  } catch (error) {
    if (isAuthError(error)) {
      return {
        status: "error",
        message: error.message,
      };
    }
    return {
      status: "error",
      message: "Unexpected error completing sign-in.",
    };
  }
};

export const getTokens = async (): Promise<StoredTokens | null> => {
  ensureAmplifyConfigured();
  try {
    const session = await fetchAuthSession();
    const tokens = session.tokens;
    if (!tokens?.idToken || !tokens.accessToken) {
      return null;
    }
    return toStoredTokens(tokens as typeof tokens & { refreshToken?: string });
  } catch (error) {
    if (isUserNotAuthenticatedError(error)) {
      return null;
    }
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  ensureAmplifyConfigured();
  try {
    await amplifySignOut({
      global: false,
      oauth: {
        redirectUrl: logoutUri,
      },
    });
  } finally {
    try {
      clearPromptRetryStage();
    } catch {
      // no-op
    }
  }
};
