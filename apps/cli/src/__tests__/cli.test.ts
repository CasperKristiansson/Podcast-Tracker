import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../cli.js";
import type { CliRuntime } from "../runtime.js";

const createJwt = (payload: Record<string, unknown>): string => {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `x.${encoded}.y`;
};

interface CapturedIO {
  stdout: string[];
  stderr: string[];
}

const captureIo = (): CapturedIO => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  });

  vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  });

  return { stdout, stderr };
};

const createRuntime = (
  overrides?: Partial<CliRuntime>
): CliRuntime & {
  api: {
    myProfile: ReturnType<typeof vi.fn>;
    searchShows: ReturnType<typeof vi.fn>;
    showDetail: ReturnType<typeof vi.fn>;
  };
  sessionManager: {
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
  };
  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    verbose: ReturnType<typeof vi.fn>;
    verboseEnabled: boolean;
  };
} => {
  const runtime = {
    logger: {
      verboseEnabled: false,
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
    },
    sessionManager: {
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getSession: vi.fn().mockResolvedValue(null),
    },
    api: {
      myProfile: vi.fn(),
      searchShows: vi.fn(),
      showDetail: vi.fn(),
    },
    appsyncConfigured: true,
    ...overrides,
  };

  return runtime as unknown as CliRuntime & {
    api: {
      myProfile: ReturnType<typeof vi.fn>;
      searchShows: ReturnType<typeof vi.fn>;
      showDetail: ReturnType<typeof vi.fn>;
    };
    sessionManager: {
      login: ReturnType<typeof vi.fn>;
      logout: ReturnType<typeof vi.fn>;
      getSession: ReturnType<typeof vi.fn>;
    };
    logger: {
      info: ReturnType<typeof vi.fn>;
      warn: ReturnType<typeof vi.fn>;
      error: ReturnType<typeof vi.fn>;
      verbose: ReturnType<typeof vi.fn>;
      verboseEnabled: boolean;
    };
  };
};

describe("runCli", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints help output", async () => {
    const io = captureIo();
    const runtime = createRuntime();

    const code = await runCli(runtime, ["help"]);

    expect(code).toBe(0);
    expect(io.stdout.join("")).toContain("podcast-tracker auth login");
  });

  it("executes auth login", async () => {
    const runtime = createRuntime();

    const code = await runCli(runtime, ["auth", "login"]);

    expect(code).toBe(0);
    expect(runtime.sessionManager.login).toHaveBeenCalledTimes(1);
    expect(runtime.logger.info).toHaveBeenCalledWith("Signed in successfully.");
  });

  it("reports not authenticated in auth status", async () => {
    const io = captureIo();
    const runtime = createRuntime();

    const code = await runCli(runtime, ["auth", "status"]);

    expect(code).toBe(1);
    expect(io.stdout.join("")).toContain("Not authenticated.");
  });

  it("prints user information in auth status when session exists", async () => {
    const io = captureIo();
    const runtime = createRuntime();

    runtime.sessionManager.getSession.mockResolvedValue({
      idToken: createJwt({ sub: "user-123", email: "user@example.com" }),
      accessToken: "token",
      refreshToken: "refresh",
      tokenType: "Bearer",
      expiresAt: Date.now() + 3_600_000,
      idTokenExpiresAt: Date.now() + 3_600_000,
      issuedAt: Date.now(),
    });

    const code = await runCli(runtime, ["auth", "status"]);

    expect(code).toBe(0);
    const output = io.stdout.join("");
    expect(output).toContain("Authenticated: yes");
    expect(output).toContain("User: user@example.com");
    expect(output).toContain("Subject: user-123");
  });

  it("runs smoke flow against api", async () => {
    const io = captureIo();
    const runtime = createRuntime();

    runtime.api.myProfile.mockResolvedValue({
      stats: {
        totalShows: 2,
        episodesCompleted: 5,
        episodesInProgress: 1,
      },
      spotlight: [],
      shows: [
        {
          showId: "show-1",
          title: "Show 1",
          publisher: "Pub",
          image: "",
          addedAt: new Date().toISOString(),
          totalEpisodes: 10,
          completedEpisodes: 2,
          inProgressEpisodes: 0,
          unlistenedEpisodes: 8,
          subscriptionSyncedAt: null,
          ratingStars: null,
          ratingReview: null,
          ratingUpdatedAt: null,
          droppedAt: null,
        },
      ],
    });

    runtime.api.searchShows.mockResolvedValue([]);
    runtime.api.showDetail.mockResolvedValue({
      show: {
        id: "show-1",
        title: "Show 1",
      },
      episodes: {
        items: [],
      },
    });

    const code = await runCli(runtime, ["smoke"]);

    expect(code).toBe(0);
    expect(runtime.api.myProfile).toHaveBeenCalledTimes(1);
    expect(runtime.api.searchShows).toHaveBeenCalledWith("podcast", 3, 0);
    expect(runtime.api.showDetail).toHaveBeenCalledWith("show-1", 5);
    expect(io.stdout.join("")).toContain(
      "Profile loaded: 2 shows, 5 completed episodes."
    );
  });

  it("fails smoke when appsync is not configured", async () => {
    const runtime = createRuntime({ appsyncConfigured: false });

    await expect(runCli(runtime, ["smoke"])).rejects.toThrow(
      "Set PODCAST_TRACKER_APPSYNC_URL before running smoke or TUI commands."
    );
  });

  it("fails on unsupported auth command", async () => {
    const runtime = createRuntime();

    await expect(runCli(runtime, ["auth", "unknown"])).rejects.toThrow(
      "Unsupported auth command: unknown"
    );
  });

  it("falls back to non-tty message for tui launch", async () => {
    const io = captureIo();
    const runtime = createRuntime();

    const code = await runCli(runtime, []);

    expect(code).toBe(1);
    expect(io.stderr.join("")).toContain("Interactive TUI requires a TTY");
  });
});
