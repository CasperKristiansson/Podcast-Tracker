import {
  clientId,
  cognitoDomain,
  identityProvider,
  redirectUri,
} from "./config";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "./pkce";
import {
  clearPromptRetryStage,
  clearTokens,
  consumeCodeVerifier,
  consumeState,
  getTokens,
  storeCodeVerifier,
  storeState,
  storeTokens,
  type StoredTokens,
} from "./storage";

const AUTHORIZE_ENDPOINT = "/oauth2/authorize";
const TOKEN_ENDPOINT = "/oauth2/token";

type AuthorizePrompt = "login" | "select_account" | "consent";

const buildAuthorizeUrl = (
  state: string,
  codeChallenge: string,
  prompt: AuthorizePrompt = "select_account"
): string => {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid email profile",
    identity_provider: identityProvider,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });
  // Defaulting to select_account avoids Cognito re-provisioning returning
  // social users, which can otherwise trigger immutable attribute errors.
  params.set("prompt", prompt);
  return `https://${cognitoDomain}${AUTHORIZE_ENDPOINT}?${params.toString()}`;
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

  const verifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(verifier);
  const state = generateState();

  storeCodeVerifier(verifier);
  storeState(state);

  window.location.href = buildAuthorizeUrl(
    state,
    codeChallenge,
    options?.prompt
  );
};

const buildTokenRequestBody = (
  code: string,
  codeVerifier: string
): URLSearchParams => {
  return new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
};

const buildTokenEndpointUrl = (): string =>
  `https://${cognitoDomain}${TOKEN_ENDPOINT}`;

const parseTokenResponse = (payload: Record<string, unknown>): StoredTokens => {
  const idToken = typeof payload.id_token === "string" ? payload.id_token : "";
  const accessToken =
    typeof payload.access_token === "string" ? payload.access_token : "";

  if (!idToken || !accessToken) {
    throw new Error("Token response missing expected fields.");
  }

  const expiresInSeconds =
    typeof payload.expires_in === "number"
      ? payload.expires_in
      : Number(payload.expires_in ?? 3600);
  const tokenType =
    typeof payload.token_type === "string" ? payload.token_type : "Bearer";
  const refreshToken =
    typeof payload.refresh_token === "string"
      ? payload.refresh_token
      : undefined;

  return {
    idToken,
    accessToken,
    refreshToken,
    tokenType,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
};

export interface CallbackResult {
  status: "success" | "error";
  message: string;
}

export const completeLogin = async (
  url: string = window.location.href
): Promise<CallbackResult> => {
  if (typeof window === "undefined") {
    throw new Error("Callback handling must run in the browser.");
  }

  const parsedUrl = new URL(url);
  const error = parsedUrl.searchParams.get("error");
  const errorDescription = parsedUrl.searchParams.get("error_description");

  if (error) {
    return {
      status: "error",
      message: errorDescription
        ? `${error}: ${decodeURIComponent(errorDescription)}`
        : error,
    };
  }

  const code = parsedUrl.searchParams.get("code");
  const state = parsedUrl.searchParams.get("state");

  if (!code || !state) {
    return {
      status: "error",
      message: "Missing authorization code or state.",
    };
  }

  const storedState = consumeState();
  if (!storedState || storedState !== state) {
    return {
      status: "error",
      message: "State mismatch. Please try signing in again.",
    };
  }

  const codeVerifier = consumeCodeVerifier();
  if (!codeVerifier) {
    return {
      status: "error",
      message: "PKCE verifier not found. Please restart the sign-in process.",
    };
  }

  const response = await fetch(buildTokenEndpointUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: buildTokenRequestBody(code, codeVerifier),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      status: "error",
      message: `Token exchange failed (${response.status}): ${
        text || response.statusText
      }`,
    };
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const tokens = parseTokenResponse(payload);
  storeTokens(tokens);
  clearPromptRetryStage();

  try {
    window.history.replaceState({}, document.title, parsedUrl.pathname);
  } catch {
    // noop
  }

  return {
    status: "success",
    message: "Signed in successfully.",
  };
};

export const signOut = (): void => {
  clearTokens();
  clearPromptRetryStage();
};

export { getTokens };
