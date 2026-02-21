import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";

const ORIGINAL_ENV = { ...process.env };

const resetEnv = (): void => {
  Object.keys(process.env).forEach((key) => {
    delete process.env[key];
  });
  Object.assign(process.env, ORIGINAL_ENV);
};

describe("loadConfig", () => {
  afterEach(() => {
    resetEnv();
  });

  it("uses shipped production defaults when env is absent", () => {
    delete process.env.PODCAST_TRACKER_APPSYNC_URL;
    delete process.env.PUBLIC_APPSYNC_URL;
    delete process.env.PODCAST_TRACKER_COGNITO_DOMAIN;
    delete process.env.PODCAST_TRACKER_COGNITO_CLIENT_ID;
    delete process.env.PUBLIC_COGNITO_CLIENT_ID;
    delete process.env.COGNITO_DOMAIN_PREFIX;
    delete process.env.COGNITO_USER_POOL_ID;

    const config = loadConfig();

    expect(config.appsyncConfigured).toBe(true);
    expect(config.cognitoConfigured).toBe(true);
    expect(config.appsyncUrl).toBe(
      "https://jsdj6tjxp5fsjfn5gpr6a7hamu.appsync-api.eu-north-1.amazonaws.com/graphql"
    );
    expect(config.cognitoDomain).toBe(
      "https://podcast-tracker-auth2.auth.eu-north-1.amazoncognito.com"
    );
    expect(config.cognitoClientId).toBe("4n34nq1h9pnpo41dvcvg0c2uhu");
  });

  it("allows overriding shipped defaults via env", () => {
    process.env.PODCAST_TRACKER_APPSYNC_URL = "https://example.appsync-api.aws";
    process.env.PODCAST_TRACKER_COGNITO_DOMAIN =
      "https://example.auth.eu-north-1.amazoncognito.com";
    process.env.PODCAST_TRACKER_COGNITO_CLIENT_ID = "client-123";

    const config = loadConfig();

    expect(config.appsyncConfigured).toBe(true);
    expect(config.cognitoConfigured).toBe(true);
    expect(config.appsyncUrl).toContain("https://example.appsync-api.aws");
    expect(config.cognitoDomain).toBe(
      "https://example.auth.eu-north-1.amazoncognito.com"
    );
    expect(config.cognitoClientId).toBe("client-123");
  });
});
