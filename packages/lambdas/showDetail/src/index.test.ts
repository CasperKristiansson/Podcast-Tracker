import { beforeEach, describe, expect, it } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  GetCommand,
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

describe("show detail lambda", () => {
  beforeEach(() => {
    process.env.TABLE_NAME = "test-table";
    process.env.SPOTIFY_PROXY_FUNCTION_NAME = "spotify-proxy";
    dynamoMock.reset();
    lambdaMock.reset();
  });

  it("throws when caller is not authenticated", async () => {
    await expect(
      handler({
        identity: null,
        arguments: {
          showId: "show-1",
        },
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("combines show metadata with subscription and progress", async () => {
    lambdaMock
      .on(InvokeCommand)
      .resolvesOnce({
        Payload: encodePayload({
          id: "show-42",
          title: "Test Show",
          publisher: "Studio",
          description: "Desc",
          htmlDescription: "<p>Desc</p>",
          image: "https://image",
          totalEpisodes: 200,
          externalUrl: "https://spotify/show-42",
          categories: ["Fiction"],
          explicit: false,
          languages: ["en"],
          availableMarkets: ["US"],
          mediaType: "audio",
          isSubscribed: false,
        }),
      })
      .resolvesOnce({
        Payload: encodePayload({
          items: [
            {
              episodeId: "ep-1",
              showId: "show-42",
              title: "Episode One",
              audioUrl: "https://audio/1",
              publishedAt: "2024-01-01T00:00:00.000Z",
              durationSec: 900,
              description: "Episode",
              htmlDescription: "<p>Episode</p>",
              image: "https://image/ep1",
              linkUrl: "https://spotify/ep-1",
              explicit: false,
              isExternallyHosted: false,
              isPlayable: true,
              releaseDatePrecision: "day",
              languages: ["en"],
            },
          ],
          nextToken: null,
        }),
      });

    dynamoMock.on(GetCommand).resolves({
      Item: {
        pk: "user#user-1",
        sk: "sub#show-42",
        showId: "show-42",
        title: "Test Show",
        publisher: "Studio",
        image: "https://image",
        addedAt: "2024-01-05T00:00:00.000Z",
        totalEpisodes: 200,
        subscriptionSyncedAt: "2024-01-06T00:00:00.000Z",
        ratingStars: 4,
        ratingReview: "Great",
        ratingUpdatedAt: "2024-01-07T00:00:00.000Z",
      },
    });

    dynamoMock.on(QueryCommand).resolves({
      Items: [
        {
          pk: "user#user-1",
          sk: "ep#ep-1",
          episodeId: "ep-1",
          completed: true,
          updatedAt: "2024-01-10T00:00:00.000Z",
          showId: "show-42",
        },
      ],
    });

    const result = await handler({
      identity: { sub: "user-1" },
      arguments: {
        showId: "show-42",
        episodeLimit: 10,
      },
    });

    expect(result.show).toMatchObject({
      id: "show-42",
      title: "Test Show",
      isSubscribed: true,
    });

    expect(result.subscription).toMatchObject({
      showId: "show-42",
      ratingStars: 4,
      ratingReview: "Great",
    });
    expect(result.subscription?.droppedAt).toBeNull();

    expect(result.episodes.items).toHaveLength(1);
    expect(result.episodes.items[0]).toMatchObject({
      episodeId: "ep-1",
      title: "Episode One",
      durationSec: 900,
    });

    expect(result.progress).toEqual([
      {
        episodeId: "ep-1",
        completed: true,
        updatedAt: "2024-01-10T00:00:00.000Z",
        showId: "show-42",
      },
    ]);
  });

  it("marks the show as unsubscribed when the subscription was dropped", async () => {
    lambdaMock
      .on(InvokeCommand)
      .resolvesOnce({
        Payload: encodePayload({
          id: "show-77",
          title: "Another Show",
          publisher: "Studio",
          description: "Desc",
          htmlDescription: "<p>Desc</p>",
          image: "https://image",
          totalEpisodes: 10,
          externalUrl: null,
          categories: [],
          explicit: false,
          languages: ["en"],
          availableMarkets: ["US"],
          mediaType: "audio",
          isSubscribed: false,
        }),
      })
      .resolvesOnce({
        Payload: encodePayload({ items: [], nextToken: null }),
      });

    dynamoMock.on(GetCommand).resolves({
      Item: {
        pk: "user#user-2",
        sk: "sub#show-77",
        showId: "show-77",
        title: "Another Show",
        publisher: "Studio",
        image: "https://image",
        addedAt: "2024-02-05T00:00:00.000Z",
        totalEpisodes: 10,
        droppedAt: "2024-03-01T00:00:00.000Z",
      },
    });

    dynamoMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler({
      identity: { sub: "user-2" },
      arguments: {
        showId: "show-77",
      },
    });

    expect(result.show).toMatchObject({
      id: "show-77",
      isSubscribed: false,
    });
    expect(result.subscription).toMatchObject({
      showId: "show-77",
      droppedAt: "2024-03-01T00:00:00.000Z",
    });
  });

  it("falls back to batch loading progress for requested episodes", async () => {
    lambdaMock.on(InvokeCommand).resolves({
      Payload: encodePayload({
        id: "show-42",
        title: "Test Show",
        publisher: "Studio",
        description: "Desc",
        htmlDescription: "<p>Desc</p>",
        image: "https://image",
        totalEpisodes: 200,
        externalUrl: "https://spotify/show-42",
        categories: ["Fiction"],
        explicit: false,
        languages: ["en"],
        availableMarkets: ["US"],
        mediaType: "audio",
        isSubscribed: false,
      }),
    });

    dynamoMock.on(GetCommand).resolves({ Item: undefined });
    dynamoMock.on(QueryCommand).resolves({ Items: [] });
    dynamoMock.on(BatchGetCommand).resolves({
      Responses: {
        "test-table": [
          {
            pk: "user#user-1",
            sk: "ep#ep-99",
            episodeId: "ep-99",
            completed: false,
            updatedAt: "2024-02-01T00:00:00.000Z",
            showId: "show-42",
          },
        ],
      },
    });

    const result = await handler({
      identity: { sub: "user-1" },
      arguments: {
        showId: "show-42",
        episodeLimit: 0,
        progressEpisodeIds: ["ep-99"],
      },
    });

    expect(result.progress).toEqual([
      {
        episodeId: "ep-99",
        completed: false,
        updatedAt: "2024-02-01T00:00:00.000Z",
        showId: "show-42",
      },
    ]);
  });
});
