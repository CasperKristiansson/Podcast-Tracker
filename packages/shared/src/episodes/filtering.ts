export type EpisodePlaybackFilter = "all" | "unplayed" | "played";

interface EpisodeLike {
  episodeId?: string | null;
}

interface AutoLoadFilterOptions {
  filter: EpisodePlaybackFilter;
  filteredCount: number;
  hasNextPage: boolean;
  initialLoading: boolean;
  loadingMore: boolean;
}

export const filterEpisodesByPlayback = <T extends EpisodeLike>(
  episodes: readonly T[],
  filter: EpisodePlaybackFilter,
  isPlayed: (episodeId: string) => boolean
): T[] => {
  if (filter === "all") {
    return [...episodes];
  }

  return episodes.filter((episode) => {
    const episodeId = episode.episodeId;
    if (!episodeId) {
      return false;
    }

    const played = isPlayed(episodeId);
    return filter === "played" ? played : !played;
  });
};

export const shouldAutoLoadMoreForEpisodeFilter = ({
  filter,
  filteredCount,
  hasNextPage,
  initialLoading,
  loadingMore,
}: AutoLoadFilterOptions): boolean => {
  if (filter === "all") {
    return false;
  }

  if (initialLoading || loadingMore) {
    return false;
  }

  if (!hasNextPage) {
    return false;
  }

  return filteredCount === 0;
};

export const mergeEpisodesById = <T extends EpisodeLike>(
  previous: readonly T[],
  next: readonly T[]
): T[] => {
  const merged: T[] = [...previous];
  const seenIds = new Set(
    previous.map((episode) => episode.episodeId).filter(Boolean)
  );

  for (const episode of next) {
    const episodeId = episode.episodeId;
    if (!episodeId) {
      merged.push(episode);
      continue;
    }
    if (seenIds.has(episodeId)) {
      continue;
    }
    seenIds.add(episodeId);
    merged.push(episode);
  }

  return merged;
};
