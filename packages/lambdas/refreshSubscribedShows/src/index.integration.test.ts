import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { mockClient } from "aws-sdk-client-mock";
import { handler, __internal } from "./index.js";

const server = setupServer();
const dynamoMock = mockClient(DynamoDBDocumentClient);
const ssmMock = mockClient(SSMClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const CLIENT_ID_PARAM = process.env.SPOTIFY_CLIENT_ID_PARAM!;
const CLIENT_SECRET_PARAM = process.env.SPOTIFY_CLIENT_SECRET_PARAM!;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
  dynamoMock.reset();
  ssmMock.reset();
  __internal.resetCaches();
});

afterAll(() => {
  server.close();
});

describe("refreshSubscribedShows integration", () => {
  it("fetches latest episodes from Spotify and updates DynamoDB", async () => {
    ssmMock
      .on(GetParameterCommand, {
        Name: CLIENT_ID_PARAM,
        WithDecryption: true,
      })
      .resolves({ Parameter: { Value: "client-id" } });
    ssmMock
      .on(GetParameterCommand, {
        Name: CLIENT_SECRET_PARAM,
        WithDecryption: true,
      })
      .resolves({ Parameter: { Value: "client-secret" } });

    const scanStub = dynamoMock.on(ScanCommand);
    scanStub.resolvesOnce({
      Items: [
        {
          pk: "user#1",
          sk: "sub#1",
          showId: "show-1",
          title: "Tech Talk",
          publisher: "Pod Co",
          image: "https://cover",
          dataType: "subscription",
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const queryStub = dynamoMock.on(QueryCommand);
    queryStub.resolvesOnce({
      Items: [{ episodeId: "show-1-ep-1" }],
      LastEvaluatedKey: undefined,
    });

    const batchStub = dynamoMock.on(BatchWriteCommand);
    batchStub.resolvesOnce({
      UnprocessedItems: {
        [TABLE_NAME]: [
          {
            PutRequest: {
              Item: {
                pk: "show#show-1",
                sk: "ep#show-1-ep-2",
              },
            },
          },
        ],
      },
    });
    batchStub.resolves({});

    dynamoMock.on(PutCommand).resolves({});

    let tokenRequests = 0;
    let episodeRequests = 0;

    server.use(
      http.post("https://accounts.spotify.com/api/token", ({ request }) => {
        tokenRequests += 1;
        const auth = request.headers.get("authorization");
        expect(auth).toBe(
          `Basic ${Buffer.from("client-id:client-secret").toString("base64")}`
        );
        return HttpResponse.json({
          access_token: "access-token",
          expires_in: 3600,
        });
      }),
      http.get(
        "https://api.spotify.com/v1/shows/:showId/episodes",
        ({ params, request }) => {
          episodeRequests += 1;
          const { showId } = params as { showId: string };
          const url = new URL(request.url);
          const offset = url.searchParams.get("offset") ?? "0";

          if (showId === "show-1") {
            if (offset === "0") {
              return HttpResponse.json({
                items: [
                  {
                    id: "show-1-ep-1",
                    name: "Episode 1",
                    description: "Intro",
                    audio_preview_url: "https://audio/1",
                    release_date: "2024-01-01",
                    duration_ms: 90_000,
                  },
                  {
                    id: "show-1-ep-2",
                    name: "Episode 2",
                    description: "Deep dive",
                    external_urls: { spotify: "https://spotify/ep2" },
                    release_date: "2024-01-02",
                    duration_ms: 120_000,
                  },
                ],
                next: "https://api.spotify.com/v1/shows/show-1/episodes?offset=50",
              });
            }

            return HttpResponse.json({
              items: [
                {
                  id: "show-1-ep-3",
                  name: "Episode 3",
                  release_date: "2024-01-03",
                },
              ],
              next: null,
            });
          }

          return HttpResponse.json({
            items: [],
            next: null,
          });
        }
      )
    );

    const result = await handler();

    expect(result).toMatchObject({
      showsProcessed: 1,
      episodesUpserted: 2,
    });
    expect(tokenRequests).toBe(1);
    expect(episodeRequests).toBe(3);

    const batchCalls = dynamoMock.commandCalls(BatchWriteCommand);
    expect(batchCalls).toHaveLength(2);

    const putCalls = dynamoMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    const metadata = putCalls[0].args[0].input.Item!;
    expect(metadata).toMatchObject({
      pk: "show#show-1",
      sk: "meta",
      showId: "show-1",
      title: "Tech Talk",
    });
    expect(metadata.lastEpisodePublishedAt).toBe("2024-01-01");
  });
});
