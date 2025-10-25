import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.markProgress.request.vtl";
const responseTemplate = "Mutation.markProgress.response.vtl";

describe("Mutation.markProgress mapping templates", () => {
  it("creates a PutItem request including optional showId", () => {
    const runtime = createRuntime({
      args: {
        episodeId: "episode-1",
        positionSec: 123,
        completed: false,
        showId: "show-99",
      },
      identitySub: "user-5",
      now: "2025-04-10T09:15:00.000Z",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request.operation).toBe("PutItem");
    expect(request.key).toEqual({
      pk: { S: "user#user-5" },
      sk: { S: "ep#episode-1" },
    });
    expect(request.attributeValues).toEqual({
      dataType: { S: "progress" },
      episodeId: { S: "episode-1" },
      positionSec: { N: "123" },
      completed: { BOOL: false },
      updatedAt: { S: "2025-04-10T09:15:00.000Z" },
      showId: { S: "show-99" },
    });
  });

  it("omits showId when it is not provided", () => {
    const runtime = createRuntime({
      args: {
        episodeId: "episode-2",
        positionSec: 45,
        completed: true,
      },
      identitySub: "user-6",
      now: "2025-04-11T12:00:00.000Z",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request.attributeValues.showId).toBeUndefined();
    expect(request.attributeValues).toEqual({
      dataType: { S: "progress" },
      episodeId: { S: "episode-2" },
      positionSec: { N: "45" },
      completed: { BOOL: true },
      updatedAt: { S: "2025-04-11T12:00:00.000Z" },
    });
  });

  it("converts DynamoDB map results into native values", () => {
    const runtime = createRuntime();
    runtime.ctx.result = {
      pk: { S: "user#user-1" },
      sk: { S: "ep#episode-3" },
      dataType: { S: "progress" },
      episodeId: { S: "episode-3" },
      positionSec: { N: "360" },
      completed: { BOOL: true },
      updatedAt: { S: "2025-04-12T08:00:00.000Z" },
    };

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toMatchObject({
      episodeId: "episode-3",
      positionSec: 360,
      completed: true,
      updatedAt: "2025-04-12T08:00:00.000Z",
    });
  });

  it("falls back to stashed progress when DynamoDB does not return attributes", () => {
    const runtime = createRuntime({
      args: {
        episodeId: "episode-4",
        positionSec: 200,
        completed: true,
        showId: "show-123",
      },
      identitySub: "user-9",
      now: "2025-04-13T10:00:00.000Z",
    });

    renderTemplate(requestTemplate, runtime);
    expect(
      runtime.ctx.stash.get("progress")
    ).toEqual({
      episodeId: "episode-4",
      positionSec: 200,
      completed: true,
      updatedAt: "2025-04-13T10:00:00.000Z",
      showId: "show-123",
    });
    runtime.ctx.result = null;

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toEqual({
      episodeId: "episode-4",
      positionSec: 200,
      completed: true,
      updatedAt: "2025-04-13T10:00:00.000Z",
      showId: "show-123",
    });
  });
});
