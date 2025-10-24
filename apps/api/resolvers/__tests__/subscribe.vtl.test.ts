import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";
import requestSnapshot from "./subscribe.request.snap.json";

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

    expect(request).toEqual(requestSnapshot);

    (runtime.ctx as any).result = {
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

    const responseRendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(responseRendered);

    expect(response).toEqual((runtime.ctx as any).result);
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

    (runtime.ctx as any).result = {
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

    const responseRendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(responseRendered);
    expect(response).toEqual((runtime.ctx as any).result);
  });

  it("falls back to staged values when DynamoDB returns no attributes", () => {
    const runtime = createRuntime({
      args: {
        showId: "show-3",
        title: "New Show",
        publisher: "Publisher",
        image: "https://example.com/new.png",
        totalEpisodes: 12,
      },
      identitySub: "user-3",
      now: "2025-04-03T10:15:00.000Z",
    });

    renderTemplate(requestTemplate, runtime);
    (runtime.ctx as any).result = null;

    const responseRendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(responseRendered);

    expect(response).toEqual(runtime.ctx.stash.get("subscription"));
  });
});
