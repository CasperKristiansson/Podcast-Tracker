import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.unsubscribe.request.vtl";
const responseTemplate = "Mutation.unsubscribe.response.vtl";

describe("Mutation.unsubscribe mapping templates", () => {
  it("creates a DeleteItem request using the caller identity", () => {
    const runtime = createRuntime({
      args: { showId: "show-44" },
      identitySub: "user-44",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request).toEqual({
      version: "2018-05-29",
      operation: "DeleteItem",
      key: {
        pk: { S: "user#user-44" },
        sk: { S: "sub#show-44" },
      },
    });
  });

  it("returns true when DynamoDB result is present", () => {
    const runtime = createRuntime();
    runtime.ctx.result = { deleted: true };

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toBe(true);
  });

  it("propagates mapping template errors", () => {
    const runtime = createRuntime();
    runtime.ctx.error = new Error("boom");

    expect(() => renderTemplate(responseTemplate, runtime)).toThrowError(
      /boom/
    );
  });
});
