import { homedir } from "node:os";
import { join } from "node:path";
import type { CliConfig } from "./types.js";

const optional = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const ensureHttpsUrl = (value: string, key: string): string => {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${key} must start with http:// or https://`);
  }
  return parsed.toString().replace(/\/$/, "");
};

const deriveCognitoDomain = (): string | null => {
  const explicit = optional(
    process.env.PODCAST_TRACKER_COGNITO_DOMAIN ??
      process.env.PUBLIC_COGNITO_DOMAIN
  );
  if (explicit) {
    return explicit;
  }

  const prefix = optional(process.env.COGNITO_DOMAIN_PREFIX);
  const poolId = optional(process.env.COGNITO_USER_POOL_ID);
  if (!prefix || !poolId) {
    return null;
  }

  const region = poolId.split("_")[0];
  if (!region) {
    return null;
  }

  return `https://${prefix}.auth.${region}.amazoncognito.com`;
};

export const loadConfig = (): CliConfig => {
  const rawAppsyncUrl = optional(
    process.env.PODCAST_TRACKER_APPSYNC_URL ?? process.env.PUBLIC_APPSYNC_URL
  );
  const appsyncConfigured = Boolean(rawAppsyncUrl);
  const appsyncUrl = ensureHttpsUrl(
    rawAppsyncUrl ?? "http://127.0.0.1/disabled-appsync",
    "PODCAST_TRACKER_APPSYNC_URL"
  );

  const derivedCognitoDomain = deriveCognitoDomain();
  const rawCognitoClientId = optional(
    process.env.PODCAST_TRACKER_COGNITO_CLIENT_ID ??
      process.env.PUBLIC_COGNITO_CLIENT_ID
  );
  const cognitoConfigured = Boolean(derivedCognitoDomain && rawCognitoClientId);

  const cognitoDomain = ensureHttpsUrl(
    derivedCognitoDomain ?? "http://127.0.0.1/disabled-cognito",
    "PODCAST_TRACKER_COGNITO_DOMAIN"
  );

  const cognitoClientId = rawCognitoClientId ?? "missing-client-id";

  const cognitoRedirectUri = ensureHttpsUrl(
    process.env.PODCAST_TRACKER_COGNITO_REDIRECT_URI ??
      "http://localhost:4321/auth/callback",
    "PODCAST_TRACKER_COGNITO_REDIRECT_URI"
  );

  const cognitoLogoutUri = ensureHttpsUrl(
    process.env.PODCAST_TRACKER_COGNITO_LOGOUT_URI ?? "http://localhost:4321/",
    "PODCAST_TRACKER_COGNITO_LOGOUT_URI"
  );

  const sessionFile =
    optional(process.env.PODCAST_TRACKER_SESSION_FILE) ??
    join(homedir(), ".podcast-tracker", "session.json");

  const oauthScopes =
    optional(process.env.PODCAST_TRACKER_OAUTH_SCOPES) ??
    "openid email profile";

  const authIdentityProvider =
    optional(process.env.PODCAST_TRACKER_IDENTITY_PROVIDER) ?? "Google";

  return {
    appsyncUrl,
    appsyncConfigured,
    cognitoDomain,
    cognitoClientId,
    cognitoConfigured,
    cognitoRedirectUri,
    cognitoLogoutUri,
    oauthScopes,
    authIdentityProvider,
    sessionFile,
  };
};
