import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Query.mySubscription.request.vtl";
const responseTemplate = "Query.mySubscription.response.vtl";

describe("Query.mySubscription mapping templates", () => {
  it("constructs a GetItem request scoped to the user", () => {
    const runtime = createRuntime({
      args: { showId: "show-11" },
      identitySub: "user-11",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request).toEqual({
      version: "2018-05-29",
      operation: "GetItem",
      key: {
        pk: { S: "user#user-11" },
        sk: { S: "sub#show-11" },
      },
    });
  });

  it("returns null when no subscription exists", () => {
    const runtime = createRuntime();
    runtime.ctx.result = null;

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toBeNull();
  });

  it("removes internal keys from the subscription response", () => {
    const runtime = createRuntime();
    runtime.ctx.result = {
      pk: { S: "user#user-11" },
      sk: { S: "sub#show-11" },
      dataType: { S: "subscription" },
      showId: { S: "show-11" },
      title: { S: "Show Eleven" },
      publisher: { S: "Publisher" },
    };

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toEqual({
      showId: "show-11",
      title: "Show Eleven",
      publisher: "Publisher",
    });
    expect(response.pk).toBeUndefined();
    expect(response.sk).toBeUndefined();
    expect(response.dataType).toBeUndefined();
  });
});
