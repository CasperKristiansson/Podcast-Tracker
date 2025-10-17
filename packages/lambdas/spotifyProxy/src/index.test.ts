import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { handler, __internal } from "./index.js";
import { getDynamoMock, getSsmMock, mockParameter } from "../test/index.js";

function toUrlString(target: string | URL | Request): string {
  if (typeof target === "string") {
    return target;
  }

  if (target instanceof URL) {
    return target.toString();
  }

  return target.url;
}

type ShowSummary = {
  id: string;
  title: string;
  publisher: string;
  description: string;
  image: string | null;
  totalEpisodes: number;
};

type EpisodesSummary = {
  id: string;
  showId: string | null;
  title: string;
  description: string;
  audioUrl: string | null | undefined;
  publishedAt: string;
  durationSec: number;
};

type ListResponse<T> = { items: T[]; nextCursor?: string | null };

describe("spotify proxy handler", () => {
  beforeEach(() => {
    __internal.resetCaches();
  });

  it("rejects unsupported fields", async () => {
    await expect(
      handler({
        info: { fieldName: "unknownField" },
        arguments: {},
      })
    ).rejects.toThrow("Unsupported field unknownField");
  });

  it("requires a search term", async () => {
    await expect(
      handler({
        info: { fieldName: "search" },
        arguments: { term: "" },
      })
    ).rejects.toThrow("term is required");
  });

  it("requires showId for getShow", async () => {
    await expect(
      handler({
        info: { fieldName: "getShow" },
        arguments: { showId: "   " },
      })
    ).rejects.toThrow("showId is required");
  });

  it("requires showId for getEpisodes", async () => {
    await expect(
      handler({
        info: { fieldName: "getEpisodes" },
        arguments: { showId: undefined },
      })
    ).rejects.toThrow("showId is required");
  });

  it("propagates Spotify API failures after retry attempts", async () => {
    vi.useFakeTimers();
    const dynamoMock = getDynamoMock();
    dynamoMock.on(GetCommand).resolves({});

    let apiCallCount = 0;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = toUrlString(input);
        if (url === "https://accounts.spotify.com/api/token") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token: "token",
                expires_in: 3600,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        if (url.startsWith("https://api.spotify.com/v1")) {
          apiCallCount += 1;
          if (apiCallCount <= 2) {
            const headers =
              apiCallCount === 1 ? { "retry-after": "1" } : undefined;
            return Promise.resolve(
              new Response("", {
                status: 429,
                headers,
              })
            );
          }

          return Promise.resolve(
            new Response("Internal Server Error", { status: 500 })
          );
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

    vi.spyOn(__internal, "getCachedValueOrFetch").mockImplementation(
      async (_key, _ttl, fetcher) => fetcher()
    );

    mockParameter({
      name: "/test/spotify/client-id",
      value: "id",
    });
    mockParameter({
      name: "/test/spotify/client-secret",
      value: "secret",
    });

    const pending = handler({
      info: { fieldName: "search" },
      arguments: { term: "podcast" },
    });

    const expectation = expect(pending).rejects.toThrow(
      /Spotify request failed \(500\): Internal Server Error/
    );

    await vi.runAllTimersAsync();
    await expectation;

    expect(fetchMock).toHaveBeenCalledTimes(4);

    vi.useRealTimers();
  });

  it("throws when Spotify token response is missing access token", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(GetCommand).resolves({});

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = toUrlString(input);
        if (url === "https://accounts.spotify.com/api/token") {
          return Promise.resolve(
            new Response(JSON.stringify({ expires_in: 3600 }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

    vi.spyOn(__internal, "getCachedValueOrFetch").mockImplementation(
      async (_key, _ttl, fetcher) => fetcher()
    );

    mockParameter({
      name: "/test/spotify/client-id",
      value: "id",
    });
    mockParameter({
      name: "/test/spotify/client-secret",
      value: "secret",
    });

    await expect(
      handler({
        info: { fieldName: "search" },
        arguments: { term: "tokenless" },
      })
    ).rejects.toThrow("Missing access token in Spotify response");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns mapped shows for searchShows and caches response", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(GetCommand).resolves({});
    dynamoMock.on(PutCommand).resolves({});

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
                access_token: "primary-token",
                expires_in: 3600,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        if (url.startsWith("https://api.spotify.com/v1/search")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                shows: {
                  items: [
                    {
                      id: "show-1",
                      name: "The Daily",
                      publisher: "Publisher",
                      description: "News",
                      images: [{ url: "https://image" }],
                      total_episodes: 100,
                    },
                    {
                      id: "show-2",
                      name: "Mystery Hour",
                      publisher: "Indie",
                      description: "Stories",
                      images: [],
                    },
                  ],
                },
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

    const result = (await handler({
      info: { fieldName: "searchShows" },
      arguments: { term: "tech", limit: 5, offset: 10 },
    })) as ListResponse<ShowSummary>;

    expect(result.items).toEqual([
      {
        id: "show-1",
        title: "The Daily",
        publisher: "Publisher",
        description: "News",
        image: "https://image",
        totalEpisodes: 100,
      },
      {
        id: "show-2",
        title: "Mystery Hour",
        publisher: "Indie",
        description: "Stories",
        image: null,
        totalEpisodes: 0,
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(1);
  });

  it("returns empty list for searchSpotify when no shows present", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(GetCommand).resolves({});
    dynamoMock.on(PutCommand).resolves({});

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
                access_token: "secondary-token",
                expires_in: 3600,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        if (url.startsWith("https://api.spotify.com/v1/search")) {
          return Promise.resolve(
            new Response(JSON.stringify({}), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

    const result = (await handler({
      info: { fieldName: "searchSpotify" },
      arguments: { term: "nothing" },
    })) as ListResponse<ShowSummary>;

    expect(result.items).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns mapped show details for getShow", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(GetCommand).resolves({});
    dynamoMock.on(PutCommand).resolves({});

    mockParameter({ name: "/test/spotify/client-id", value: "id" });
    mockParameter({ name: "/test/spotify/client-secret", value: "secret" });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = toUrlString(input);
        if (url === "https://accounts.spotify.com/api/token") {
          return Promise.resolve(
            new Response(
              JSON.stringify({ access_token: "show-token", expires_in: 3600 }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        if (url.startsWith("https://api.spotify.com/v1/shows")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: "show-42",
                name: "Answer",
                publisher: "Universe",
                description: "Life",
                images: [{ url: "https://cover" }],
                total_episodes: 99,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

    const result = await handler({
      info: { fieldName: "getShow" },
      arguments: { showId: "show-42" },
    });

    expect(result).toEqual({
      id: "show-42",
      title: "Answer",
      publisher: "Universe",
      description: "Life",
      image: "https://cover",
      totalEpisodes: 99,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns mapped episodes and parses next cursor", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(GetCommand).resolves({});
    dynamoMock.on(PutCommand).resolves({});

    mockParameter({ name: "/test/spotify/client-id", value: "id" });
    mockParameter({ name: "/test/spotify/client-secret", value: "secret" });

    const episodeResponses = [
      {
        items: [
          {
            id: "show-1:episode-1",
            name: "Episode 1",
            description: "Desc",
            audio_preview_url: "https://audio-1",
            release_date: "2024-01-01",
            duration_ms: 123000,
            show: { id: "show-1" },
          },
          {
            id: "show-2:episode-2",
            name: "Episode 2",
            description: "Desc",
            audio_preview_url: null,
            release_date: "2024-01-02",
            duration_ms: undefined,
          },
        ],
        next: "https://api.spotify.com/v1/shows/show-1/episodes?offset=30",
      },
      {
        items: undefined as unknown as [],
        next: null,
      },
    ];

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = toUrlString(input);
        if (url === "https://accounts.spotify.com/api/token") {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                access_token: "episodes-token",
                expires_in: 3600,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            )
          );
        }

        if (url.startsWith("https://api.spotify.com/v1/shows")) {
          const payload = episodeResponses.shift();
          return Promise.resolve(
            new Response(JSON.stringify(payload), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

    const first = (await handler({
      info: { fieldName: "getEpisodes" },
      arguments: { showId: "show-1", limit: 60, cursor: "20" },
    })) as ListResponse<EpisodesSummary>;

    expect(first).toEqual({
      items: [
        {
          id: "show-1:episode-1",
          showId: "show-1",
          title: "Episode 1",
          description: "Desc",
          audioUrl: "https://audio-1",
          publishedAt: "2024-01-01",
          durationSec: 123,
        },
        {
          id: "show-2:episode-2",
          showId: "show-2",
          title: "Episode 2",
          description: "Desc",
          audioUrl: null,
          publishedAt: "2024-01-02",
          durationSec: 0,
        },
      ],
      nextCursor: "30",
    });

    const second = (await handler({
      info: { fieldName: "getShowEpisodes" },
      arguments: { showId: "show-1" },
    })) as ListResponse<EpisodesSummary>;

    expect(second).toEqual({ items: [], nextCursor: null });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("internal helpers", () => {
  beforeEach(() => {
    __internal.resetCaches();
  });

  it("memoizes SSM parameter values", async () => {
    const ssmMock = getSsmMock();
    mockParameter({ name: "cached-param", value: "value-1" });

    const first = await __internal.getParameter("cached-param");
    const second = await __internal.getParameter("cached-param");

    expect(first).toBe("value-1");
    expect(second).toBe("value-1");
    expect(ssmMock.commandCalls(GetParameterCommand)).toHaveLength(1);
  });

  it("throws when SSM parameter lacks a value", async () => {
    const ssmMock = getSsmMock();
    ssmMock
      .on(GetParameterCommand, {
        Name: "missing-param",
        WithDecryption: true,
      })
      .resolves({ Parameter: {} });

    await expect(__internal.getParameter("missing-param")).rejects.toThrow(
      "Parameter missing-param not found"
    );
  });

  it("reuses cached Spotify token while valid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    mockParameter({ name: "/test/spotify/client-id", value: "id" });
    mockParameter({ name: "/test/spotify/client-secret", value: "secret" });

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ access_token: "cached-token", expires_in: 3600 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const first = await __internal.getSpotifyToken();
    expect(first).toBe("cached-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockImplementation(() =>
      Promise.reject(new Error("should not fetch again"))
    );
    fetchMock.mockClear();

    const second = await __internal.getSpotifyToken();
    expect(second).toBe("cached-token");
    expect(fetchMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("retries fetch when receiving 401 and clears cached token", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 401 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    __internal.setCachedToken({
      token: "stale",
      expiresAt: Date.now() + 60000,
    });

    const response = await __internal.fetchWithRetry("https://api.test", {
      headers: {},
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(__internal.getCachedToken()).toBeNull();
  });

  it("throws when required environment variable missing", () => {
    const original = process.env.MISSING_ENV;
    delete process.env.MISSING_ENV;

    expect(() => __internal.requiredEnv("MISSING_ENV")).toThrow(
      "MISSING_ENV environment variable is required"
    );

    if (original !== undefined) {
      process.env.MISSING_ENV = original;
    } else {
      delete process.env.MISSING_ENV;
    }
  });
});
