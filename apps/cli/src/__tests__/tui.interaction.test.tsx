import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "ink-testing-library";
import stripAnsi from "strip-ansi";
import { PodcastTrackerApp } from "../tui/PodcastTrackerApp.js";

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const createApiMock = () => {
  const api = {
    myProfile: vi.fn().mockResolvedValue({
      stats: {
        totalShows: 1,
        episodesCompleted: 2,
        episodesInProgress: 1,
      },
      spotlight: [
        {
          showId: "show-1",
          title: "Alpha Show",
          publisher: "Publisher One",
          image: "",
          addedAt: new Date().toISOString(),
          totalEpisodes: 20,
          completedEpisodes: 2,
          inProgressEpisodes: 1,
          unlistenedEpisodes: 18,
          subscriptionSyncedAt: null,
          ratingStars: null,
          ratingReview: null,
          ratingUpdatedAt: null,
          droppedAt: null,
        },
      ],
      shows: [
        {
          showId: "show-1",
          title: "Alpha Show",
          publisher: "Publisher One",
          image: "",
          addedAt: new Date().toISOString(),
          totalEpisodes: 20,
          completedEpisodes: 2,
          inProgressEpisodes: 1,
          unlistenedEpisodes: 18,
          subscriptionSyncedAt: null,
          ratingStars: null,
          ratingReview: null,
          ratingUpdatedAt: null,
          droppedAt: null,
        },
      ],
    }),
    searchShows: vi.fn().mockResolvedValue([
      {
        id: "show-2",
        title: "Beta Podcast",
        publisher: "Publisher Two",
        description: null,
        htmlDescription: null,
        image: null,
        totalEpisodes: 12,
        externalUrl: null,
        categories: [],
        explicit: false,
        languages: [],
        availableMarkets: [],
        mediaType: "audio",
        isSubscribed: false,
      },
    ]),
    showDetail: vi.fn().mockResolvedValue({
      show: {
        id: "show-1",
        title: "Alpha Show",
        publisher: "Publisher One",
        description: "Show description",
        htmlDescription: null,
        image: null,
        totalEpisodes: 20,
        externalUrl: null,
        categories: [],
        explicit: false,
        languages: [],
        availableMarkets: [],
        mediaType: "audio",
        isSubscribed: true,
      },
      subscription: {
        showId: "show-1",
        title: "Alpha Show",
        publisher: "Publisher One",
        image: "",
        addedAt: new Date().toISOString(),
        totalEpisodes: 20,
        subscriptionSyncedAt: null,
        ratingStars: null,
        ratingReview: null,
        ratingUpdatedAt: null,
        droppedAt: null,
      },
      episodes: {
        items: [
          {
            showId: "show-1",
            episodeId: "ep-1",
            title: "Episode 1",
            audioUrl: "https://example.com/ep1.mp3",
            publishedAt: new Date().toISOString(),
            durationSec: 1200,
            description: null,
            htmlDescription: null,
            image: null,
            linkUrl: null,
            explicit: false,
            isExternallyHosted: false,
            isPlayable: true,
            releaseDatePrecision: "day",
            languages: ["en"],
          },
        ],
        nextToken: null,
      },
      progress: [],
    }),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    dropShow: vi.fn(),
    rateShow: vi.fn(),
    markEpisodeProgress: vi.fn(),
    markNextEpisodeComplete: vi.fn(),
    markAllEpisodesComplete: vi.fn(),
    episodeDetails: vi.fn(),
  };

  return api;
};

const createFilterPagingApiMock = () => {
  const firstPublishedAt = new Date("2026-01-01T00:00:00.000Z").toISOString();
  const secondPublishedAt = new Date("2026-01-02T00:00:00.000Z").toISOString();

  const api = createApiMock();
  api.showDetail = vi
    .fn()
    .mockImplementation((_showId: string, _limit: number, cursor?: string) => {
      if (!cursor) {
        return {
          show: {
            id: "show-1",
            title: "Alpha Show",
            publisher: "Publisher One",
            description: "Show description",
            htmlDescription: null,
            image: null,
            totalEpisodes: 20,
            externalUrl: null,
            categories: [],
            explicit: false,
            languages: [],
            availableMarkets: [],
            mediaType: "audio",
            isSubscribed: true,
          },
          subscription: {
            showId: "show-1",
            title: "Alpha Show",
            publisher: "Publisher One",
            image: "",
            addedAt: new Date().toISOString(),
            totalEpisodes: 20,
            subscriptionSyncedAt: null,
            ratingStars: null,
            ratingReview: null,
            ratingUpdatedAt: null,
            droppedAt: null,
          },
          episodes: {
            items: [
              {
                showId: "show-1",
                episodeId: "ep-1",
                title: "Episode 1",
                audioUrl: "https://example.com/ep1.mp3",
                publishedAt: firstPublishedAt,
                durationSec: 1200,
                description: null,
                htmlDescription: null,
                image: null,
                linkUrl: null,
                explicit: false,
                isExternallyHosted: false,
                isPlayable: true,
                releaseDatePrecision: "day",
                languages: ["en"],
              },
            ],
            nextToken: "cursor-2",
          },
          progress: [
            {
              showId: "show-1",
              episodeId: "ep-1",
              completed: true,
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      }

      return {
        show: {
          id: "show-1",
          title: "Alpha Show",
          publisher: "Publisher One",
          description: "Show description",
          htmlDescription: null,
          image: null,
          totalEpisodes: 20,
          externalUrl: null,
          categories: [],
          explicit: false,
          languages: [],
          availableMarkets: [],
          mediaType: "audio",
          isSubscribed: true,
        },
        subscription: {
          showId: "show-1",
          title: "Alpha Show",
          publisher: "Publisher One",
          image: "",
          addedAt: new Date().toISOString(),
          totalEpisodes: 20,
          subscriptionSyncedAt: null,
          ratingStars: null,
          ratingReview: null,
          ratingUpdatedAt: null,
          droppedAt: null,
        },
        episodes: {
          items: [
            {
              showId: "show-1",
              episodeId: "ep-2",
              title: "Episode 2",
              audioUrl: "https://example.com/ep2.mp3",
              publishedAt: secondPublishedAt,
              durationSec: 1200,
              description: null,
              htmlDescription: null,
              image: null,
              linkUrl: null,
              explicit: false,
              isExternallyHosted: false,
              isPlayable: true,
              releaseDatePrecision: "day",
              languages: ["en"],
            },
          ],
          nextToken: null,
        },
        progress: [
          {
            showId: "show-1",
            episodeId: "ep-1",
            completed: true,
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    });
  return api;
};

const createManualPaginationApiMock = () => {
  const api = createApiMock();
  api.showDetail = vi
    .fn()
    .mockImplementation((_showId: string, _limit: number, cursor?: string) => {
      if (!cursor) {
        return {
          show: {
            id: "show-1",
            title: "Alpha Show",
            publisher: "Publisher One",
            description: "Show description",
            htmlDescription: null,
            image: null,
            totalEpisodes: 20,
            externalUrl: null,
            categories: [],
            explicit: false,
            languages: [],
            availableMarkets: [],
            mediaType: "audio",
            isSubscribed: true,
          },
          subscription: {
            showId: "show-1",
            title: "Alpha Show",
            publisher: "Publisher One",
            image: "",
            addedAt: new Date().toISOString(),
            totalEpisodes: 20,
            subscriptionSyncedAt: null,
            ratingStars: null,
            ratingReview: null,
            ratingUpdatedAt: null,
            droppedAt: null,
          },
          episodes: {
            items: [
              {
                showId: "show-1",
                episodeId: "ep-1",
                title: "Episode 1",
                audioUrl: "https://example.com/ep1.mp3",
                publishedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
                durationSec: 1200,
                description: null,
                htmlDescription: null,
                image: null,
                linkUrl: null,
                explicit: false,
                isExternallyHosted: false,
                isPlayable: true,
                releaseDatePrecision: "day",
                languages: ["en"],
              },
            ],
            nextToken: "cursor-2",
          },
          progress: [],
        };
      }

      return {
        show: {
          id: "show-1",
          title: "Alpha Show",
          publisher: "Publisher One",
          description: "Show description",
          htmlDescription: null,
          image: null,
          totalEpisodes: 20,
          externalUrl: null,
          categories: [],
          explicit: false,
          languages: [],
          availableMarkets: [],
          mediaType: "audio",
          isSubscribed: true,
        },
        subscription: {
          showId: "show-1",
          title: "Alpha Show",
          publisher: "Publisher One",
          image: "",
          addedAt: new Date().toISOString(),
          totalEpisodes: 20,
          subscriptionSyncedAt: null,
          ratingStars: null,
          ratingReview: null,
          ratingUpdatedAt: null,
          droppedAt: null,
        },
        episodes: {
          items: [
            {
              showId: "show-1",
              episodeId: "ep-2",
              title: "Episode 2",
              audioUrl: "https://example.com/ep2.mp3",
              publishedAt: new Date("2026-01-02T00:00:00.000Z").toISOString(),
              durationSec: 1200,
              description: null,
              htmlDescription: null,
              image: null,
              linkUrl: null,
              explicit: false,
              isExternallyHosted: false,
              isPlayable: true,
              releaseDatePrecision: "day",
              languages: ["en"],
            },
          ],
          nextToken: null,
        },
        progress: [],
      };
    });
  return api;
};

describe("tui interaction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports help/search/show navigation interactions", async () => {
    const api = createApiMock();

    const instance = render(
      React.createElement(PodcastTrackerApp, {
        api: api as never,
        sessionManager: {} as never,
      })
    );

    await sleep(40);

    const readFrame = (): string => stripAnsi(instance.lastFrame() ?? "");

    expect(readFrame()).toContain("Podcast Tracker CLI");
    expect(api.myProfile).toHaveBeenCalledTimes(1);

    instance.stdin.write("?");
    await sleep(30);
    expect(readFrame()).toContain("Keyboard Help");

    instance.stdin.write("?");
    await sleep(30);

    instance.stdin.write("/");
    await sleep(30);
    expect(readFrame()).toContain("Search podcasts");

    instance.stdin.write("p");
    await sleep(30);
    instance.stdin.write("o");
    await sleep(420);
    expect(api.searchShows).toHaveBeenCalled();

    instance.stdin.write("\u001b");
    await sleep(30);

    instance.stdin.write("\r");
    await sleep(60);
    expect(api.showDetail).toHaveBeenCalledWith("show-1", 25, undefined);
    expect(readFrame()).toContain("Show Detail");

    instance.stdin.write("b");
    await sleep(40);
    expect(readFrame()).toContain("Home");

    instance.unmount();
  });

  it("auto-loads extra pages for filtered episodes in show view", async () => {
    const api = createFilterPagingApiMock();

    const instance = render(
      React.createElement(PodcastTrackerApp, {
        api: api as never,
        sessionManager: {} as never,
      })
    );

    await sleep(40);

    instance.stdin.write("\r");
    await sleep(80);
    expect(api.showDetail).toHaveBeenCalledWith("show-1", 25, undefined);

    instance.stdin.write("f");
    await sleep(160);

    expect(api.showDetail).toHaveBeenCalledWith("show-1", 25, "cursor-2");
    const frame = stripAnsi(instance.lastFrame() ?? "");
    expect(frame).toContain("view: unplayed");
    expect(frame).toContain("Episode 2");

    instance.unmount();
  });

  it("loads the next filtered page when ] is pressed", async () => {
    const api = createManualPaginationApiMock();
    const instance = render(
      React.createElement(PodcastTrackerApp, {
        api: api as never,
        sessionManager: {} as never,
      })
    );

    await sleep(40);
    instance.stdin.write("\r");
    await sleep(80);
    expect(api.showDetail).toHaveBeenCalledWith("show-1", 25, undefined);

    instance.stdin.write("f");
    await sleep(40);
    instance.stdin.write("]");
    await sleep(140);

    expect(api.showDetail).toHaveBeenCalledWith("show-1", 25, "cursor-2");
    const frame = stripAnsi(instance.lastFrame() ?? "");
    expect(frame).toContain("view: unplayed");
    expect(frame).toContain("Episode 2");

    instance.unmount();
  });

  it("marks episode progress locally without refetching show detail", async () => {
    const api = createApiMock();
    api.markEpisodeProgress = vi.fn().mockResolvedValue(undefined);

    const instance = render(
      React.createElement(PodcastTrackerApp, {
        api: api as never,
        sessionManager: {} as never,
      })
    );

    await sleep(40);
    instance.stdin.write("\r");
    await sleep(80);
    expect(api.showDetail).toHaveBeenCalledTimes(1);

    instance.stdin.write(" ");
    await sleep(120);

    expect(api.markEpisodeProgress).toHaveBeenCalledWith(
      "show-1",
      "ep-1",
      true
    );
    expect(api.showDetail).toHaveBeenCalledTimes(1);
    const frame = stripAnsi(instance.lastFrame() ?? "");
    expect(frame).toContain("[x] Episode 1");

    instance.unmount();
  });
});
