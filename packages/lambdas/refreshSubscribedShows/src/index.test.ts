import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import {
  BatchWriteCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { handler, __internal } from "./index.js";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";

function toUrlString(target: string | URL | Request): string {
  if (typeof target === "string") {
    return target;
  }

  if (target instanceof URL) {
    return target.toString();
  }

  return target.url;
}

const dynamoMock = mockClient(DynamoDBDocumentClient);
const ssmMock = mockClient(SSMClient);

function mockParameter(options: { name: string; value?: string }) {
  const stub = ssmMock.on(GetParameterCommand, {
    Name: options.name,
    WithDecryption: true,
  });

  if (typeof options.value === "string") {
    stub.resolves({ Parameter: { Value: options.value } });
  } else {
    stub.rejects(new Error(`Parameter ${options.name} not found`));
  }
}

describe("refreshSubscribedShows handler", () => {
  beforeEach(() => {
    __internal.resetCaches();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    dynamoMock.reset();
    ssmMock.reset();
  });

  it("returns early when no subscriptions exist", async () => {
    dynamoMock.on(ScanCommand).resolves({ Items: [] });

    const result = await handler();

    expect(result.showsProcessed).toBe(0);
    expect(result.episodesUpserted).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("upserts new episodes and updates show metadata", async () => {
    const scanStub = dynamoMock.on(ScanCommand);
    scanStub.resolvesOnce({
      Items: [
        {
          pk: "user#1",
          sk: "sub#1",
          showId: "show-1",
          title: "Tech Talk",
          publisher: "Pod Co",
          image: "https://img",
          dataType: "subscription",
        },
        { pk: "ignored", sk: "bad", showId: 123 },
      ],
      LastEvaluatedKey: { pk: "cursor" },
    });
    scanStub.resolvesOnce({
      Items: [
        {
          pk: "user#2",
          sk: "sub#2",
          showId: "show-1",
          title: "Tech Talk",
          dataType: "subscription",
        },
        {
          pk: "user#3",
          sk: "sub#3",
          showId: "show-2",
          publisher: "Daily News",
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const queryStub = dynamoMock.on(QueryCommand);
    queryStub.resolvesOnce({
      Items: [{ episodeId: "show-1-ep-1" }, { episodeId: 123 }],
      LastEvaluatedKey: { pk: "more" },
    });
    queryStub.resolvesOnce({ Items: [], LastEvaluatedKey: undefined });
    queryStub.resolvesOnce({
      Items: [{ episodeId: "show-2-ep-1" }],
      LastEvaluatedKey: undefined,
    });

    const batchStub = dynamoMock.on(BatchWriteCommand);

    const newEpisodeTwo = {
      id: "show-1-ep-2",
      name: "Episode Two",
      description: "More tech",
      audio_preview_url: null,
      external_urls: { spotify: "https://spotify/ep2" },
      release_date: "2024-01-02",
      duration_ms: 120_000,
    };

    const newEpisodeThree = {
      id: "show-1-ep-3",
      name: "Episode Three",
      description: undefined,
      audio_preview_url: null,
      release_date: "2024-01-03",
    };

    batchStub.resolvesOnce({
      UnprocessedItems: {
        [process.env.TABLE_NAME!]: [
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

    const putStub = dynamoMock.on(PutCommand);
    putStub.resolves({});

    mockParameter({ name: "/test/spotify/client-id", value: "id" });
    mockParameter({ name: "/test/spotify/client-secret", value: "secret" });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = toUrlString(input);
        if (url === "https://accounts.spotify.com/api/token") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token: "token-123",
                expires_in: 3600,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        if (
          url.startsWith("https://api.spotify.com/v1/shows/show-1/episodes")
        ) {
          const offset = new URL(url).searchParams.get("offset");
          if (offset === "0") {
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  items: [
                    {
                      id: "show-1-ep-1",
                      name: "Episode One",
                      description: "Intro",
                      audio_preview_url: "https://preview",
                      external_urls: { spotify: "https://spotify/ep1" },
                      release_date: "2024-01-01",
                      duration_ms: 100_000,
                    },
                    newEpisodeTwo,
                  ],
                  next: "https://api.spotify.com/v1/shows/show-1/episodes?offset=50",
                }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }
              )
            );
          }

          return Promise.resolve(
            new Response(
              JSON.stringify({
                items: [newEpisodeThree],
                next: null,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        if (
          url.startsWith("https://api.spotify.com/v1/shows/show-2/episodes")
        ) {
          return Promise.resolve(
            new Response(JSON.stringify({ items: [], next: null }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

    const result = await handler();

    expect(result.showsProcessed).toBe(2);
    expect(result.episodesUpserted).toBe(2);

    const batchCalls = dynamoMock.commandCalls(BatchWriteCommand);
    expect(batchCalls).toHaveLength(2);
    const firstBatchCall = batchCalls[0];
    if (!firstBatchCall) {
      throw new Error("Expected batch write call");
    }

    const requestItems =
      firstBatchCall.args[0].input.RequestItems?.[process.env.TABLE_NAME!];
    expect(requestItems).toBeDefined();
    const [firstRequest, secondRequest] = requestItems ?? [];
    expect(requestItems).toHaveLength(2);
    const firstItem = firstRequest?.PutRequest?.Item;
    const secondItem = secondRequest?.PutRequest?.Item;
    expect(firstItem).toBeDefined();
    expect(secondItem).toBeDefined();
    expect(firstItem).toMatchObject({
      pk: "show#show-1",
      sk: "ep#show-1-ep-2",
      audioUrl: "https://spotify/ep2",
      description: "More tech",
      durationSec: 120,
    });
    expect(secondItem).toMatchObject({
      pk: "show#show-1",
      sk: "ep#show-1-ep-3",
      audioUrl: "",
      description: null,
      durationSec: 0,
    });

    const putCalls = dynamoMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(2);
    const firstPutCall = putCalls[0];
    const secondPutCall = putCalls[1];
    if (!firstPutCall || !secondPutCall) {
      throw new Error("Expected two metadata updates");
    }

    const show1Input = firstPutCall.args[0].input;
    expect(show1Input.Item).toBeDefined();
    const show1Item = show1Input.Item!;
    expect(show1Item).toMatchObject({
      pk: "show#show-1",
      sk: "meta",
      showId: "show-1",
      title: "Tech Talk",
      publisher: "Pod Co",
      image: "https://img",
      lastEpisodePublishedAt: "2024-01-01",
    });
    expect(show1Item.lastRefreshedAt).toEqual(expect.any(String));
    expect(show1Item.infoHash).toBe(
      __internal.createInfoHash({
        pk: "user#1",
        sk: "sub#1",
        showId: "show-1",
        title: "Tech Talk",
        publisher: "Pod Co",
        image: "https://img",
      })
    );

    const show2Input = secondPutCall.args[0].input;
    expect(show2Input.Item).toBeDefined();
    const show2Item = show2Input.Item!;
    expect(show2Item.lastEpisodePublishedAt).toBeNull();
    expect(show2Item).toMatchObject({
      pk: "show#show-2",
      sk: "meta",
      title: "",
      publisher: "Daily News",
      image: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("internal helpers", () => {
  beforeEach(() => {
    __internal.resetCaches();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    dynamoMock.reset();
    ssmMock.reset();
  });

  it("loadSubscriptions paginates and filters invalid entries", async () => {
    const scanStub = dynamoMock.on(ScanCommand);
    scanStub.resolvesOnce({
      Items: [
        {
          pk: "p1",
          sk: "s1",
          showId: "show-a",
          title: "Title A",
          publisher: 123,
          image: { url: "noop" },
        },
      ],
      LastEvaluatedKey: { pk: "cursor1" },
    });
    scanStub.resolvesOnce({
      Items: undefined,
      LastEvaluatedKey: { pk: "cursor2" },
    });
    scanStub.resolvesOnce({
      Items: [
        {
          pk: "p2",
          sk: "s2",
          showId: "show-b",
          publisher: "Pub B",
        },
      ],
      LastEvaluatedKey: undefined,
    });

    const subscriptions = await __internal.loadSubscriptions();

    expect(subscriptions).toEqual([
      {
        pk: "p1",
        sk: "s1",
        showId: "show-a",
        title: "Title A",
        publisher: undefined,
        image: undefined,
      },
      {
        pk: "p2",
        sk: "s2",
        showId: "show-b",
        title: undefined,
        publisher: "Pub B",
        image: undefined,
      },
    ]);
  });

  it("listEpisodeIds paginates results and ignores invalid values", async () => {
    const queryStub = dynamoMock.on(QueryCommand);
    queryStub.resolvesOnce({
      Items: [{ episodeId: "ep-1" }, { episodeId: 42 }],
      LastEvaluatedKey: { pk: "cursor" },
    });
    queryStub.resolvesOnce({ Items: undefined, LastEvaluatedKey: undefined });

    const ids = await __internal.listEpisodeIds("show-x");
    expect([...ids]).toEqual(["ep-1"]);
  });

  it("collateShows deduplicates subscriptions by show id", () => {
    const subscriptions = [
      { pk: "p1", sk: "s1", showId: "show-a", title: "A" },
      { pk: "p2", sk: "s2", showId: "show-a", title: "B" },
      { pk: "p3", sk: "s3", showId: "show-b", title: "C" },
    ];

    const map = __internal.collateShows(subscriptions);

    expect([...map.keys()]).toEqual(["show-a", "show-b"]);
    expect(map.get("show-a")?.pk).toBe("p1");
  });

  it("skips upsert when episodes array is empty", async () => {
    await __internal.upsertEpisodes("show-empty", []);
    expect(dynamoMock.commandCalls(BatchWriteCommand)).toHaveLength(0);
  });

  it("maps episode with audio fallback options", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-01T00:00:00Z"));

    const previewEpisode = __internal.mapEpisode("show-1", {
      id: "ep-1",
      name: "Preview",
      description: "desc",
      audio_preview_url: "https://preview",
      release_date: "2024-02-01",
      duration_ms: 30_000,
    });

    const externalEpisode = __internal.mapEpisode("show-1", {
      id: "ep-2",
      name: "External",
      release_date: "2024-02-02",
      external_urls: { spotify: "https://spotify" },
    });

    const emptyEpisode = __internal.mapEpisode("show-1", {
      id: "ep-3",
      name: "None",
      release_date: "2024-02-03",
    });

    expect(previewEpisode.audioUrl).toBe("https://preview");
    expect(externalEpisode.audioUrl).toBe("https://spotify");
    expect(emptyEpisode.audioUrl).toBe("");

    vi.useRealTimers();
  });

  it("splits batch writes into 25 item chunks", async () => {
    const items = Array.from({ length: 30 }, (_, index) => ({
      pk: `show#${index}`,
      sk: `ep#${index}`,
    }));

    dynamoMock.on(BatchWriteCommand).resolves({});

    await __internal.batchWrite(items);

    expect(dynamoMock.commandCalls(BatchWriteCommand)).toHaveLength(2);
  });

  it("retries fetchWithRetry on 401 and clears cached token", async () => {
    __internal.setCachedToken({ token: "stale", expiresAt: Date.now() + 10 });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const response = await __internal.fetchWithRetry("https://api", {});
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(__internal.getCachedToken()).toBeNull();
  });

  it("backs off on 429 without retry header", async () => {
    vi.useFakeTimers();

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const fetchPromise = __internal.fetchWithRetry("https://api", {});

    await vi.runOnlyPendingTimersAsync();
    const response = await fetchPromise;

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("throws when spotify fetch encounters errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("boom", { status: 500 })
    );

    await expect(
      __internal.fetchWithRetry("https://api.spotify.com/v1/fail", {})
    ).rejects.toThrow(/Spotify request failed/);
  });

  it("uses cached Spotify token when valid", async () => {
    __internal.setCachedToken({
      token: "cached",
      expiresAt: Date.now() + 60_000,
    });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const token = await __internal.getSpotifyToken();
    expect(token).toBe("cached");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws when Spotify token response lacks access token", async () => {
    mockParameter({ name: "/test/spotify/client-id", value: "id" });
    mockParameter({ name: "/test/spotify/client-secret", value: "secret" });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ expires_in: 3600 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(__internal.getSpotifyToken()).rejects.toThrow(
      "Missing access token in Spotify response"
    );
  });

  it("memoizes and validates SSM parameters", async () => {
    mockParameter({ name: "param", value: "value" });

    const first = await __internal.getParameter("param");
    const second = await __internal.getParameter("param");

    expect(first).toBe("value");
    expect(second).toBe("value");
    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);
  });

  it("throws when SSM parameter is missing", async () => {
    ssmMock
      .on(GetParameterCommand, {
        Name: "missing",
        WithDecryption: true,
      })
      .resolves({ Parameter: {} });

    await expect(__internal.getParameter("missing")).rejects.toThrow(
      "Parameter missing not found"
    );
  });

  it("creates a stable info hash", () => {
    const hashOne = __internal.createInfoHash({
      pk: "p",
      sk: "s",
      showId: "show",
      title: "Title",
      publisher: "Pub",
      image: "img",
    });

    const hashTwo = __internal.createInfoHash({
      pk: "p2",
      sk: "s2",
      showId: "show",
      title: "Title",
      publisher: "Pub",
      image: "img",
    });

    expect(hashOne).toBe(hashTwo);
  });

  it("delays for specified milliseconds", async () => {
    vi.useFakeTimers();
    const promise = __internal.delay(1000);
    await Promise.resolve();
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });

  it("throws when required env var missing", () => {
    const original = process.env.MISSING_ENV_VAR;
    delete process.env.MISSING_ENV_VAR;

    expect(() => __internal.requiredEnv("MISSING_ENV_VAR")).toThrow(
      "MISSING_ENV_VAR environment variable is required"
    );

    if (original !== undefined) {
      process.env.MISSING_ENV_VAR = original;
    }
  });
});
