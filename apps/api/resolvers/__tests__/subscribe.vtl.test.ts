import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.subscribe.request.vtl";
const responseTemplate = "Mutation.subscribe.response.vtl";

describe("Mutation.subscribe mapping templates", () => {
  it("creates a PutItem request with provided values", () => {
    const runtime = createRuntime({
      args: {
        showId: "show-1",
        title: "Example Show",
        publisher: "Publisher",
        image: "https://example.com/image.png",
        totalEpisodes: 97,
      },
      identitySub: "user-1",
      now: "2025-04-01T12:00:00.000Z",
    });

    const requestRendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(requestRendered);

    expect(request).toMatchObject({
      version: "2018-05-29",
      operation: "PutItem",
    });
    expect(request.key.pk.S).toBe("user#user-1");
    expect(request.attributeValues.totalEpisodes.N).toBe("97");

    const responseRendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(responseRendered);

    expect(response).toEqual({
      showId: "show-1",
      title: "Example Show",
      publisher: "Publisher",
      image: "https://example.com/image.png",
      addedAt: "2025-04-01T12:00:00.000Z",
      totalEpisodes: 97,
      ratingStars: null,
      ratingReview: null,
      ratingUpdatedAt: null,
    });
  });

  it("defaults totalEpisodes to 0 when null", () => {
    const runtime = createRuntime({
      args: {
        showId: "show-2",
        title: "Unknown",
        publisher: "Publisher",
        image: "https://example.com/cover.png",
        totalEpisodes: null,
      },
      identitySub: "user-2",
      now: "2025-04-02T08:30:00.000Z",
    });

    const requestRendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(requestRendered);
    expect(request.attributeValues.totalEpisodes.N).toBe("0");

    const responseRendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(responseRendered);
    expect(response.totalEpisodes).toBe(0);
  });
});
