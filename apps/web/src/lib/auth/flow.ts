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

export class PendingApprovalError extends Error {
  constructor(message = "USER_NOT_APPROVED") {
    super(message);
    this.name = "PendingApprovalError";
  }
}

export const PENDING_APPROVAL_MESSAGE =
  "Your account is pending approval. An admin must approve access before you can sign in.";

const PENDING_APPROVAL_TOKENS = [
  "user_not_approved",
  "pending approval",
  "userlambdavalidationexception",
  "pretokengeneration failed",
];

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

const collectErrorStrings = (error: unknown): string[] => {
  const strings: string[] = [];
  const queue: { value: unknown; depth: number }[] = [
    { value: error, depth: 0 },
  ];
  const seen = new WeakSet<object>();
  const maxDepth = 3;

  const addString = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[object Object]") {
      return;
    }
    strings.push(trimmed);
  };

  while (queue.length) {
    const item = queue.shift();
    if (!item) {
      break;
    }

    const { value, depth } = item;
    if (!value) {
      continue;
    }

    if (typeof value === "string") {
      addString(value);
      continue;
    }

    if (value instanceof Error) {
      addString(value.message);
      addString(value.name);
      const cause = (value as { cause?: unknown }).cause;
      if (cause) {
        queue.push({ value: cause, depth: depth + 1 });
      }
      continue;
    }

    if (typeof value !== "object") {
      if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "bigint"
      ) {
        addString(String(value));
      }
      continue;
    }

    if (seen.has(value)) {
      continue;
    }
    seen.add(value);

    if (depth >= maxDepth) {
      continue;
    }

    const record = value as Record<string, unknown>;
    Object.values(record).forEach((child) => {
      queue.push({ value: child, depth: depth + 1 });
    });
  }

  addString(String(error));

  return Array.from(new Set(strings));
};

const isPendingApprovalError = (error: unknown): boolean => {
  if (error instanceof PendingApprovalError) {
    return true;
  }

  return collectErrorStrings(error).some((text) => {
    const normalized = text.toLowerCase();
    return PENDING_APPROVAL_TOKENS.some((token) => normalized.includes(token));
  });
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

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("binary");
};

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const parts = token.split(".");
  const payloadPart = parts[1];
  if (!payloadPart) {
    throw new Error("Invalid ID token format.");
  }

  const payload = decodeBase64Url(payloadPart);
  return JSON.parse(payload) as Record<string, unknown>;
};

const isApprovedFromToken = (idToken: string): boolean => {
  const payload = decodeJwtPayload(idToken);
  const approvedClaim = payload["custom:approved"];
  return (
    approvedClaim === true ||
    approvedClaim === "true" ||
    approvedClaim === 1 ||
    approvedClaim === "1"
  );
};

const ensureApprovedToken = (idToken: string): void => {
  if (!isApprovedFromToken(idToken)) {
    throw new PendingApprovalError();
  }
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
  status: "success" | "error" | "pending-approval";
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

    ensureApprovedToken(tokens.idToken.toString());
    clearPromptRetryStage();

    return {
      status: "success",
      message: "Signed in successfully.",
    };
  } catch (error) {
    if (isPendingApprovalError(error)) {
      clearPromptRetryStage();
      return {
        status: "pending-approval",
        message: PENDING_APPROVAL_MESSAGE,
      };
    }
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
    ensureApprovedToken(tokens.idToken.toString());
    return toStoredTokens(tokens as typeof tokens & { refreshToken?: string });
  } catch (error) {
    if (isUserNotAuthenticatedError(error)) {
      return null;
    }
    if (isPendingApprovalError(error)) {
      throw new PendingApprovalError();
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
