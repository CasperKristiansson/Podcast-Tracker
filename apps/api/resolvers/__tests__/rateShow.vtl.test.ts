import { describe, expect, it } from "vitest";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.rateShow.request.vtl";
const responseTemplate = "Mutation.rateShow.response.vtl";

describe("Mutation.rateShow mapping templates", () => {
  it("builds an UpdateItem request including the provided review", () => {
    const runtime = createRuntime({
      args: {
        showId: "show-77",
        stars: 5,
        review: "Great insight",
      },
      identitySub: "user-9",
      now: "2025-04-13T07:30:00.000Z",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request.operation).toBe("UpdateItem");
    expect(request.update.expression).toBe(
      "SET ratingStars = :stars, ratingUpdatedAt = :updated, ratingReview = :review"
    );
    expect(request.update.expressionValues).toMatchObject({
      ":stars": { N: "5" },
      ":updated": { S: "2025-04-13T07:30:00.000Z" },
      ":review": { S: "Great insight" },
    });
    expect(request.condition.expression).toBe(
      "attribute_exists(pk) AND attribute_exists(sk)"
    );
  });

  it("sets review to NULL when omitted", () => {
    const runtime = createRuntime({
      args: {
        showId: "show-88",
        stars: 3,
      },
      identitySub: "user-10",
      now: "2025-04-14T10:00:00.000Z",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request.update.expression).toBe(
      "SET ratingStars = :stars, ratingUpdatedAt = :updated REMOVE ratingReview"
    );
    expect(request.update.expressionValues).not.toHaveProperty(":review");
  });

  it("returns the data source payload when present", () => {
    const runtime = createRuntime();
    runtime.ctx.result = {
      pk: { S: "user#user-9" },
      sk: { S: "sub#show-77" },
      ratingStars: { N: "5" },
      ratingUpdatedAt: { S: "2025-04-13T07:30:00.000Z" },
      ratingReview: { S: "Great insight" },
    };

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toEqual(runtime.ctx.result);
  });

  it("returns null when the data source returns nothing", () => {
    const runtime = createRuntime();
    runtime.ctx.result = null;

    const rendered = renderTemplate(responseTemplate, runtime);
    const response = JSON.parse(rendered);

    expect(response).toBeNull();
  });

  it("handles reviews that contain punctuation and extended text", () => {
    const runtime = createRuntime({
      args: {
        showId: "show-55",
        stars: 4,
        review:
          "Intressting story, really like the zombie story line. Benefit of this, extremly easy to follow the characters. Really liked it for being long,",
      },
      identitySub: "user-44",
      now: "2026-05-01T16:10:00.000Z",
    });

    const rendered = renderTemplate(requestTemplate, runtime);
    const request = JSON.parse(rendered);

    expect(request.update.expressionValues[":review"]).toEqual({
      S: "Intressting story, really like the zombie story line. Benefit of this, extremly easy to follow the characters. Really liked it for being long,",
    });
  });
});
