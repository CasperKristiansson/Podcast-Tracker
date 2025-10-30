/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly PUBLIC_COGNITO_DOMAIN: string;
  readonly PUBLIC_COGNITO_CLIENT_ID: string;
  readonly PUBLIC_COGNITO_REDIRECT_URI: string;
  readonly PUBLIC_COGNITO_LOGOUT_URI?: string;
  readonly PUBLIC_COGNITO_USER_POOL_ID: string;
  readonly PUBLIC_APPSYNC_URL: string;
  readonly PUBLIC_APPSYNC_REALTIME_URL: string;
  readonly PUBLIC_ENABLE_GRAPHQL_LOGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
