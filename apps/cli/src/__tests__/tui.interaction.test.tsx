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
});
