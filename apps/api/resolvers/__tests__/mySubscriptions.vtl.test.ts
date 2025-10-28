import { describe, expect, it } from "vitest";
import { evaluateTemplate } from "./evaluateTemplate";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Query.mySubscriptions.request.vtl";
const responseTemplate = "Query.mySubscriptions.response.vtl";
const templateInfo = {
  fieldName: "mySubscriptions",
  parentTypeName: "Query",
};

describe("Query.mySubscriptions mapping templates", () => {
  it("defaults limit to 20 and null nextToken", async () => {
    const options = {
      args: {},
      identitySub: "user-22",
    };

    const expectedRuntime = createRuntime(options);
    const expectedRequest = JSON.parse(
      renderTemplate(requestTemplate, expectedRuntime)
    );

    expect(expectedRequest.limit).toBe(20);
    expect(expectedRequest.nextToken).toBeNull();
    expect(expectedRequest.query).toEqual({
      expression: "pk = :pk",
      expressionValues: {
        ":pk": { S: "user#user-22" },
      },
    });

    const evalRuntime = createRuntime(options);
    const evaluated = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toEqual(expectedRequest);
  });

  it("passes through explicit limit and paging token", async () => {
    const options = {
      args: {
        limit: 5,
        nextToken: "token-1",
      },
      identitySub: "user-22",
    };

    const expectedRuntime = createRuntime(options);
    const expectedRequest = JSON.parse(
      renderTemplate(requestTemplate, expectedRuntime)
    );

    expect(expectedRequest.limit).toBe(5);
    expect(expectedRequest.nextToken).toBe("token-1");

    const evalRuntime = createRuntime(options);
    const evaluated = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toEqual(expectedRequest);
  });

  it("passes through query results and pagination token", async () => {
    const expectedRuntime = createRuntime();
    expectedRuntime.ctx.result = {
      items: [
        {
          pk: { S: "user#user-22" },
          sk: { S: "sub#show-123" },
          dataType: { S: "subscription" },
          showId: "show-123",
          title: "Example Show",
          publisher: "Example Publisher",
          totalEpisodes: 50,
        },
      ],
      nextToken: "token-2",
    };

    const expectedResponse = JSON.parse(
      renderTemplate(responseTemplate, expectedRuntime)
    );

    expect(expectedResponse).toEqual({
      items: [
        {
          showId: "show-123",
          title: "Example Show",
          publisher: "Example Publisher",
          totalEpisodes: 50,
        },
      ],
      nextToken: "token-2",
    });

    const evalRuntime = createRuntime();
    evalRuntime.ctx.result = {
      items: [
        {
          pk: "user#user-22",
          sk: "sub#show-123",
          dataType: "subscription",
          showId: "show-123",
          title: "Example Show",
          publisher: "Example Publisher",
          totalEpisodes: 50,
        },
      ],
      nextToken: "token-2",
    };

    const evaluated = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toEqual(expectedResponse);
  });
});
