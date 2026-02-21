import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { CliConfig } from "./types.js";

// These are public, non-secret identifiers for the live environment.
const DEFAULT_APPSYNC_URL =
  "https://jsdj6tjxp5fsjfn5gpr6a7hamu.appsync-api.eu-north-1.amazonaws.com/graphql";
const DEFAULT_COGNITO_DOMAIN =
  "https://podcast-tracker-auth2.auth.eu-north-1.amazoncognito.com";
const DEFAULT_COGNITO_CLIENT_ID = "4n34nq1h9pnpo41dvcvg0c2uhu";
const DEFAULT_COGNITO_REDIRECT_URI = "http://localhost:4321/auth/callback";
const DEFAULT_COGNITO_LOGOUT_URI = "http://localhost:4321/";

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

const hydrateEnvFromFile = (filePath: string): void => {
  if (!existsSync(filePath)) {
    return;
  }

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (!key) {
      continue;
    }

    process.env[key] ??= value;
  }
};

const hydrateProcessEnv = (): void => {
  const explicitEnvFile = optional(process.env.PODCAST_TRACKER_ENV_FILE);
  if (explicitEnvFile) {
    hydrateEnvFromFile(resolve(process.cwd(), explicitEnvFile));
    return;
  }

  hydrateEnvFromFile(resolve(process.cwd(), ".env.local"));
  hydrateEnvFromFile(resolve(process.cwd(), ".env"));
};

export const loadConfig = (): CliConfig => {
  hydrateProcessEnv();

  const rawAppsyncUrl =
    optional(
      process.env.PODCAST_TRACKER_APPSYNC_URL ?? process.env.PUBLIC_APPSYNC_URL
    ) ?? DEFAULT_APPSYNC_URL;
  const appsyncConfigured = true;
  const appsyncUrl = ensureHttpsUrl(
    rawAppsyncUrl,
    "PODCAST_TRACKER_APPSYNC_URL"
  );

  const derivedCognitoDomain = deriveCognitoDomain() ?? DEFAULT_COGNITO_DOMAIN;
  const rawCognitoClientId =
    optional(
      process.env.PODCAST_TRACKER_COGNITO_CLIENT_ID ??
        process.env.PUBLIC_COGNITO_CLIENT_ID
    ) ?? DEFAULT_COGNITO_CLIENT_ID;
  const cognitoConfigured = true;

  const cognitoDomain = ensureHttpsUrl(
    derivedCognitoDomain,
    "PODCAST_TRACKER_COGNITO_DOMAIN"
  );

  const cognitoClientId = rawCognitoClientId;

  const cognitoRedirectUri = ensureHttpsUrl(
    process.env.PODCAST_TRACKER_COGNITO_REDIRECT_URI ??
      DEFAULT_COGNITO_REDIRECT_URI,
    "PODCAST_TRACKER_COGNITO_REDIRECT_URI"
  );

  const cognitoLogoutUri = ensureHttpsUrl(
    process.env.PODCAST_TRACKER_COGNITO_LOGOUT_URI ??
      DEFAULT_COGNITO_LOGOUT_URI,
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
