import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

const SEARCH_TERMS = [
  "podcast",
  "news",
  "tech",
  "science",
  "history",
  "music",
  "comedy",
] as const;

interface CliResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

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
  args: string[],
  envOverrides?: Record<string, string>
): CliResult => {
  const command = spawnSync("node", [CLI_ENTRY, ...args], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...(envOverrides ?? {}),
    },
    encoding: "utf8",
    timeout: 120_000,
  });

  return {
    status: command.status,
    stdout: command.stdout,
    stderr: command.stderr,
  };
};

const loadSessionJson = (): {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
  idTokenExpiresAt: number;
  issuedAt: number;
} => {
  const sessionPath = resolveSessionPath();
  const raw = readFileSync(sessionPath, "utf8");
  return JSON.parse(raw) as {
    accessToken: string;
    idToken: string;
    refreshToken?: string;
    tokenType: string;
    expiresAt: number;
    idTokenExpiresAt: number;
    issuedAt: number;
  };
};

const findNotSubscribedShow = async (
  runtime: ReturnType<typeof createRuntime>
): Promise<{
  id: string;
  title: string;
  publisher: string;
  image?: string | null;
  totalEpisodes?: number | null;
}> => {
  for (const term of SEARCH_TERMS) {
    const results = await runtime.api.searchShows(term, 20, 0);
    const candidate = results.find(
      (show) => !show.isSubscribed && typeof show.id === "string"
    );
    if (candidate) {
      return {
        id: candidate.id,
        title: candidate.title,
        publisher: candidate.publisher,
        image: candidate.image,
        totalEpisodes: candidate.totalEpisodes,
      };
    }
  }

  throw new Error(
    "Unable to find any unsubscribed show for E2E mutation tests."
  );
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
  }, 120_000);

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
  }, 120_000);

  it("subscribe -> verify -> unsubscribe roundtrip works", async () => {
    const runtime = createRuntime(false);
    const candidate = await findNotSubscribedShow(runtime);

    try {
      await runtime.api.subscribe(candidate);
      const afterSubscribe = await runtime.api.myProfile();
      expect(
        afterSubscribe.shows.some((show) => show.showId === candidate.id)
      ).toBe(true);
    } finally {
      await runtime.api.unsubscribe(candidate.id);
    }

    const afterUnsubscribe = await runtime.api.myProfile();
    expect(
      afterUnsubscribe.shows.some((show) => show.showId === candidate.id)
    ).toBe(false);
  }, 120_000);

  it("mark progress toggles and reverts", async () => {
    const runtime = createRuntime(false);
    const profile = await runtime.api.myProfile();
    const activeShow = profile.shows.find((show) => !show.droppedAt);

    if (!activeShow) {
      expect(true).toBe(true);
      return;
    }

    const detail = await runtime.api.showDetail(activeShow.showId, 50);
    const episode = detail.episodes.items.find(
      (entry): entry is NonNullable<(typeof detail.episodes.items)[number]> =>
        Boolean(entry?.episodeId)
    );

    if (!episode?.episodeId) {
      expect(true).toBe(true);
      return;
    }

    const existing = detail.progress.find(
      (progress) => progress.episodeId === episode.episodeId
    );
    const beforeCompleted = Boolean(existing?.completed);

    await runtime.api.markEpisodeProgress(
      activeShow.showId,
      episode.episodeId,
      !beforeCompleted
    );

    const afterToggle = await runtime.api.showDetail(
      activeShow.showId,
      50,
      undefined,
      [episode.episodeId]
    );
    const toggled = afterToggle.progress.find(
      (progress) => progress.episodeId === episode.episodeId
    );
    expect(Boolean(toggled?.completed)).toBe(!beforeCompleted);

    await runtime.api.markEpisodeProgress(
      activeShow.showId,
      episode.episodeId,
      beforeCompleted
    );

    const afterRevert = await runtime.api.showDetail(
      activeShow.showId,
      50,
      undefined,
      [episode.episodeId]
    );
    const reverted = afterRevert.progress.find(
      (progress) => progress.episodeId === episode.episodeId
    );
    expect(Boolean(reverted?.completed)).toBe(beforeCompleted);
  }, 120_000);

  it("mark next episode complete mutates and can be reverted", async () => {
    const runtime = createRuntime(false);
    const profile = await runtime.api.myProfile();
    const candidate = profile.shows.find(
      (show) => !show.droppedAt && show.unlistenedEpisodes > 0
    );

    if (!candidate) {
      expect(true).toBe(true);
      return;
    }

    const before = await runtime.api.showDetail(candidate.showId, 50);
    const beforeCompleted = new Set(
      before.progress
        .filter((entry) => entry.completed)
        .map((entry) => entry.episodeId)
    );

    try {
      await runtime.api.markNextEpisodeComplete(candidate.showId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("up to date")) {
        expect(true).toBe(true);
        return;
      }
      throw error;
    }

    const after = await runtime.api.showDetail(candidate.showId, 50);
    const afterCompleted = new Set(
      after.progress
        .filter((entry) => entry.completed)
        .map((entry) => entry.episodeId)
    );

    const newlyCompleted = Array.from(afterCompleted).filter(
      (episodeId) => !beforeCompleted.has(episodeId)
    );

    expect(newlyCompleted.length).toBeGreaterThan(0);

    for (const episodeId of newlyCompleted) {
      await runtime.api.markEpisodeProgress(candidate.showId, episodeId, false);
    }

    const reverted = await runtime.api.showDetail(
      candidate.showId,
      50,
      undefined,
      newlyCompleted
    );
    const revertedCompleted = new Set(
      reverted.progress
        .filter((entry) => entry.completed)
        .map((entry) => entry.episodeId)
    );

    for (const episodeId of newlyCompleted) {
      expect(revertedCompleted.has(episodeId)).toBe(false);
    }
  }, 120_000);

  it("rate show roundtrip works on temporary subscription", async () => {
    const runtime = createRuntime(false);
    const candidate = await findNotSubscribedShow(runtime);
    const review = `e2e-rating-${Date.now()}`;

    try {
      await runtime.api.subscribe(candidate);
      await runtime.api.rateShow(candidate.id, 4, review);

      const detail = await runtime.api.showDetail(candidate.id, 5);
      expect(detail.subscription?.ratingStars).toBe(4);
      expect(detail.subscription?.ratingReview ?? "").toContain(review);
    } finally {
      await runtime.api.unsubscribe(candidate.id);
    }
  }, 120_000);

  it("drop show flow works and cleanup unsubscribe removes it", async () => {
    const runtime = createRuntime(false);
    const candidate = await findNotSubscribedShow(runtime);

    try {
      await runtime.api.subscribe(candidate);
      await runtime.api.dropShow(candidate.id);

      const detail = await runtime.api.showDetail(candidate.id, 5);
      expect(typeof detail.subscription?.droppedAt).toBe("string");
      expect((detail.subscription?.droppedAt ?? "").length).toBeGreaterThan(0);
    } finally {
      await runtime.api.unsubscribe(candidate.id);
    }

    const profile = await runtime.api.myProfile();
    expect(profile.shows.some((show) => show.showId === candidate.id)).toBe(
      false
    );
  }, 120_000);

  it("expired local session triggers refresh token flow", () => {
    const sessionPath = resolveSessionPath();
    const originalRaw = readFileSync(sessionPath, "utf8");

    try {
      const session = JSON.parse(originalRaw) as {
        refreshToken?: string;
        expiresAt: number;
        idTokenExpiresAt: number;
      };

      if (!session.refreshToken || session.refreshToken.trim().length === 0) {
        expect(true).toBe(true);
        return;
      }

      const expired = {
        ...JSON.parse(originalRaw),
        expiresAt: Date.now() - 60_000,
        idTokenExpiresAt: Date.now() - 60_000,
      };
      writeFileSync(sessionPath, `${JSON.stringify(expired, null, 2)}\n`);

      const smoke = runCli(["smoke"]);
      expect(smoke.status).toBe(0);

      const refreshed = loadSessionJson();
      expect(refreshed.expiresAt).toBeGreaterThan(Date.now());
      expect(refreshed.idTokenExpiresAt).toBeGreaterThan(Date.now());
    } finally {
      writeFileSync(sessionPath, originalRaw);
    }
  }, 120_000);

  it("auth failure path is explicit with missing session file", () => {
    const tempDir = mkdtempSync(resolve(tmpdir(), "podcast-cli-authfail-"));
    const fakeSessionPath = resolve(tempDir, "missing-session.json");

    try {
      const statusResult = runCli(["auth", "status"], {
        PODCAST_TRACKER_SESSION_FILE: fakeSessionPath,
      });
      expect(statusResult.status).toBe(1);
      expect(statusResult.stdout).toContain("Not authenticated.");

      const smokeResult = runCli(["smoke"], {
        PODCAST_TRACKER_SESSION_FILE: fakeSessionPath,
      });
      expect(smokeResult.status).toBe(1);
      expect(smokeResult.stderr).toContain(
        "Not authenticated. Run: podcast-tracker auth login"
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 120_000);

  it("non-tty launch returns actionable fallback", () => {
    const result = runCli([]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Interactive TUI requires a TTY");
  }, 120_000);
});
