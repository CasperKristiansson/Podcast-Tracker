import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const responseTemplate = "Query.episodeProgress.response.vtl";

describe("Query.episodeProgress mapping templates", () => {
  it("converts DynamoDB progress items into plain objects", () => {
    const runtime = createRuntime();
    runtime.ctx.result = {
      items: [
        {
          pk: { S: "user#user-33" },
          sk: { S: "ep#episode-1" },
          dataType: { S: "progress" },
          episodeId: { S: "episode-1" },
          positionSec: { N: "125" },
          completed: { BOOL: true },
          updatedAt: { S: "2025-01-02T03:04:05.000Z" },
          showId: { S: "show-88" },
        },
        {
          pk: { S: "user#user-33" },
          sk: { S: "ep#episode-2" },
          dataType: { S: "progress" },
          episodeId: { S: "episode-2" },
          positionSec: { N: "0" },
          completed: { BOOL: false },
          updatedAt: { S: "2025-01-02T03:04:06.000Z" },
        },
      ],
    };

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toEqual([
      {
        episodeId: "episode-1",
        positionSec: 125,
        completed: true,
        updatedAt: "2025-01-02T03:04:05.000Z",
        showId: "show-88",
      },
      {
        episodeId: "episode-2",
        positionSec: 0,
        completed: false,
        updatedAt: "2025-01-02T03:04:06.000Z",
      },
    ]);
  });
});
