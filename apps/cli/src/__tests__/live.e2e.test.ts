import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { createRuntime } from "../runtime.js";

const WORKSPACE_DIR = process.cwd();
const REPO_ROOT = resolve(WORKSPACE_DIR, "../..");
const CLI_ENTRY = resolve(REPO_ROOT, "apps/cli/dist/apps/cli/src/index.js");
const ENV_LOCAL_PATH = resolve(REPO_ROOT, ".env.local");

const REQUIRED_ENV_KEYS = [
  "PODCAST_TRACKER_APPSYNC_URL",
  "PODCAST_TRACKER_COGNITO_DOMAIN",
  "PODCAST_TRACKER_COGNITO_CLIENT_ID",
  "PODCAST_TRACKER_COGNITO_REDIRECT_URI",
  "PODCAST_TRACKER_COGNITO_LOGOUT_URI",
] as const;

const parseDotEnv = (raw: string): Record<string, string> => {
  const parsed: Record<string, string> = {};

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

    parsed[key] = value;
  }

  return parsed;
};

const hydrateEnvFromDotLocal = (): void => {
  if (!existsSync(ENV_LOCAL_PATH)) {
    throw new Error(
      `Missing .env.local at ${ENV_LOCAL_PATH}. Generate it before running live E2E.`
    );
  }

  const parsed = parseDotEnv(readFileSync(ENV_LOCAL_PATH, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] ??= value;
  }

  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars for live E2E: ${missing.join(", ")}. Check .env.local.`
    );
  }
};

const resolveSessionPath = (): string => {
  const configured = process.env.PODCAST_TRACKER_SESSION_FILE;
  if (configured && configured.trim().length > 0) {
    return configured;
  }

  const home = process.env.HOME;
  if (!home) {
    throw new Error(
      "HOME is not set; cannot resolve default session file path."
    );
  }

  return resolve(home, ".podcast-tracker", "session.json");
};

const runCli = (
  args: string[]
): { status: number | null; stdout: string; stderr: string } => {
  const command = spawnSync("node", [CLI_ENTRY, ...args], {
    cwd: REPO_ROOT,
    env: process.env,
    encoding: "utf8",
  });

  return {
    status: command.status,
    stdout: command.stdout,
    stderr: command.stderr,
  };
};

describe("live e2e", () => {
  beforeAll(() => {
    hydrateEnvFromDotLocal();

    if (!existsSync(CLI_ENTRY)) {
      throw new Error(
        `CLI build artifact missing at ${CLI_ENTRY}. Run npm run cli:build first.`
      );
    }

    const sessionPath = resolveSessionPath();
    if (!existsSync(sessionPath)) {
      throw new Error(
        `Session file missing at ${sessionPath}. Run podcast-tracker auth login first.`
      );
    }
  });

  it("auth status confirms authenticated session", () => {
    const result = runCli(["auth", "status"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Authenticated: yes");
  });

  it("smoke command succeeds against live backend", () => {
    const result = runCli(["smoke"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Profile loaded:");
    expect(result.stdout).toContain("Search loaded:");
  }, 90_000);

  it("api layer can load profile, search, and show detail", async () => {
    const runtime = createRuntime(false);
    const profile = await runtime.api.myProfile();
    expect(typeof profile.stats.totalShows).toBe("number");

    const results = await runtime.api.searchShows("podcast", 5, 0);
    expect(Array.isArray(results)).toBe(true);

    const firstShowId = profile.shows[0]?.showId;
    if (firstShowId) {
      const detail = await runtime.api.showDetail(firstShowId, 5);
      expect(detail.show.id).toBe(firstShowId);
      expect(Array.isArray(detail.episodes.items)).toBe(true);
    }
  }, 90_000);
});
