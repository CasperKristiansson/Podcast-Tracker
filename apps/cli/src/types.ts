export interface CliConfig {
  appsyncUrl: string;
  appsyncConfigured: boolean;
  cognitoDomain: string;
  cognitoClientId: string;
  cognitoConfigured: boolean;
  cognitoRedirectUri: string;
  cognitoLogoutUri: string;
  oauthScopes: string;
  authIdentityProvider: string;
  sessionFile: string;
}

export interface OAuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
}

export interface SessionRecord {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
  idTokenExpiresAt: number;
  issuedAt: number;
}

export interface JwtPayload {
  exp?: number;
  [key: string]: unknown;
}
