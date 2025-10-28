import { describe, expect, it } from "vitest";
import { evaluateTemplate } from "./evaluateTemplate";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.markProgress.request.vtl";
const responseTemplate = "Mutation.markProgress.response.vtl";
const templateInfo = { fieldName: "markProgress", parentTypeName: "Mutation" };

interface DynamoRequest {
  operation: string;
  key: Record<string, Record<string, string>>;
  attributeValues: Record<string, { S?: string; N?: unknown; BOOL?: boolean }>;
}

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

describe("Mutation.markProgress mapping templates", () => {
  it("creates a PutItem request including optional showId", async () => {
    const options = {
      args: {
        episodeId: "episode-1",
        completed: false,
        showId: "show-99",
      },
      identitySub: "user-5",
      now: "2025-04-10T09:15:00.000Z",
    };

    const expectedRuntime = createRuntime(options);
    const rendered = renderTemplate(requestTemplate, expectedRuntime);
    const expectedRequest = JSON.parse(rendered);

    expect(expectedRequest.operation).toBe("PutItem");
    expect(expectedRequest.key).toEqual({
      pk: { S: "user#user-5" },
      sk: { S: "ep#episode-1" },
    });
    expect(expectedRequest.attributeValues).toEqual({
      dataType: { S: "progress" },
      episodeId: { S: "episode-1" },
      completed: { BOOL: false },
      updatedAt: { S: "2025-04-10T09:15:00.000Z" },
      showId: { S: "show-99" },
    });

    expectedRuntime.ctx.result = {
      episodeId: "episode-1",
      completed: false,
      updatedAt: "2025-04-10T09:15:00.000Z",
      showId: "show-99",
    };
    const expectedResponse = JSON.parse(
      renderTemplate(responseTemplate, expectedRuntime)
    );
    expect(expectedResponse).toEqual(expectedRuntime.ctx.result);

    const evalRuntime = createRuntime(options);
    const evaluatedRequest = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    const requestJson = evaluatedRequest.json as DynamoRequest;
    expect(requestJson.operation).toBe("PutItem");
    expect(requestJson.key).toEqual({
      pk: { S: "user#user-5" },
      sk: { S: "ep#episode-1" },
    });
    expect(requestJson.attributeValues.showId).toEqual({ S: "show-99" });
    expect(requestJson.attributeValues.episodeId).toEqual({ S: "episode-1" });
    expect(requestJson.attributeValues.completed).toEqual({ BOOL: false });
    expect(typeof requestJson.attributeValues.updatedAt?.S).toBe("string");

    evalRuntime.ctx.result = {
      episodeId: "episode-1",
      completed: false,
      updatedAt: "2025-04-10T09:15:00.000Z",
      showId: "show-99",
    };
    syncStash(expectedRuntime, evalRuntime);
    const evaluatedResponse = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluatedResponse.json).toEqual(expectedResponse);
  });

  it("omits showId when it is not provided", async () => {
    const options = {
      args: {
        episodeId: "episode-2",
        completed: true,
      },
      identitySub: "user-6",
      now: "2025-04-11T12:00:00.000Z",
    };

    const expectedRuntime = createRuntime(options);
    const rendered = renderTemplate(requestTemplate, expectedRuntime);
    const expectedRequest = JSON.parse(rendered);

    expect(expectedRequest.attributeValues.showId).toBeUndefined();
    expect(expectedRequest.attributeValues).toEqual({
      dataType: { S: "progress" },
      episodeId: { S: "episode-2" },
      completed: { BOOL: true },
      updatedAt: { S: "2025-04-11T12:00:00.000Z" },
    });

    const evalRuntime = createRuntime(options);
    const evaluatedRequest = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    const requestJson = evaluatedRequest.json as DynamoRequest;
    expect(requestJson.attributeValues.showId).toBeUndefined();
    expect(requestJson.attributeValues.episodeId).toEqual({ S: "episode-2" });
  });

  it("returns the raw data source payload when available", async () => {
    const expectedRuntime = createRuntime();
    expectedRuntime.ctx.result = {
      pk: { S: "user#user-1" },
      sk: { S: "ep#episode-3" },
      dataType: { S: "progress" },
      episodeId: { S: "episode-3" },
      completed: { BOOL: true },
      updatedAt: { S: "2025-04-12T08:00:00.000Z" },
    };

    const expectedResponse = JSON.parse(
      renderTemplate(responseTemplate, expectedRuntime)
    );
    expect(expectedResponse).toEqual(expectedRuntime.ctx.result);

    const evalRuntime = createRuntime();
    evalRuntime.ctx.result = {
      pk: { S: "user#user-1" },
      sk: { S: "ep#episode-3" },
      dataType: { S: "progress" },
      episodeId: { S: "episode-3" },
      completed: { BOOL: true },
      updatedAt: { S: "2025-04-12T08:00:00.000Z" },
    };

    const evaluatedResponse = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluatedResponse.json).toEqual(expectedResponse);
  });

  it("falls back to stashed progress when DynamoDB does not return attributes", async () => {
    const options = {
      args: {
        episodeId: "episode-4",
        completed: true,
        showId: "show-123",
      },
      identitySub: "user-9",
      now: "2025-04-13T10:00:00.000Z",
    };

    const expectedRuntime = createRuntime(options);
    renderTemplate(requestTemplate, expectedRuntime);
    expect(expectedRuntime.ctx.stash.get("progress")).toEqual({
      episodeId: "episode-4",
      completed: true,
      updatedAt: "2025-04-13T10:00:00.000Z",
      showId: "show-123",
    });

    expectedRuntime.ctx.result = null;
    const expectedResponse = JSON.parse(
      renderTemplate(responseTemplate, expectedRuntime)
    );
    expect(expectedResponse).toEqual({
      episodeId: "episode-4",
      completed: true,
      updatedAt: "2025-04-13T10:00:00.000Z",
      showId: "show-123",
    });

    const evalRuntime = createRuntime(options);
    const requestEval = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    const requestJson = requestEval.json as DynamoRequest;
    expect(requestJson.operation).toBe("PutItem");
    expect(requestJson.attributeValues.showId).toEqual({ S: "show-123" });
    syncStash(expectedRuntime, evalRuntime);
    evalRuntime.ctx.result = null;
    const evaluatedResponse = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluatedResponse.json).toEqual(expectedResponse);
  });
});
