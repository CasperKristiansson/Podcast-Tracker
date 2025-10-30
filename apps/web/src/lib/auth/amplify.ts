import { Amplify, type ResourcesConfig } from "aws-amplify";
import {
  clientId,
  cognitoDomain,
  logoutUris,
  redirectUris,
  userPoolId,
} from "./config";

let configured = false;

const buildConfig = (): ResourcesConfig => {
  return {
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId: clientId,
        loginWith: {
          oauth: {
            domain: cognitoDomain,
            scopes: ["openid", "email", "profile"],
            redirectSignIn: redirectUris,
            redirectSignOut: logoutUris,
            responseType: "code",
            providers: ["Google"],
          },
        },
      },
    },
  };
};

export const ensureAmplifyConfigured = (): void => {
  if (configured) {
    return;
  }

  Amplify.configure(buildConfig());
  configured = true;
};
