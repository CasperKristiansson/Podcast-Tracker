import { describe, expect, it } from "vitest";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { handler, __internal } from "./index.js";
import { getDynamoMock } from "../../spotifyProxy/test/index.js";

describe("profile lambda", () => {
  it("throws when identity missing", async () => {
    await expect(handler({ identity: null })).rejects.toThrow("Unauthorized");
  });

  it("returns empty profile when no subscriptions", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler({ identity: { sub: "abc" } });

    expect(result).toEqual({
      stats: {
        totalShows: 0,
        episodesCompleted: 0,
        episodesInProgress: 0,
      },
      spotlight: [],
      shows: [],
    });
  });

  it("aggregates profile stats and spotlight", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock
      .on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            pk: "user#abc",
            sk: "sub#show-1",
            showId: "show-1",
            title: "First Show",
            publisher: "Audio Co",
            image: "https://cdn/show-1.png",
            addedAt: "2024-01-10T00:00:00.000Z",
            totalEpisodes: 30,
            subscriptionSyncedAt: "2024-02-02T00:00:00.000Z",
          },
          {
            pk: "user#abc",
            sk: "sub#show-2",
            showId: "show-2",
            title: "Second Show",
            publisher: "Studio",
            image: "",
            addedAt: "2024-01-05T00:00:00.000Z",
            totalEpisodes: 12,
            subscriptionSyncedAt: null,
          },
        ],
      })
      .resolves({
        Items: [
          { pk: "user#abc", sk: "ep#1", showId: "show-1", completed: true },
          { pk: "user#abc", sk: "ep#2", showId: "show-1", completed: false },
          { pk: "user#abc", sk: "ep#3", showId: "show-2", completed: true },
          { pk: "user#abc", sk: "ep#4", completed: true },
        ],
      });

    const result = await handler({ identity: { sub: "abc" } });

    expect(result.stats).toEqual({
      totalShows: 2,
      episodesCompleted: 2,
      episodesInProgress: 1,
    });

    expect(result.shows).toHaveLength(2);

    const firstShow = result.shows[0];
    expect(firstShow).toMatchObject({
      showId: "show-1",
      completedEpisodes: 1,
      inProgressEpisodes: 1,
      unlistenedEpisodes: 29,
      subscriptionSyncedAt: "2024-02-02T00:00:00.000Z",
    });

    const secondShow = result.shows[1];
    expect(secondShow).toMatchObject({
      showId: "show-2",
      completedEpisodes: 1,
      inProgressEpisodes: 0,
      unlistenedEpisodes: 11,
    });

    expect(result.spotlight.map((item) => item.showId)).toEqual([
      "show-1",
      "show-2",
    ]);
  });

  it("buildProfile handles subscriptions without progress", () => {
    const subs = [
      {
        showId: "show-1",
        title: "Solo Show",
        publisher: "Indie",
        image: "",
        addedAt: "2024-01-01T00:00:00.000Z",
        totalEpisodes: 5,
        subscriptionSyncedAt: null,
      },
    ];
    const progresses = [{ showId: "show-unknown", completed: true }];

    const profile = __internal.buildProfile(subs, progresses);

    expect(profile.stats).toEqual({
      totalShows: 1,
      episodesCompleted: 0,
      episodesInProgress: 0,
    });
    expect(profile.shows[0]?.unlistenedEpisodes).toBe(5);
  });

  it("toSubscriptionRecord validates data", () => {
    const record = __internal.toSubscriptionRecord({
      showId: "show-3",
      title: 123,
      publisher: null,
      image: 42,
      totalEpisodes: -10,
    });

    expect(record).toMatchObject({
      showId: "show-3",
      title: "",
      publisher: "",
      image: "",
      totalEpisodes: 0,
    });

    const missing = __internal.toSubscriptionRecord({ title: "Missing" });
    expect(missing).toBeNull();
  });

  it("collectSubscriptionRecords skips invalid entries", () => {
    const target: Array<Record<string, unknown>> = [];
    __internal.collectSubscriptionRecords(
      {
        Items: [
          {
            showId: "show-9",
            title: "Valid",
            publisher: "P",
            image: "",
            addedAt: "2024-01-01T00:00:00.000Z",
            totalEpisodes: 1,
          },
          { title: "Missing" },
        ],
      } as never,
      target as never
    );

    expect(target).toHaveLength(1);
    expect(target[0]?.showId).toBe("show-9");

    __internal.collectSubscriptionRecords({} as never, target as never);
    expect(target).toHaveLength(1);
  });

  it("collectProgressRecords normalizes entries", () => {
    const target: unknown[] = [];
    __internal.collectProgressRecords(
      {
        Items: [
          { showId: "show-5", completed: true },
          { showId: "show-6", completed: false },
          { showId: 10, completed: "yes" },
        ],
      } as never,
      target as never
    );

    expect(target).toEqual([
      { showId: "show-5", completed: true },
      { showId: "show-6", completed: false },
      { showId: null, completed: null },
    ]);

    __internal.collectProgressRecords({} as never, target as never);
    expect(target.length).toBe(3);
  });

  it("sorts shows by backlog then completion", () => {
    const subs = [
      {
        showId: "show-a",
        title: "Alpha",
        publisher: "Pub",
        image: "",
        addedAt: "2024-01-01T00:00:00.000Z",
        totalEpisodes: 10,
        subscriptionSyncedAt: null,
      },
      {
        showId: "show-b",
        title: "Beta",
        publisher: "Pub",
        image: "",
        addedAt: "2024-01-02T00:00:00.000Z",
        totalEpisodes: 10,
        subscriptionSyncedAt: null,
      },
    ];
    const progress = [
      { showId: "show-a", completed: true },
      { showId: "show-a", completed: true },
      { showId: "show-b", completed: true },
    ];

    const profile = __internal.buildProfile(subs, progress);

    expect(profile.shows.map((show) => show.showId)).toEqual([
      "show-b",
      "show-a",
    ]);
  });

  it("prioritizes higher completion when backlog matches", () => {
    const subs = [
      {
        showId: "show-a",
        title: "Alpha",
        publisher: "Pub",
        image: "",
        addedAt: "2024-01-01T00:00:00.000Z",
        totalEpisodes: 10,
        subscriptionSyncedAt: null,
      },
      {
        showId: "show-b",
        title: "Beta",
        publisher: "Pub",
        image: "",
        addedAt: "2024-01-02T00:00:00.000Z",
        totalEpisodes: 12,
        subscriptionSyncedAt: null,
      },
    ];
    const progress = [
      { showId: "show-a", completed: true },
      { showId: "show-a", completed: true },
      { showId: "show-b", completed: true },
      { showId: "show-b", completed: true },
      { showId: "show-b", completed: true },
      { showId: "show-b", completed: true },
    ];

    const profile = __internal.buildProfile(subs, progress);

    expect(profile.shows.map((show) => show.showId)).toEqual([
      "show-b",
      "show-a",
    ]);
  });

  it("uses alphabetical order when metrics match", () => {
    const subs = [
      {
        showId: "show-a",
        title: "Alpha",
        publisher: "Pub",
        image: "",
        addedAt: "2024-01-01T00:00:00.000Z",
        totalEpisodes: 10,
        subscriptionSyncedAt: null,
      },
      {
        showId: "show-b",
        title: "Beta",
        publisher: "Pub",
        image: "",
        addedAt: "2024-01-02T00:00:00.000Z",
        totalEpisodes: 10,
        subscriptionSyncedAt: null,
      },
    ];
    const progress = [
      { showId: "show-a", completed: true },
      { showId: "show-a", completed: true },
      { showId: "show-b", completed: true },
      { showId: "show-b", completed: true },
    ];

    const profile = __internal.buildProfile(subs, progress);

    expect(profile.shows.map((show) => show.showId)).toEqual([
      "show-a",
      "show-b",
    ]);
  });

  it("requiredEnv throws for missing variables", () => {
    expect(() => __internal.requiredEnv("__missing__")).toThrow(
      "__missing__ environment variable is required"
    );
  });

  it("handler builds spotlight with alphabetical fallback", async () => {
    const dynamoMock = getDynamoMock();
    dynamoMock
      .on(QueryCommand)
      .resolvesOnce({
        Items: [
          {
            pk: "user#abc",
            sk: "sub#show-1",
            showId: "show-1",
            title: "Beta",
            publisher: "One",
            image: "",
            addedAt: "2024-01-01T00:00:00.000Z",
            totalEpisodes: 10,
          },
          {
            pk: "user#abc",
            sk: "sub#show-2",
            showId: "show-2",
            title: "Alpha",
            publisher: "Two",
            image: "",
            addedAt: "2024-01-02T00:00:00.000Z",
            totalEpisodes: 10,
          },
        ],
      })
      .resolves({
        Items: [
          { pk: "user#abc", sk: "ep#1", showId: "show-1", completed: true },
          { pk: "user#abc", sk: "ep#2", showId: "show-1", completed: true },
          { pk: "user#abc", sk: "ep#3", showId: "show-1", completed: true },
          { pk: "user#abc", sk: "ep#4", showId: "show-1", completed: true },
          { pk: "user#abc", sk: "ep#5", showId: "show-2", completed: true },
          { pk: "user#abc", sk: "ep#6", showId: "show-2", completed: true },
          { pk: "user#abc", sk: "ep#7", showId: "show-2", completed: true },
          { pk: "user#abc", sk: "ep#8", showId: "show-2", completed: true },
        ],
      });

    const result = await handler({ identity: { sub: "abc" } });
    expect(result.spotlight.map((item) => item.title)).toEqual([
      "Alpha",
      "Beta",
    ]);
  });
});
