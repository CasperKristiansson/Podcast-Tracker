import { describe, expect, it } from "vitest";
import { evaluateTemplate } from "./evaluateTemplate";
import { createRuntime, renderTemplate } from "./vtlHarness";

const requestTemplate = "Mutation.dropShow.request.vtl";
const responseTemplate = "Mutation.dropShow.response.vtl";
const templateInfo = { fieldName: "dropShow", parentTypeName: "Mutation" };

describe("Mutation.dropShow mapping templates", () => {
  it("builds an UpdateItem request that sets droppedAt", async () => {
    const options = {
      args: {
        showId: "show-123",
      },
      identitySub: "user-456",
      now: "2025-05-05T08:00:00.000Z",
    };

    const runtime = createRuntime(options);
    const request = JSON.parse(renderTemplate(requestTemplate, runtime));

    expect(request.operation).toBe("UpdateItem");
    expect(request.key).toEqual({
      pk: { S: "user#user-456" },
      sk: { S: "sub#show-123" },
    });
    expect(request.update.expression).toBe("SET #droppedAt = :droppedAt");
    expect(request.update.expressionNames).toEqual({
      "#droppedAt": "droppedAt",
    });
    expect(request.update.expressionValues).toEqual({
      ":droppedAt": { S: "2025-05-05T08:00:00.000Z" },
    });
    expect(request.condition).toEqual({
      expression: "attribute_exists(pk) AND attribute_exists(sk)",
    });

    const evalRuntime = createRuntime(options);
    const evaluated = await evaluateTemplate(
      requestTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.raw).toContain('"operation": "UpdateItem"');
    expect(evaluated.raw).toContain("#droppedAt = :droppedAt");
    expect(evaluated.raw).toMatch(/:droppedAt":\s*\{"S":"\d{4}-\d{2}-\d{2}T/);
  });

  it("passes the data source payload through the response mapper", async () => {
    const runtime = createRuntime();
    runtime.ctx.result = {
      pk: { S: "user#user-456" },
      sk: { S: "sub#show-123" },
      droppedAt: { S: "2025-05-05T08:00:00.000Z" },
    };

    const response = JSON.parse(renderTemplate(responseTemplate, runtime));
    expect(response).toEqual(runtime.ctx.result);

    const evalRuntime = createRuntime();
    evalRuntime.ctx.result = runtime.ctx.result;
    const evaluated = await evaluateTemplate(
      responseTemplate,
      evalRuntime,
      templateInfo
    );
    expect(evaluated.json).toEqual(runtime.ctx.result);
  });
});
