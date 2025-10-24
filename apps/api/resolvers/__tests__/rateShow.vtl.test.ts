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

    expect(request.update.expressionValues[":review"]).toEqual({ NULL: true });
  });

  it("coerces DynamoDB map results to plain values", () => {
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

    expect(response).toEqual({
      pk: "user#user-9",
      sk: "sub#show-77",
      ratingStars: 5,
      ratingUpdatedAt: "2025-04-13T07:30:00.000Z",
      ratingReview: "Great insight",
    });
  });
});
