import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Uint8ArrayBlobAdapter } from "@smithy/util-stream";

process.env.TABLE_NAME = "test-table";
process.env.SPOTIFY_PROXY_FUNCTION_NAME = "spotify-proxy";

const { handler } = await import("./index.js");

const encodePayload = (value: unknown) =>
  Uint8ArrayBlobAdapter.fromString(JSON.stringify(value));

const dynamoMock = mockClient(DynamoDBDocumentClient);
const lambdaMock = mockClient(LambdaClient);

describe("progress lambda", () => {
  beforeEach(() => {
    process.env.TABLE_NAME = "test-table";
    process.env.SPOTIFY_PROXY_FUNCTION_NAME = "spotify-proxy";
    dynamoMock.reset();
    lambdaMock.reset();
    dynamoMock.on(BatchWriteCommand).resolves({ UnprocessedItems: {} });
  });

  it("marks all episodes complete across multiple pages", async () => {
    dynamoMock
      .on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            episodeId: "ep-1",
          },
        ],
      })
      .resolves({ Items: [] });

    lambdaMock
      .on(InvokeCommand)
      .resolvesOnce({
        Payload: encodePayload({
          items: [
            { episodeId: "ep-1", durationSec: 120 },
            { episodeId: "ep-2", durationSec: 240 },
          ],
          nextToken: "50",
        }),
      })
      .resolvesOnce({
        Payload: encodePayload({
          items: [{ episodeId: "ep-3", durationSec: null }],
          nextToken: null,
        }),
      });

    const result = await handler({
      identity: { sub: "user-1" },
      info: { fieldName: "markAllEpisodesComplete" },
      arguments: { showId: "show-1" },
    });

    expect(result).toEqual([
      expect.objectContaining({
        episodeId: "ep-2",
        completed: true,
        showId: "show-1",
      }),
      expect.objectContaining({
        episodeId: "ep-3",
        completed: true,
        showId: "show-1",
      }),
    ]);

    const batchCalls = dynamoMock.commandCalls(BatchWriteCommand);
    expect(batchCalls).toHaveLength(1);
    const batchCall = batchCalls[0];
    expect(batchCall).toBeDefined();
    const requestItemsForTable =
      batchCall?.args[0].input.RequestItems?.["test-table"] ?? [];
    const requestItems = requestItemsForTable as {
      PutRequest?: {
        Item?: {
          episodeId?: unknown;
        };
      };
    }[];
    const writtenEpisodeIds = requestItems.map((request) => {
      const episodeId = request.PutRequest?.Item?.episodeId;
      expect(typeof episodeId).toBe("string");
      return episodeId as string;
    });
    expect(writtenEpisodeIds).toEqual(["ep-2", "ep-3"]);

    const invokePayloads = lambdaMock
      .commandCalls(InvokeCommand)
      .map((call) => {
        const payload = call.args[0].input.Payload;
        expect(payload).toBeDefined();
        const decoded = new TextDecoder().decode(payload as Uint8Array);
        return JSON.parse(decoded) as Record<string, unknown>;
      });
    expect(invokePayloads).toEqual([
      expect.objectContaining({
        arguments: { showId: "show-1", limit: 50 },
      }),
      expect.objectContaining({
        arguments: { showId: "show-1", limit: 50, cursor: "50" },
      }),
    ]);
  });

  it("returns empty array when all episodes already completed", async () => {
    dynamoMock.on(QueryCommand).resolves({
      Items: [{ episodeId: "ep-1" }],
    });

    lambdaMock.on(InvokeCommand).resolves({
      Payload: encodePayload({
        items: [{ episodeId: "ep-1", durationSec: 200 }],
        nextToken: null,
      }),
    });

    const result = await handler({
      identity: { sub: "user-1" },
      info: { fieldName: "markAllEpisodesComplete" },
      arguments: { showId: "show-1" },
    });

    expect(result).toEqual([]);
    expect(dynamoMock.commandCalls(BatchWriteCommand)).toHaveLength(0);
  });
});
