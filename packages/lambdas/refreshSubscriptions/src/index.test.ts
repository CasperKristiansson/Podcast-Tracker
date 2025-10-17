import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { handler, __internal } from "./index.js";
import { __internal as spotifyInternal } from "../../spotifyProxy/src/index.js";
import { getDynamoMock } from "../../spotifyProxy/test/index.js";

describe("refresh subscriptions lambda", () => {
  beforeEach(() => {
    spotifyInternal.resetCaches();
  });

  it("returns early when no subscriptions exist", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(ScanCommand).resolves({});

    const getShowSpy = vi.spyOn(spotifyInternal, "getShow");

    const result = await handler();

    expect(getShowSpy).not.toHaveBeenCalled();
    expect(result).toEqual({
      subscriptionsProcessed: 0,
      uniqueShowsProcessed: 0,
      updatesApplied: 0,
      skippedUpdates: 0,
      syncedAt: null,
    });
  });

  it("groups subscriptions by show and updates each record", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock
      .on(ScanCommand)
      .resolvesOnce({
        Items: [
          {
            pk: "user#1",
            sk: "sub#show-1",
            showId: "show-1",
            dataType: "subscription",
          },
          { pk: "user#ignore", sk: "progress#episode-1", dataType: "progress" },
        ],
        LastEvaluatedKey: { pk: "user#checkpoint", sk: "sub#show-2" },
      })
      .resolves({
        Items: [
          {
            pk: "user#2",
            sk: "sub#show-2",
            showId: "show-2",
            dataType: "subscription",
          },
          {
            pk: "user#3",
            sk: "sub#show-1",
            showId: "show-1",
            dataType: "subscription",
          },
          { pk: "user#invalid", sk: "sub#no-show" },
        ],
      });

    const getShowSpy = vi
      .spyOn(spotifyInternal, "getShow")
      .mockImplementation((showId: string) => {
        if (showId === "show-1") {
          return Promise.resolve({
            id: "show-1",
            title: "First Show",
            publisher: "Awesome Audio",
            description: "desc",
            htmlDescription: null,
            image: "https://cdn/show-1.png",
            totalEpisodes: 42,
            externalUrl: null,
            categories: [],
            explicit: false,
            languages: [],
            availableMarkets: [],
            mediaType: "audio",
          });
        }
        if (showId === "show-2") {
          return Promise.resolve({
            id: "show-2",
            title: "",
            publisher: "",
            description: "",
            htmlDescription: "",
            image: null,
            totalEpisodes: -5,
            externalUrl: null,
            categories: [],
            explicit: null,
            languages: [],
            availableMarkets: [],
            mediaType: null,
          });
        }
        return Promise.reject(new Error(`Unexpected showId ${showId}`));
      });

    dynamoMock.on(UpdateCommand).resolves({});

    const result = await handler();

    expect(getShowSpy).toHaveBeenCalledTimes(2);
    expect(result.subscriptionsProcessed).toBe(3);
    expect(result.uniqueShowsProcessed).toBe(2);
    expect(result.updatesApplied).toBe(3);
    expect(result.skippedUpdates).toBe(0);
    expect(result.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const updateCalls = dynamoMock.commandCalls(UpdateCommand);
    expect(updateCalls).toHaveLength(3);

    const callFor = (pk: string, sk: string) =>
      updateCalls.find(
        (call) =>
          call.args[0].input.Key?.pk === pk && call.args[0].input.Key?.sk === sk
      );

    const firstShowCall = callFor("user#1", "sub#show-1");
    expect(firstShowCall).toBeDefined();
    expect(
      firstShowCall?.args[0].input.ExpressionAttributeValues
    ).toMatchObject({
      ":title": "First Show",
      ":publisher": "Awesome Audio",
      ":image": "https://cdn/show-1.png",
      ":totalEpisodes": 42,
    });

    const secondShowCall = callFor("user#2", "sub#show-2");
    expect(secondShowCall).toBeDefined();
    expect(
      secondShowCall?.args[0].input.ExpressionAttributeValues
    ).toMatchObject({
      ":title": "show-2",
      ":publisher": "",
      ":image": "",
      ":totalEpisodes": 0,
    });

    const secondSubscriberCall = callFor("user#3", "sub#show-1");
    expect(secondSubscriberCall).toBeDefined();
    expect(
      secondSubscriberCall?.args[0].input.ExpressionAttributeValues?.[
        ":syncedAt"
      ]
    ).toBe(result.syncedAt);
  });

  it("continues when a subscription has been removed between scan and update", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(ScanCommand).resolves({
      Items: [
        {
          pk: "user#1",
          sk: "sub#show-1",
          showId: "show-1",
          dataType: "subscription",
        },
        {
          pk: "user#2",
          sk: "sub#show-1",
          showId: "show-1",
          dataType: "subscription",
        },
        {
          pk: "user#3",
          sk: "sub#show-1",
          showId: "show-1",
          dataType: "subscription",
        },
      ],
    });

    const getShowSpy = vi.spyOn(spotifyInternal, "getShow").mockResolvedValue({
      id: "show-1",
      title: "Resilient Show",
      publisher: "Network",
      description: "",
      htmlDescription: null,
      image: "",
      totalEpisodes: 10,
      externalUrl: null,
      categories: [],
      explicit: null,
      languages: [],
      availableMarkets: [],
      mediaType: null,
    });

    dynamoMock
      .on(UpdateCommand)
      .resolvesOnce({})
      .rejectsOnce(
        Object.assign(new Error("Gone"), {
          name: "ConditionalCheckFailedException",
        })
      )
      .resolves({});

    const result = await handler();

    expect(getShowSpy).toHaveBeenCalledTimes(1);
    expect(result.updatesApplied).toBe(2);
    expect(result.skippedUpdates).toBe(1);
  });

  it("propagates Spotify failures", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(ScanCommand).resolves({
      Items: [
        {
          pk: "user#1",
          sk: "sub#show-1",
          showId: "show-1",
          dataType: "subscription",
        },
      ],
    });

    vi.spyOn(spotifyInternal, "getShow").mockRejectedValue(
      new Error("Spotify unavailable")
    );

    await expect(handler()).rejects.toThrow("Spotify unavailable");
  });

  it("propagates unexpected DynamoDB update failures", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(ScanCommand).resolves({
      Items: [
        {
          pk: "user#1",
          sk: "sub#show-1",
          showId: "show-1",
          dataType: "subscription",
        },
      ],
    });

    vi.spyOn(spotifyInternal, "getShow").mockResolvedValue({
      id: "show-1",
      title: "Faulty Show",
      publisher: "Publisher",
      description: "",
      htmlDescription: null,
      image: "",
      totalEpisodes: 1,
      externalUrl: null,
      categories: [],
      explicit: null,
      languages: [],
      availableMarkets: [],
      mediaType: null,
    });

    dynamoMock.on(UpdateCommand).rejects(new Error("Write failure"));

    await expect(handler()).rejects.toThrow("Write failure");
  });

  it("normalizes helpers", () => {
    expect(
      __internal.normalizeTotalEpisodes(Number.MAX_SAFE_INTEGER + 10)
    ).toBe(Number.MAX_SAFE_INTEGER + 10);
    expect(__internal.normalizeTotalEpisodes(-10)).toBe(0);
    expect(__internal.normalizeTotalEpisodes("not-a-number")).toBe(0);
    expect(__internal.normalizeTotalEpisodes(Number.POSITIVE_INFINITY)).toBe(0);
    expect(() => {
      __internal.requiredEnv("__MISSING_ENV__");
    }).toThrow("__MISSING_ENV__ environment variable is required");
  });
});
