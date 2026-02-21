import { decodeJwtPayload } from "./auth/jwt.js";
import type { CliRuntime } from "./runtime.js";

const printHelp = (): void => {
  process.stdout.write(`Podcast Tracker CLI\n\n`);
  process.stdout.write(`Usage:\n`);
  process.stdout.write(`  podcast-tracker [--verbose]\n`);
  process.stdout.write(`  podcast-tracker auth login\n`);
  process.stdout.write(`  podcast-tracker auth status\n`);
  process.stdout.write(`  podcast-tracker auth logout\n`);
  process.stdout.write(`  podcast-tracker smoke\n\n`);
  process.stdout.write(`Keyboard in TUI:\n`);
  process.stdout.write(
    `  j/k move · Enter open/select · / search · ? help · q back/quit\n`
  );
};

const formatExpiry = (epochMs: number): string => {
  if (!Number.isFinite(epochMs) || epochMs <= 0) {
    return "-";
  }
  return new Date(epochMs).toLocaleString();
};

const runAuthLogin = async (runtime: CliRuntime): Promise<number> => {
  await runtime.sessionManager.login();
  runtime.logger.info("Signed in successfully.");
  return 0;
};

const runAuthStatus = async (runtime: CliRuntime): Promise<number> => {
  const session = await runtime.sessionManager.getSession();
  if (!session) {
    process.stdout.write("Not authenticated.\n");
    return 1;
  }

  const payload = decodeJwtPayload(session.idToken);
  const subject = typeof payload.sub === "string" ? payload.sub : "-";
  const email = typeof payload.email === "string" ? payload.email : "-";

  process.stdout.write(`Authenticated: yes\n`);
  process.stdout.write(`User: ${email}\n`);
  process.stdout.write(`Subject: ${subject}\n`);
  process.stdout.write(
    `Access token expiry: ${formatExpiry(session.expiresAt)}\n`
  );
  process.stdout.write(
    `ID token expiry: ${formatExpiry(session.idTokenExpiresAt)}\n`
  );
  return 0;
};

const runAuthLogout = async (runtime: CliRuntime): Promise<number> => {
  await runtime.sessionManager.logout();
  runtime.logger.info("Signed out and local session cleared.");
  return 0;
};

const runSmoke = async (runtime: CliRuntime): Promise<number> => {
  if (!runtime.appsyncConfigured) {
    throw new Error(
      "Set PODCAST_TRACKER_APPSYNC_URL before running smoke or TUI commands."
    );
  }

  const profile = await runtime.api.myProfile();
  process.stdout.write(
    `Profile loaded: ${profile.stats.totalShows} shows, ${profile.stats.episodesCompleted} completed episodes.\n`
  );

  const search = await runtime.api.searchShows("podcast", 3, 0);
  process.stdout.write(`Search loaded: ${search.length} items.\n`);

  const firstShow = profile.shows[0];
  if (firstShow?.showId) {
    const detail = await runtime.api.showDetail(firstShow.showId, 5);
    process.stdout.write(
      `Show detail loaded: ${detail.show.title ?? firstShow.title} (${detail.episodes.items.length} episodes in page).\n`
    );
  }

  return 0;
};

const runTui = async (runtime: CliRuntime): Promise<number> => {
  if (!runtime.appsyncConfigured) {
    throw new Error(
      "Set PODCAST_TRACKER_APPSYNC_URL before launching the terminal UI."
    );
  }

  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    process.stderr.write(
      "Interactive TUI requires a TTY. Use `podcast-tracker auth status` or run in a terminal.\n"
    );
    return 1;
  }

  const [{ render }, { createElement }, { PodcastTrackerApp }] =
    await Promise.all([
      import("ink"),
      import("react"),
      import("./tui/PodcastTrackerApp.js"),
    ]).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `CLI UI dependencies are missing. Run npm install and retry. (${message})`
      );
    });

  const app = render(
    createElement(PodcastTrackerApp, {
      api: runtime.api,
      sessionManager: runtime.sessionManager,
    })
  );
  await app.waitUntilExit();
  return 0;
};

export const runCli = async (
  runtime: CliRuntime,
  args: string[]
): Promise<number> => {
  const normalized = args.filter((arg) => arg !== "--verbose");

  if (normalized.length === 0) {
    return runTui(runtime);
  }

  if (
    normalized[0] === "help" ||
    normalized[0] === "--help" ||
    normalized[0] === "-h"
  ) {
    printHelp();
    return 0;
  }

  if (normalized[0] === "auth") {
    const action = normalized[1] ?? "status";
    if (action === "login") {
      return runAuthLogin(runtime);
    }
    if (action === "status") {
      return runAuthStatus(runtime);
    }
    if (action === "logout") {
      return runAuthLogout(runtime);
    }
    throw new Error(`Unsupported auth command: ${action}`);
  }

  if (normalized[0] === "smoke") {
    return runSmoke(runtime);
  }

  return runTui(runtime);
};
