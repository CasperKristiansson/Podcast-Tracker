/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_COGNITO_DOMAIN: string;
  readonly PUBLIC_COGNITO_CLIENT_ID: string;
  readonly PUBLIC_COGNITO_REDIRECT_URI: string;
  readonly PUBLIC_COGNITO_LOGOUT_URI?: string;
  readonly PUBLIC_APPSYNC_URL: string;
  readonly PUBLIC_APPSYNC_REALTIME_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
