import type { CliConfig, OAuthTokens, SessionRecord } from "../types.js";
import type { Logger } from "../logger.js";
import { waitForOAuthCallback } from "./callback-server.js";
import { createChallenge, createState, createVerifier } from "./pkce.js";
import { getJwtExpiry, isApprovedUser } from "./jwt.js";
import { openUrl } from "../utils/open-url.js";

interface TokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

const formEncode = (entries: Record<string, string>): string => {
  const params = new URLSearchParams();
  Object.entries(entries).forEach(([key, value]) => {
    params.set(key, value);
  });
  return params.toString();
};

const toSession = (tokens: OAuthTokens): SessionRecord => {
  const now = Date.now();
  const expiresAt = now + tokens.expiresIn * 1000;
  const idTokenExpiresAt = getJwtExpiry(tokens.idToken);

  return {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    refreshToken: tokens.refreshToken,
    tokenType: tokens.tokenType,
    expiresAt,
    idTokenExpiresAt,
    issuedAt: now,
  };
};

const mapTokenResponse = (value: TokenResponse): OAuthTokens => {
  if (value.error) {
    throw new Error(value.error_description ?? value.error);
  }

  if (!value.access_token || !value.id_token) {
    throw new Error("Token endpoint did not return expected tokens.");
  }

  return {
    accessToken: value.access_token,
    idToken: value.id_token,
    refreshToken: value.refresh_token,
    tokenType: value.token_type ?? "Bearer",
    expiresIn:
      typeof value.expires_in === "number" && Number.isFinite(value.expires_in)
        ? Math.max(1, Math.trunc(value.expires_in))
        : 3600,
  };
};

export class AuthService {
  private readonly tokenUrl: string;
  private readonly authorizeUrl: string;
  private readonly logoutUrl: string;

  constructor(
    private readonly config: CliConfig,
    private readonly logger: Logger
  ) {
    this.tokenUrl = `${config.cognitoDomain}/oauth2/token`;
    this.authorizeUrl = `${config.cognitoDomain}/oauth2/authorize`;
    this.logoutUrl = `${config.cognitoDomain}/logout`;
  }

  private ensureCognitoConfigured(): void {
    if (!this.config.cognitoConfigured) {
      throw new Error(
        "Cognito auth is not configured. Set PODCAST_TRACKER_COGNITO_DOMAIN and PODCAST_TRACKER_COGNITO_CLIENT_ID."
      );
    }
  }

  async login(): Promise<SessionRecord> {
    this.ensureCognitoConfigured();

    const state = createState();
    const verifier = createVerifier();
    const challenge = createChallenge(verifier);

    const authorize = new URL(this.authorizeUrl);
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("client_id", this.config.cognitoClientId);
    authorize.searchParams.set("redirect_uri", this.config.cognitoRedirectUri);
    authorize.searchParams.set("scope", this.config.oauthScopes);
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("code_challenge_method", "S256");
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set(
      "identity_provider",
      this.config.authIdentityProvider
    );

    this.logger.info("Opening browser for sign-in...");

    const callbackPromise = waitForOAuthCallback(
      this.config.cognitoRedirectUri
    );
    await openUrl(authorize.toString());

    const callback = await callbackPromise;
    if (callback.state !== state) {
      throw new Error("OAuth state mismatch. Please retry sign-in.");
    }

    const response = await this.exchangeCode(callback.code, verifier);
    if (!isApprovedUser(response.idToken)) {
      throw new Error(
        "Your account is pending approval. Ask an admin to approve your access."
      );
    }

    return toSession(response);
  }

  async refresh(refreshToken: string): Promise<SessionRecord> {
    this.ensureCognitoConfigured();

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode({
        grant_type: "refresh_token",
        client_id: this.config.cognitoClientId,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Refresh token request failed (${response.status}): ${body}`
      );
    }

    const parsed = (await response.json()) as TokenResponse;
    const mapped = mapTokenResponse({
      ...parsed,
      refresh_token: parsed.refresh_token ?? refreshToken,
    });

    if (!isApprovedUser(mapped.idToken)) {
      throw new Error(
        "Your account is pending approval. Ask an admin to approve your access."
      );
    }

    return toSession(mapped);
  }

  async logout(idToken: string | null): Promise<void> {
    if (!idToken) {
      return;
    }
    this.ensureCognitoConfigured();

    const logout = new URL(this.logoutUrl);
    logout.searchParams.set("client_id", this.config.cognitoClientId);
    logout.searchParams.set("logout_uri", this.config.cognitoLogoutUri);

    try {
      await openUrl(logout.toString());
    } catch (error) {
      this.logger.verbose(
        `Failed to open logout URL: ${(error as Error).message}`
      );
    }
  }

  private async exchangeCode(
    code: string,
    verifier: string
  ): Promise<OAuthTokens> {
    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formEncode({
        grant_type: "authorization_code",
        client_id: this.config.cognitoClientId,
        code,
        redirect_uri: this.config.cognitoRedirectUri,
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${body}`);
    }

    const parsed = (await response.json()) as TokenResponse;
    return mapTokenResponse(parsed);
  }
}
