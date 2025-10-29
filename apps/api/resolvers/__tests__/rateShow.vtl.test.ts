import { describe, expect, it } from "vitest";
import { evaluateTemplate } from "./evaluateTemplate";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.rateShow.request.vtl";
const responseTemplate = "Mutation.rateShow.response.vtl";
const templateInfo = { fieldName: "rateShow", parentTypeName: "Mutation" };

describe("Mutation.rateShow mapping templates", () => {
  it("builds an UpdateItem request including the provided review", async () => {
    const options = {
      args: {
        showId: "show-77",
        stars: 5,
        review: "Great insight",
      },
      identitySub: "user-9",
      now: "2025-04-13T07:30:00.000Z",
    };

    const expectedRuntime = createRuntime(options);
    const expectedRequest = JSON.parse(
      renderTemplate(requestTemplate, expectedRuntime)
    );

    expect(expectedRequest.operation).toBe("UpdateItem");
    expect(expectedRequest.update.expression).toBe(
      "SET ratingStars = :stars, ratingUpdatedAt = :updated, ratingReview = :review"
    );
    expect(expectedRequest.update.expressionValues).toMatchObject({
      ":stars": { N: "5" },
      ":updated": { S: "2025-04-13T07:30:00.000Z" },
      ":review": { S: "Great insight" },
    });

    const evalRuntime = createRuntime(options);
    const evaluated = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.raw).toContain('"operation": "UpdateItem"');
    expect(evaluated.raw).toContain(
      '"expression": "SET ratingStars = :stars, ratingUpdatedAt = :updated, ratingReview = :review"'
    );
    expect(evaluated.raw).toMatch(
      /":review":\s*\{"S":"Great insight"\}/
    );
  });

  it("sets review to NULL when omitted", async () => {
    const options = {
      args: {
        showId: "show-88",
        stars: 3,
      },
      identitySub: "user-10",
      now: "2025-04-14T10:00:00.000Z",
    };

    const expectedRuntime = createRuntime(options);
    const expectedRequest = JSON.parse(
      renderTemplate(requestTemplate, expectedRuntime)
    );

    expect(expectedRequest.update.expression).toBe(
      "SET ratingStars = :stars, ratingUpdatedAt = :updated REMOVE ratingReview"
    );
    expect(expectedRequest.update.expressionValues).not.toHaveProperty(
      ":review"
    );

    const evalRuntime = createRuntime(options);
    const evaluated = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.raw).toContain(
      '"expression": "SET ratingStars = :stars, ratingUpdatedAt = :updated REMOVE ratingReview"'
    );
    expect(evaluated.raw).not.toContain(":review={");
  });

  it("returns the data source payload when present", async () => {
    const expectedRuntime = createRuntime();
    expectedRuntime.ctx.result = {
      pk: { S: "user#user-9" },
      sk: { S: "sub#show-77" },
      ratingStars: { N: "5" },
      ratingUpdatedAt: { S: "2025-04-13T07:30:00.000Z" },
      ratingReview: { S: "Great insight" },
    };

    const expectedResponse = JSON.parse(
      renderTemplate(responseTemplate, expectedRuntime)
    );
    expect(expectedResponse).toEqual(expectedRuntime.ctx.result);

    const evalRuntime = createRuntime();
    evalRuntime.ctx.result = {
      pk: { S: "user#user-9" },
      sk: { S: "sub#show-77" },
      ratingStars: { N: "5" },
      ratingUpdatedAt: { S: "2025-04-13T07:30:00.000Z" },
      ratingReview: { S: "Great insight" },
    };
    const evaluated = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toEqual(expectedResponse);
  });

  it("returns null when the data source returns nothing", async () => {
    const expectedRuntime = createRuntime();
    expectedRuntime.ctx.result = null;

    const expectedResponse = JSON.parse(
      renderTemplate(responseTemplate, expectedRuntime)
    );
    expect(expectedResponse).toBeNull();

    const evalRuntime = createRuntime();
    evalRuntime.ctx.result = null;
    const evaluated = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toBeNull();
  });

  it("handles reviews that contain punctuation and extended text", async () => {
    const options = {
      args: {
        showId: "show-55",
        stars: 4,
        review:
          "Intressting story, really like the zombie story line. Benefit of this, extremly easy to follow the characters. Really liked it for being long,",
      },
      identitySub: "user-44",
      now: "2026-05-01T16:10:00.000Z",
    };

    const expectedRuntime = createRuntime(options);
    const expectedRequest = JSON.parse(
      renderTemplate(requestTemplate, expectedRuntime)
    );

    expect(expectedRequest.update.expressionValues[":review"]).toEqual({
      S: "Intressting story, really like the zombie story line. Benefit of this, extremly easy to follow the characters. Really liked it for being long,",
    });

    const evalRuntime = createRuntime(options);
    const evaluated = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.raw).toMatch(
      /":review":\s*\{"S":"Intressting story/
    );
  });
});
