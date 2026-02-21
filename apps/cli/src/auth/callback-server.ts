import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

export interface OAuthCallbackResult {
  code: string;
  state: string;
}

const writeHtml = (
  response: ServerResponse,
  statusCode: number,
  title: string,
  body: string
): void => {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(
    `<!doctype html><html><head><title>${title}</title></head><body><h1>${title}</h1><p>${body}</p></body></html>`
  );
};

const parseCallback = (
  request: IncomingMessage,
  expectedPathname: string
): { result?: OAuthCallbackResult; error?: string } => {
  const host = request.headers.host ?? "127.0.0.1";
  const url = new URL(request.url ?? "/", `http://${host}`);
  return parseOAuthCallbackUrl(url, expectedPathname);
};

export const parseOAuthCallbackUrl = (
  url: URL,
  expectedPathname: string
): { result?: OAuthCallbackResult; error?: string } => {
  if (url.pathname !== expectedPathname) {
    return { error: "Unexpected callback path." };
  }

  const error = url.searchParams.get("error");
  if (error) {
    const description =
      url.searchParams.get("error_description") ?? "Unknown OAuth error.";
    return { error: `${error}: ${description}` };
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return { error: "Missing code or state in callback." };
  }

  return {
    result: {
      code,
      state,
    },
  };
};

export const waitForOAuthCallback = async (
  redirectUri: string,
  timeoutMs = 180_000
): Promise<OAuthCallbackResult> => {
  const redirect = new URL(redirectUri);
  const host = redirect.hostname;
  const port = Number.parseInt(redirect.port || "80", 10);
  const path = redirect.pathname;

  return new Promise<OAuthCallbackResult>((resolve, reject) => {
    let settled = false;

    const closeServer = () => {
      server.close();
    };

    const done = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      closeServer();
      callback();
    };

    const server = createServer((request, response) => {
      const parsed = parseCallback(request, path);
      if (parsed.error) {
        writeHtml(response, 400, "Sign-in failed", parsed.error);
        done(() => reject(new Error(parsed.error)));
        return;
      }

      if (!parsed.result) {
        writeHtml(
          response,
          400,
          "Sign-in failed",
          "No callback result was returned."
        );
        done(() => reject(new Error("No callback result.")));
        return;
      }

      writeHtml(
        response,
        200,
        "You are signed in",
        "You can close this tab and return to the terminal."
      );
      done(() => resolve(parsed.result!));
    });

    server.once("error", (error) => {
      done(() => reject(error));
    });

    server.listen(port, host, () => {
      // Ready.
    });

    const timer = setTimeout(() => {
      done(() => reject(new Error("Timed out waiting for OAuth callback.")));
    }, timeoutMs);
  });
};
