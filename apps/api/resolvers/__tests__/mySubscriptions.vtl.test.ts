import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Query.mySubscriptions.request.vtl";
const responseTemplate = "Query.mySubscriptions.response.vtl";

describe("Query.mySubscriptions mapping templates", () => {
  it("defaults limit to 20 and null nextToken", () => {
    const runtime = createRuntime({
      args: {},
      identitySub: "user-22",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request.limit).toBe(20);
    expect(request.nextToken).toBeNull();
    expect(request.query).toEqual({
      expression: "pk = :pk",
      expressionValues: {
        ":pk": { S: "user#user-22" },
      },
    });
  });

  it("passes through explicit limit and paging token", () => {
    const runtime = createRuntime({
      args: {
        limit: 5,
        nextToken: "token-1",
      },
      identitySub: "user-22",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request.limit).toBe(5);
    expect(request.nextToken).toBe("token-1");
  });

  it("converts DynamoDB query items into subscriptions", () => {
    const runtime = createRuntime();
    runtime.ctx.result = {
      items: [
        {
          pk: { S: "user#user-22" },
          sk: { S: "sub#show-123" },
          dataType: { S: "subscription" },
          showId: { S: "show-123" },
          title: { S: "Example Show" },
          publisher: { S: "Example Publisher" },
          totalEpisodes: { N: "50" },
        },
      ],
      nextToken: "token-2",
    };

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response.nextToken).toBe("token-2");
    expect(response.items).toEqual([
      {
        showId: "show-123",
        title: "Example Show",
        publisher: "Example Publisher",
        totalEpisodes: 50,
      },
    ]);
  });
});
