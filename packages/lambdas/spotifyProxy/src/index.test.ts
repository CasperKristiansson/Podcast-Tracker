import { describe, expect, it } from "vitest";
import { handler } from "./index.js";

type HandlerFunction = typeof handler;

describe("spotify proxy handler", () => {
  it("rejects unsupported fields", async () => {
    const executeHandler: HandlerFunction = handler;
    await expect(
      executeHandler({
        info: { fieldName: "unknownField" },
        arguments: {},
      })
    ).rejects.toThrow("Unsupported field unknownField");
  });
});
