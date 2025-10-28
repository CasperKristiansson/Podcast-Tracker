import { describe, expect, it } from "vitest";
import { evaluateTemplate } from "./evaluateTemplate";
import { createRuntime, renderTemplate } from "./vtlHarness";
import requestSnapshot from "./subscribe.request.snap.json";

const requestTemplate = "Mutation.subscribe.request.vtl";
const responseTemplate = "Mutation.subscribe.response.vtl";
const templateInfo = { fieldName: "subscribe", parentTypeName: "Mutation" };

function syncStash(
  fromRuntime: ReturnType<typeof createRuntime>,
  toRuntime: ReturnType<typeof createRuntime>
) {
  const source = fromRuntime.ctx.stash as {
    toObject?: () => Record<string, unknown>;
  };
  const snapshot = source.toObject ? source.toObject() : {};
  if (
    "clear" in toRuntime.ctx.stash &&
    typeof toRuntime.ctx.stash.clear === "function"
  ) {
    toRuntime.ctx.stash.clear();
  }
  for (const [key, value] of Object.entries(snapshot)) {
    toRuntime.ctx.stash.put(key, value);
  }
}

interface SubscribeRequest {
  operation: string;
  key: Record<string, Record<string, string>>;
  attributeValues: Record<string, { S?: string; N?: unknown }>;
}

describe("Mutation.subscribe mapping templates", () => {
  it("creates a PutItem request with provided values", async () => {
    const commonOptions = {
      args: {
        showId: "show-1",
        title: "Example Show",
        publisher: "Publisher",
        image: "https://example.com/image.png",
        totalEpisodes: 97,
      },
      identitySub: "user-1",
      now: "2025-04-01T12:00:00.000Z",
    };

    const expectedRuntime = createRuntime(commonOptions);

    const requestRendered = renderTemplate(requestTemplate, expectedRuntime);
    const request = JSON.parse(requestRendered);

    expect(request).toEqual(requestSnapshot);

    const responsePayload = {
      pk: "user#user-1",
      sk: "sub#show-1",
      dataType: "subscription",
      showId: "show-1",
      title: "Example Show",
      publisher: "Publisher",
      image: "https://example.com/image.png",
      totalEpisodes: 97,
      subscriptionSyncedAt: "2025-04-01T12:00:00.000Z",
      addedAt: "2025-04-01T12:00:00.000Z",
      ratingStars: null,
      ratingReview: null,
      ratingUpdatedAt: null,
    };

    expectedRuntime.ctx.result = responsePayload;

    const responseRendered = renderTemplate(responseTemplate, expectedRuntime);
    const response = JSON.parse(responseRendered);

    expect(response).toEqual(expectedRuntime.ctx.result);

    const evalRuntime = createRuntime(commonOptions);
    const evaluatedRequest = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    const requestJson = evaluatedRequest.json as SubscribeRequest;
    expect(requestJson.operation).toBe("PutItem");
    expect(requestJson.key).toEqual({
      pk: { S: "user#user-1" },
      sk: { S: "sub#show-1" },
    });
    expect(requestJson.attributeValues.showId).toEqual({ S: "show-1" });
    expect(requestJson.attributeValues.title).toEqual({ S: "Example Show" });
    expect(typeof requestJson.attributeValues.subscriptionSyncedAt?.S).toBe(
      "string"
    );
    syncStash(expectedRuntime, evalRuntime);

    evalRuntime.ctx.result = responsePayload;
    const evaluatedResponse = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluatedResponse.json).toEqual(response);
  });

  it("defaults totalEpisodes to 0 when null", async () => {
    const commonOptions = {
      args: {
        showId: "show-2",
        title: "Unknown",
        publisher: "Publisher",
        image: "https://example.com/cover.png",
        totalEpisodes: null,
      },
      identitySub: "user-2",
      now: "2025-04-02T08:30:00.000Z",
    };

    const expectedRuntime = createRuntime(commonOptions);

    const requestRendered = renderTemplate(requestTemplate, expectedRuntime);
    const request = JSON.parse(requestRendered);
    expect(request.attributeValues.totalEpisodes.N).toBe("0");

    const responsePayload = {
      pk: "user#user-2",
      sk: "sub#show-2",
      dataType: "subscription",
      showId: "show-2",
      title: "Unknown",
      publisher: "Publisher",
      image: "https://example.com/cover.png",
      totalEpisodes: 0,
      subscriptionSyncedAt: "2025-04-02T08:30:00.000Z",
      addedAt: "2025-04-02T08:30:00.000Z",
    };

    expectedRuntime.ctx.result = responsePayload;

    const responseRendered = renderTemplate(responseTemplate, expectedRuntime);
    const response = JSON.parse(responseRendered);
    expect(response).toEqual(expectedRuntime.ctx.result);

    const evalRuntime = createRuntime(commonOptions);
    const evaluatedRequest = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    const requestJson = evaluatedRequest.json as SubscribeRequest;
    expect(requestJson.key).toEqual({
      pk: { S: "user#user-2" },
      sk: { S: "sub#show-2" },
    });
    expect(requestJson.attributeValues.totalEpisodes).toBeDefined();
    syncStash(expectedRuntime, evalRuntime);

    evalRuntime.ctx.result = responsePayload;
    const evaluatedResponse = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluatedResponse.json).toEqual(response);
  });

  it("falls back to staged values when DynamoDB returns no attributes", async () => {
    const commonOptions = {
      args: {
        showId: "show-3",
        title: "New Show",
        publisher: "Publisher",
        image: "https://example.com/new.png",
        totalEpisodes: 12,
      },
      identitySub: "user-3",
      now: "2025-04-03T10:15:00.000Z",
    };

    const expectedRuntime = createRuntime(commonOptions);

    renderTemplate(requestTemplate, expectedRuntime);
    expectedRuntime.ctx.result = null;

    const responseRendered = renderTemplate(responseTemplate, expectedRuntime);
    const response = JSON.parse(responseRendered);

    expect(response).toEqual(expectedRuntime.ctx.stash.get("subscription"));

    const evalRuntime = createRuntime(commonOptions);
    await evaluateTemplate(requestTemplate, evalRuntime, templateInfo);
    syncStash(expectedRuntime, evalRuntime);
    evalRuntime.ctx.result = null;
    const evaluatedResponse = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluatedResponse.json).toEqual(response);
  });
});
