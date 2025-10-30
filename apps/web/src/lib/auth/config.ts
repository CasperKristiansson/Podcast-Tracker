const ensure = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing required auth config key: ${key}`);
  }
  return value;
};

const {
  PUBLIC_COGNITO_DOMAIN,
  PUBLIC_COGNITO_CLIENT_ID,
  PUBLIC_COGNITO_REDIRECT_URI,
  PUBLIC_COGNITO_LOGOUT_URI,
  PUBLIC_COGNITO_USER_POOL_ID,
} = import.meta.env;

const ensureList = (value: string, key: string): string[] => {
  const raw = ensure(value, key);
  const entries = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (entries.length === 0) {
    throw new Error(`Missing required auth config key: ${key}`);
  }
  return entries;
};

const ensureFirst = (values: string[], key: string): string => {
  const [first] = values;
  if (typeof first !== "string" || first.length === 0) {
    throw new Error(`Missing required auth config key: ${key}`);
  }
  return first;
};

export const cognitoDomain = ensure(
  PUBLIC_COGNITO_DOMAIN,
  "PUBLIC_COGNITO_DOMAIN"
);
export const clientId = ensure(
  PUBLIC_COGNITO_CLIENT_ID,
  "PUBLIC_COGNITO_CLIENT_ID"
);
export const userPoolId = ensure(
  PUBLIC_COGNITO_USER_POOL_ID,
  "PUBLIC_COGNITO_USER_POOL_ID"
);

const rawRedirectUris = PUBLIC_COGNITO_REDIRECT_URI ?? "";
export const redirectUris: string[] = ensureList(
  rawRedirectUris,
  "PUBLIC_COGNITO_REDIRECT_URI"
);
export const redirectUri = ensureFirst(
  redirectUris,
  "PUBLIC_COGNITO_REDIRECT_URI"
);

const rawLogoutUris = PUBLIC_COGNITO_LOGOUT_URI ?? "";
export const logoutUris: string[] =
  rawLogoutUris.trim().length > 0
    ? ensureList(rawLogoutUris, "PUBLIC_COGNITO_LOGOUT_URI")
    : [redirectUri];
export const logoutUri = ensureFirst(logoutUris, "PUBLIC_COGNITO_LOGOUT_URI");
export const identityProvider = "Google";
