import { describe, expect, it } from "vitest";
import { createChallenge, createState, createVerifier } from "../auth/pkce.js";

describe("pkce", () => {
  it("generates verifier and challenge", () => {
    const verifier = createVerifier();
    const challenge = createChallenge(verifier);

    expect(verifier.length).toBeGreaterThan(42);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates random state", () => {
    const a = createState();
    const b = createState();
    expect(a).not.toBe(b);
  });
});
