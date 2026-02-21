import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SessionRecord } from "../types.js";

export class SessionStore {
  constructor(private readonly sessionFile: string) {}

  async load(): Promise<SessionRecord | null> {
    try {
      const raw = await readFile(this.sessionFile, "utf8");
      const parsed = JSON.parse(raw) as SessionRecord;
      if (!parsed.accessToken || !parsed.idToken || !parsed.expiresAt) {
        return null;
      }
      return parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async save(session: SessionRecord): Promise<void> {
    const dir = dirname(this.sessionFile);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await writeFile(this.sessionFile, `${JSON.stringify(session, null, 2)}\n`, {
      mode: 0o600,
    });
    await chmod(this.sessionFile, 0o600);
  }

  async clear(): Promise<void> {
    await rm(this.sessionFile, { force: true });
  }
}
