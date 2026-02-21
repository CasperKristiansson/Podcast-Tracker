import { mkdtemp, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { SessionStore } from "../auth/session-store.js";

describe("session store", () => {
  it("writes and reads sessions", async () => {
    const dir = await mkdtemp(join(tmpdir(), "podcast-cli-test-"));
    const file = join(dir, "session.json");
    const store = new SessionStore(file);

    await store.save({
      accessToken: "a",
      idToken: "b",
      refreshToken: "c",
      tokenType: "Bearer",
      expiresAt: Date.now() + 1000,
      idTokenExpiresAt: Date.now() + 1000,
      issuedAt: Date.now(),
    });

    const loaded = await store.load();
    expect(loaded?.accessToken).toBe("a");

    const info = await stat(file);
    expect(info.mode & 0o777).toBe(0o600);
  });
});
