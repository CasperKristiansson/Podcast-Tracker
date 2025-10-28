import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.publishProgress.request.vtl";
const responseTemplate = "Mutation.publishProgress.response.vtl";

describe("Mutation.publishProgress mapping templates", () => {
  it("embeds identity information in the event payload", () => {
    const runtime = createRuntime({
      args: {
        episodeId: "episode-55",
        completed: true,
      },
      identitySub: "user-55",
      now: "2025-04-15T15:45:00.000Z",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request).toEqual({
      version: "2018-05-29",
      payload: {
        userId: "user-55",
        episodeId: "episode-55",
        completed: true,
        updatedAt: "2025-04-15T15:45:00.000Z",
      },
    });
  });

  it("removes userId from the subscription response", () => {
    const runtime = createRuntime();
    runtime.ctx.result = {
      userId: "user-55",
      episodeId: "episode-55",
      completed: true,
      updatedAt: "2025-04-15T15:45:00.000Z",
    };

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toEqual({
      episodeId: "episode-55",
      completed: true,
      updatedAt: "2025-04-15T15:45:00.000Z",
    });
  });
});
