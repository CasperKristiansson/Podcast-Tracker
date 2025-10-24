import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Query.health.request.vtl";
const responseTemplate = "Query.health.response.vtl";

describe("Query.health mapping templates", () => {
  it("creates a static status request", () => {
    const runtime = createRuntime();

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request).toEqual({
      version: "2018-05-29",
      payload: {},
    });
  });

  it("always responds with ok", () => {
    const runtime = createRuntime();

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toEqual({ status: "ok" });
  });
});
