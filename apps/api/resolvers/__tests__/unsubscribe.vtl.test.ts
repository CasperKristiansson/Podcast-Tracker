import { describe, expect, it } from "vitest";
import { evaluateTemplate } from "./evaluateTemplate";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.unsubscribe.request.vtl";
const responseTemplate = "Mutation.unsubscribe.response.vtl";
const templateInfo = { fieldName: "unsubscribe", parentTypeName: "Mutation" };

describe("Mutation.unsubscribe mapping templates", () => {
  it("creates a DeleteItem request using the caller identity", async () => {
    const options = {
      args: { showId: "show-44" },
      identitySub: "user-44",
    };

    const expectedRuntime = createRuntime(options);
    const expectedRequest = JSON.parse(
      renderTemplate(requestTemplate, expectedRuntime)
    );

    expect(expectedRequest).toEqual({
      version: "2018-05-29",
      operation: "DeleteItem",
      key: {
        pk: { S: "user#user-44" },
        sk: { S: "sub#show-44" },
      },
    });

    const evalRuntime = createRuntime(options);
    const evaluated = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toEqual(expectedRequest);
  });

  it("returns true when DynamoDB result is present", async () => {
    const expectedRuntime = createRuntime();
    expectedRuntime.ctx.result = { deleted: true };

    const expectedResponse = JSON.parse(
      renderTemplate(responseTemplate, expectedRuntime)
    );
    expect(expectedResponse).toBe(true);

    const evalRuntime = createRuntime();
    evalRuntime.ctx.result = { deleted: true };
    const evaluated = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toBe(true);
  });

  it("propagates mapping template errors", async () => {
    const runtime = createRuntime();
    runtime.ctx.error = new Error("boom");

    expect(() => renderTemplate(responseTemplate, runtime)).toThrow(/boom/);

    const evalRuntime = createRuntime();
    evalRuntime.ctx.error = {
      message: "boom",
      type: "MappingTemplate",
    };

    await expect(
      evaluateTemplate(responseTemplate, evalRuntime, templateInfo)
    ).rejects.toThrow(/boom/);
  });
});
