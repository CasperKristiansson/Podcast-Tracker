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

  it("marks appsync and cognito as unconfigured when env is absent", () => {
    delete process.env.PODCAST_TRACKER_APPSYNC_URL;
    delete process.env.PUBLIC_APPSYNC_URL;
    delete process.env.PODCAST_TRACKER_COGNITO_DOMAIN;
    delete process.env.PODCAST_TRACKER_COGNITO_CLIENT_ID;
    delete process.env.PUBLIC_COGNITO_CLIENT_ID;
    delete process.env.COGNITO_DOMAIN_PREFIX;
    delete process.env.COGNITO_USER_POOL_ID;

    const config = loadConfig();

    expect(config.appsyncConfigured).toBe(false);
    expect(config.cognitoConfigured).toBe(false);
  });

  it("marks configs as configured when required values exist", () => {
    process.env.PODCAST_TRACKER_APPSYNC_URL = "https://example.appsync-api.aws";
    process.env.PODCAST_TRACKER_COGNITO_DOMAIN =
      "https://example.auth.eu-north-1.amazoncognito.com";
    process.env.PODCAST_TRACKER_COGNITO_CLIENT_ID = "client-123";

    const config = loadConfig();

    expect(config.appsyncConfigured).toBe(true);
    expect(config.cognitoConfigured).toBe(true);
    expect(config.appsyncUrl).toContain("https://example.appsync-api.aws");
  });
});
