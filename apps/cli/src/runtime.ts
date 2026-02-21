import { loadConfig } from "./config.js";
import { createLogger, type Logger } from "./logger.js";
import { AuthService } from "./auth/auth-service.js";
import { SessionManager } from "./auth/session-manager.js";
import { SessionStore } from "./auth/session-store.js";
import { createCliApolloClient } from "./graphql/client.js";
import { PodcastApi } from "./graphql/api.js";

export interface CliRuntime {
  logger: Logger;
  sessionManager: SessionManager;
  api: PodcastApi;
  appsyncConfigured: boolean;
}

export const createRuntime = (verbose = false): CliRuntime => {
  const config = loadConfig();
  const logger = createLogger(verbose);
  const auth = new AuthService(config, logger);
  const store = new SessionStore(config.sessionFile);
  const sessionManager = new SessionManager(auth, store, logger);
  const client = createCliApolloClient(config, sessionManager);
  const api = new PodcastApi(client);

  return {
    logger,
    sessionManager,
    api,
    appsyncConfigured: config.appsyncConfigured,
  };
};
