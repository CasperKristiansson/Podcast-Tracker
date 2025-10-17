import { afterEach, beforeEach, vi } from "vitest";
import { resetAwsMocks } from "./packages/lambdas/spotifyProxy/test/awsMocks";

const defaultEnv = {
  TABLE_NAME: "test-table",
  SPOTIFY_CLIENT_ID_PARAM: "/test/spotify/client-id",
  SPOTIFY_CLIENT_SECRET_PARAM: "/test/spotify/client-secret",
} as const;

function applyDefaultEnv(): void {
  process.env.TABLE_NAME = defaultEnv.TABLE_NAME;
  process.env.SPOTIFY_CLIENT_ID_PARAM = defaultEnv.SPOTIFY_CLIENT_ID_PARAM;
  process.env.SPOTIFY_CLIENT_SECRET_PARAM =
    defaultEnv.SPOTIFY_CLIENT_SECRET_PARAM;
}

applyDefaultEnv();

beforeEach(() => {
  applyDefaultEnv();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
  resetAwsMocks();
});
