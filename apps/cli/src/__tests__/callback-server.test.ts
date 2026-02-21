import { describe, expect, it } from "vitest";
import { parseOAuthCallbackUrl } from "../auth/callback-server.js";

describe("callback parser", () => {
  it("parses successful callback", () => {
    const result = parseOAuthCallbackUrl(
      new URL("http://127.0.0.1:54545/callback?code=abc&state=xyz"),
      "/callback"
    );

    expect(result.error).toBeUndefined();
    expect(result.result).toEqual({ code: "abc", state: "xyz" });
  });

  it("returns oauth error", () => {
    const result = parseOAuthCallbackUrl(
      new URL(
        "http://127.0.0.1:54545/callback?error=access_denied&error_description=Denied"
      ),
      "/callback"
    );

    expect(result.error).toContain("access_denied");
  });
});
