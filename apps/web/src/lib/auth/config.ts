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
} = import.meta.env;

export const cognitoDomain = ensure(
  PUBLIC_COGNITO_DOMAIN,
  "PUBLIC_COGNITO_DOMAIN",
);
export const clientId = ensure(
  PUBLIC_COGNITO_CLIENT_ID,
  "PUBLIC_COGNITO_CLIENT_ID",
);
export const redirectUri = ensure(
  PUBLIC_COGNITO_REDIRECT_URI,
  "PUBLIC_COGNITO_REDIRECT_URI",
);
export const logoutUri = PUBLIC_COGNITO_LOGOUT_URI ?? redirectUri;
export const identityProvider = "Google";
