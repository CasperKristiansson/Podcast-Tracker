import type { SessionRecord } from "../types.js";
import type { Logger } from "../logger.js";
import { AuthService } from "./auth-service.js";
import { SessionStore } from "./session-store.js";

const REFRESH_SKEW_MS = 45_000;

export class SessionManager {
  private cachedSession: SessionRecord | null = null;
  private refreshPromise: Promise<SessionRecord | null> | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly store: SessionStore,
    private readonly logger: Logger
  ) {}

  async getSession(): Promise<SessionRecord | null> {
    if (this.cachedSession) {
      return this.cachedSession;
    }

    this.cachedSession = await this.store.load();
    return this.cachedSession;
  }

  async requireSession(): Promise<SessionRecord> {
    const session = await this.getSession();
    if (!session) {
      throw new Error("Not authenticated. Run: podcast-tracker auth login");
    }
    return session;
  }

  async login(): Promise<SessionRecord> {
    const session = await this.auth.login();
    await this.store.save(session);
    this.cachedSession = session;
    return session;
  }

  async logout(): Promise<void> {
    const session = await this.getSession();
    await this.auth.logout(session?.idToken ?? null);
    await this.store.clear();
    this.cachedSession = null;
  }

  async getValidIdToken(): Promise<string> {
    const session = await this.getValidSession();
    return session.idToken;
  }

  async getValidSession(): Promise<SessionRecord> {
    const session = await this.requireSession();

    const expiring =
      session.expiresAt <= Date.now() + REFRESH_SKEW_MS ||
      session.idTokenExpiresAt <= Date.now() + REFRESH_SKEW_MS;

    if (!expiring) {
      return session;
    }

    if (this.refreshPromise) {
      const refreshed = await this.refreshPromise;
      if (!refreshed) {
        throw new Error("Session expired. Run: podcast-tracker auth login");
      }
      return refreshed;
    }

    this.refreshPromise = this.refreshSession();
    try {
      const refreshed = await this.refreshPromise;
      if (!refreshed) {
        throw new Error("Session expired. Run: podcast-tracker auth login");
      }
      return refreshed;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async refreshSession(): Promise<SessionRecord | null> {
    const session = await this.getSession();
    const refreshToken = session?.refreshToken;
    if (!refreshToken) {
      this.logger.warn("No refresh token available. Clearing local session.");
      await this.store.clear();
      this.cachedSession = null;
      return null;
    }

    try {
      const refreshed = await this.auth.refresh(refreshToken);
      await this.store.save(refreshed);
      this.cachedSession = refreshed;
      return refreshed;
    } catch (error) {
      this.logger.warn(`Refresh failed: ${(error as Error).message}`);
      await this.store.clear();
      this.cachedSession = null;
      return null;
    }
  }
}
