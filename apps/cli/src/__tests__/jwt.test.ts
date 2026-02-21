import { describe, expect, it } from "vitest";
import { decodeJwtPayload, isApprovedUser } from "../auth/jwt.js";

const makeJwt = (payload: Record<string, unknown>): string => {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  return `x.${encoded}.y`;
};

describe("jwt", () => {
  it("decodes payload", () => {
    const token = makeJwt({ sub: "abc", exp: 100 });
    const payload = decodeJwtPayload(token);
    expect(payload.sub).toBe("abc");
    expect(payload.exp).toBe(100);
  });

  it("validates approval claim", () => {
    expect(isApprovedUser(makeJwt({ "custom:approved": "true" }))).toBe(true);
    expect(isApprovedUser(makeJwt({ "custom:approved": false }))).toBe(false);
  });
});
