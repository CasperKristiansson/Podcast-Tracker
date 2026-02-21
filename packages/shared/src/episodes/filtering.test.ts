import { describe, expect, it } from "vitest";
import {
  filterEpisodesByPlayback,
  mergeEpisodesById,
  shouldAutoLoadMoreForEpisodeFilter,
  type EpisodePlaybackFilter,
} from "./filtering";

interface FakeEpisode {
  episodeId: string;
  title: string;
}

const toPlayedLookup = (
  playedIds: string[]
): ((episodeId: string) => boolean) => {
  const played = new Set(playedIds);
  return (episodeId: string) => played.has(episodeId);
};

describe("episode filtering utilities", () => {
  const episodes: FakeEpisode[] = [
    { episodeId: "ep-1", title: "Episode 1" },
    { episodeId: "ep-2", title: "Episode 2" },
  ];

  it("filters episodes by playback state", () => {
    const playedLookup = toPlayedLookup(["ep-1"]);
    const played = filterEpisodesByPlayback(episodes, "played", playedLookup);
    const unplayed = filterEpisodesByPlayback(
      episodes,
      "unplayed",
      playedLookup
    );

    expect(played.map((entry) => entry.episodeId)).toEqual(["ep-1"]);
    expect(unplayed.map((entry) => entry.episodeId)).toEqual(["ep-2"]);
  });

  it("returns all episodes for 'all' filter", () => {
    const all = filterEpisodesByPlayback(
      episodes,
      "all",
      toPlayedLookup(["ep-1"])
    );
    expect(all.map((entry) => entry.episodeId)).toEqual(["ep-1", "ep-2"]);
  });

  it("auto-loads additional pages only when filtered view is empty and next page exists", () => {
    const filters: EpisodePlaybackFilter[] = ["played", "unplayed"];
    for (const filter of filters) {
      expect(
        shouldAutoLoadMoreForEpisodeFilter({
          filter,
          filteredCount: 0,
          hasNextPage: true,
          initialLoading: false,
          loadingMore: false,
        })
      ).toBe(true);
    }

    expect(
      shouldAutoLoadMoreForEpisodeFilter({
        filter: "all",
        filteredCount: 0,
        hasNextPage: true,
        initialLoading: false,
        loadingMore: false,
      })
    ).toBe(false);

    expect(
      shouldAutoLoadMoreForEpisodeFilter({
        filter: "played",
        filteredCount: 1,
        hasNextPage: true,
        initialLoading: false,
        loadingMore: false,
      })
    ).toBe(false);
  });

  it("merges pages without duplicating episode ids", () => {
    const merged = mergeEpisodesById(
      [{ episodeId: "ep-1", title: "Episode 1" }],
      [
        { episodeId: "ep-1", title: "Episode 1 duplicate" },
        { episodeId: "ep-2", title: "Episode 2" },
      ]
    );

    expect(merged.map((entry) => entry.episodeId)).toEqual(["ep-1", "ep-2"]);
  });
});
