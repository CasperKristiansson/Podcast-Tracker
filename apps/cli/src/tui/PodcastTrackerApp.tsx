import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Box, Text, useApp, useInput } from "ink";
import type {
  ProfileShow,
  SearchShowsQuery,
  ShowDetailQuery,
} from "../../../../packages/shared/src/generated/graphql.js";
import {
  filterEpisodesByPlayback,
  mergeEpisodesById,
  shouldAutoLoadMoreForEpisodeFilter,
  type EpisodePlaybackFilter,
} from "../../../../packages/shared/src/episodes/filtering.js";
import type { PodcastApi } from "../graphql/api.js";
import { normalizeApiError } from "../graphql/errors.js";
import type { SessionManager } from "../auth/session-manager.js";
import {
  formatDateTime,
  formatNumber,
  stripHtml,
  truncate,
} from "../utils/format.js";
import { openUrl } from "../utils/open-url.js";

type SortMode = "unlistened" | "title" | "recent";
type FilterMode = "all" | "active" | "dropped";
type SearchFocus = "input" | "results";

interface ToastState {
  message: string;
  tone: "info" | "success" | "error";
}

interface SearchState {
  open: boolean;
  query: string;
  loading: boolean;
  error: string | null;
  results: SearchShowsQuery["search"];
  selectedIndex: number;
  focus: SearchFocus;
}

interface ShowScreenState {
  showId: string;
  detail: ShowDetailQuery["showDetail"] | null;
  loading: boolean;
  loadingMoreEpisodes: boolean;
  error: string | null;
  selectedEpisodeIndex: number;
  episodeFilter: EpisodePlaybackFilter;
}

interface ConfirmState {
  action: "unsubscribe" | "drop";
  showId: string;
  title: string;
}

interface RatingState {
  open: boolean;
  stars: number;
  review: string;
  saving: boolean;
}

interface PodcastTrackerAppProps {
  api: PodcastApi;
  sessionManager: SessionManager;
}

const PAGE_SIZE = 25;
const VISIBLE_ROWS = 14;

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const pickSortModes: SortMode[] = ["unlistened", "title", "recent"];
const pickFilterModes: FilterMode[] = ["all", "active", "dropped"];
const pickEpisodeFilterModes: EpisodePlaybackFilter[] = [
  "all",
  "unplayed",
  "played",
];

const nextInCycle = <T extends string>(items: readonly T[], current: T): T => {
  const index = items.indexOf(current);
  if (index < 0) {
    return items[0]!;
  }
  return items[(index + 1) % items.length]!;
};

const isPrintableInput = (input: string): boolean => {
  return input.length === 1 && !/\s/.test(input) ? true : input === " ";
};

const renderTone = (tone: ToastState["tone"]): string => {
  if (tone === "error") {
    return "red";
  }
  if (tone === "success") {
    return "green";
  }
  return "cyan";
};

const toSearchResultSubscription = (
  item: SearchShowsQuery["search"][number]
): boolean => {
  return Boolean(item.isSubscribed);
};

const sortAndFilterShows = (
  shows: ProfileShow[],
  sortMode: SortMode,
  filterMode: FilterMode
): ProfileShow[] => {
  const filtered = shows.filter((show) => {
    const isDropped = Boolean(show.droppedAt);
    if (filterMode === "active") {
      return !isDropped;
    }
    if (filterMode === "dropped") {
      return isDropped;
    }
    return true;
  });

  const sorted = [...filtered];

  if (sortMode === "title") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }

  if (sortMode === "recent") {
    const toDateEpoch = (value: unknown): number => {
      if (typeof value !== "string") {
        return 0;
      }
      const epoch = new Date(value).getTime();
      return Number.isFinite(epoch) ? epoch : 0;
    };

    sorted.sort((a, b) => {
      const aTime = toDateEpoch(a.addedAt);
      const bTime = toDateEpoch(b.addedAt);
      return bTime - aTime;
    });
    return sorted;
  }

  sorted.sort((a, b) => {
    const unlistenedDelta = b.unlistenedEpisodes - a.unlistenedEpisodes;
    if (unlistenedDelta !== 0) {
      return unlistenedDelta;
    }
    return a.title.localeCompare(b.title);
  });

  return sorted;
};

const withBoundedIndex = <T,>(items: T[], index: number): number => {
  if (items.length === 0) {
    return 0;
  }
  return clamp(index, 0, items.length - 1);
};

const useDebouncedSearch = (
  enabled: boolean,
  query: string,
  onSearch: (query: string) => Promise<void>
): void => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(() => {
      void onSearch(trimmed);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, onSearch, query]);
};

const lineForShow = (show: ProfileShow): string => {
  const dropped = show.droppedAt ? "dropped" : "active";
  return `${truncate(show.title, 44)} · ${show.publisher} · ${show.unlistenedEpisodes} unlistened · ${dropped}`;
};

const lineForEpisode = (
  episode: NonNullable<
    ShowDetailQuery["showDetail"]["episodes"]["items"][number]
  >,
  completed: boolean
): string => {
  const marker = completed ? "[x]" : "[ ]";
  const date = formatDateTime(
    typeof episode.publishedAt === "string" ? episode.publishedAt : null
  );
  return `${marker} ${truncate(episode.title ?? "Untitled episode", 56)} · ${date}`;
};

const getWindowedRows = <T,>(
  items: T[],
  selectedIndex: number,
  maxRows: number
): {
  rows: T[];
  start: number;
} => {
  if (items.length <= maxRows) {
    return { rows: items, start: 0 };
  }

  const half = Math.floor(maxRows / 2);
  let start = Math.max(0, selectedIndex - half);
  if (start + maxRows > items.length) {
    start = Math.max(0, items.length - maxRows);
  }

  return {
    rows: items.slice(start, start + maxRows),
    start,
  };
};

export function PodcastTrackerApp({
  api,
}: PodcastTrackerAppProps): JSX.Element {
  const app = useApp();

  const [profileShows, setProfileShows] = useState<ProfileShow[]>([]);
  const [spotlightShows, setSpotlightShows] = useState<ProfileShow[]>([]);
  const [stats, setStats] = useState({
    totalShows: 0,
    episodesCompleted: 0,
    episodesInProgress: 0,
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [sortMode, setSortMode] = useState<SortMode>("unlistened");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedHomeIndex, setSelectedHomeIndex] = useState(0);

  const [showState, setShowState] = useState<ShowScreenState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [rating, setRating] = useState<RatingState>({
    open: false,
    stars: 3,
    review: "",
    saving: false,
  });

  const [search, setSearch] = useState<SearchState>({
    open: false,
    query: "",
    loading: false,
    error: null,
    results: [],
    selectedIndex: 0,
    focus: "input",
  });

  const searchReqRef = useRef(0);

  const isShowScreen = Boolean(showState);

  const filteredSortedShows = useMemo(() => {
    return sortAndFilterShows(profileShows, sortMode, filterMode);
  }, [profileShows, sortMode, filterMode]);

  const selectedHomeShow = filteredSortedShows[selectedHomeIndex] ?? null;

  useEffect(() => {
    setSelectedHomeIndex((current) =>
      withBoundedIndex(filteredSortedShows, current)
    );
  }, [filteredSortedShows]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = setTimeout(() => {
      setToast(null);
    }, 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await api.myProfile();
      setStats({
        totalShows: data.stats.totalShows,
        episodesCompleted: data.stats.episodesCompleted,
        episodesInProgress: data.stats.episodesInProgress,
      });
      setProfileShows(
        (data.shows ?? []).filter((item): item is ProfileShow => Boolean(item))
      );
      setSpotlightShows(
        (data.spotlight ?? []).filter((item): item is ProfileShow =>
          Boolean(item)
        )
      );
    } catch (error) {
      setProfileError(normalizeApiError(error));
    } finally {
      setProfileLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const loadShowDetail = useCallback(
    async (showId: string, append = false) => {
      setShowState((current) => {
        if (current?.showId !== showId) {
          return {
            showId,
            detail: null,
            loading: true,
            loadingMoreEpisodes: false,
            error: null,
            selectedEpisodeIndex: 0,
            episodeFilter: "all",
          };
        }

        if (append) {
          return {
            ...current,
            loadingMoreEpisodes: true,
            error: null,
          };
        }

        return {
          ...current,
          loading: true,
          loadingMoreEpisodes: false,
          error: null,
        };
      });

      try {
        const current =
          append && showState?.showId === showId ? showState.detail : null;
        const nextToken = current?.episodes.nextToken ?? undefined;
        const detail = await api.showDetail(
          showId,
          PAGE_SIZE,
          append ? nextToken : undefined
        );

        if (!append || !current) {
          setShowState((state) => ({
            showId,
            detail,
            loading: false,
            loadingMoreEpisodes: false,
            error: null,
            selectedEpisodeIndex:
              state?.showId === showId ? state.selectedEpisodeIndex : 0,
            episodeFilter:
              state?.showId === showId ? state.episodeFilter : "all",
          }));
          return;
        }

        const existingEpisodes = current.episodes.items ?? [];
        const nextEpisodes = detail.episodes.items ?? [];
        const mergedEpisodes = mergeEpisodesById(
          existingEpisodes,
          nextEpisodes
        );
        const progressMap = new Map(
          (current.progress ?? [])
            .filter((entry): entry is NonNullable<typeof entry> =>
              Boolean(entry?.episodeId)
            )
            .map((entry) => [entry.episodeId, entry])
        );
        for (const entry of detail.progress ?? []) {
          if (!entry?.episodeId) {
            continue;
          }
          progressMap.set(entry.episodeId, entry);
        }

        setShowState((state) => {
          if (state?.showId !== showId || !state.detail) {
            return state;
          }
          return {
            ...state,
            loading: false,
            loadingMoreEpisodes: false,
            detail: {
              ...detail,
              episodes: {
                ...detail.episodes,
                items: mergedEpisodes,
              },
              progress: Array.from(progressMap.values()),
            },
          };
        });
      } catch (error) {
        setShowState((current) => {
          if (current?.showId !== showId) {
            return current;
          }
          return {
            ...current,
            loading: false,
            loadingMoreEpisodes: false,
            error: normalizeApiError(error),
          };
        });
      }
    },
    [api, showState?.detail, showState?.showId]
  );

  const openShow = useCallback(
    async (showId: string) => {
      await loadShowDetail(showId, false);
    },
    [loadShowDetail]
  );

  const closeShow = useCallback(() => {
    setShowState(null);
  }, []);

  const runSafeAction = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      if (busy) {
        return;
      }
      setBusy(true);
      try {
        await action();
        setToast({ message: successMessage, tone: "success" });
      } catch (error) {
        setToast({ message: normalizeApiError(error), tone: "error" });
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  const toggleSearchSubscription = useCallback(
    async (item: SearchShowsQuery["search"][number]) => {
      await runSafeAction(
        async () => {
          if (toSearchResultSubscription(item)) {
            await api.unsubscribe(item.id);
          } else {
            await api.subscribe({
              id: item.id,
              title: item.title,
              publisher: item.publisher,
              image: item.image,
              totalEpisodes: item.totalEpisodes,
            });
          }

          setSearch((current) => {
            const updatedResults = current.results.map((entry) => {
              if (entry.id !== item.id) {
                return entry;
              }
              return {
                ...entry,
                isSubscribed: !toSearchResultSubscription(item),
              };
            });
            return {
              ...current,
              results: updatedResults,
            };
          });

          await refreshProfile();
          if (showState?.showId === item.id) {
            await loadShowDetail(item.id, false);
          }
        },
        toSearchResultSubscription(item)
          ? `Removed ${item.title} from library.`
          : `Added ${item.title} to library.`
      );
    },
    [api, loadShowDetail, refreshProfile, runSafeAction, showState?.showId]
  );

  const searchShows = useCallback(
    async (term: string) => {
      const requestId = ++searchReqRef.current;
      setSearch((current) => ({
        ...current,
        loading: true,
        error: null,
      }));

      try {
        const results = await api.searchShows(term, 15, 0);
        if (requestId !== searchReqRef.current) {
          return;
        }

        setSearch((current) => ({
          ...current,
          loading: false,
          error: null,
          results,
          selectedIndex: withBoundedIndex(results, current.selectedIndex),
        }));
      } catch (error) {
        if (requestId !== searchReqRef.current) {
          return;
        }

        setSearch((current) => ({
          ...current,
          loading: false,
          error: normalizeApiError(error),
        }));
      }
    },
    [api]
  );

  useDebouncedSearch(search.open, search.query, searchShows);

  const currentShow = showState?.detail?.show ?? null;
  const currentSubscription = showState?.detail?.subscription ?? null;
  const currentEpisodes = (showState?.detail?.episodes.items ?? []).filter(
    (
      item
    ): item is NonNullable<
      ShowDetailQuery["showDetail"]["episodes"]["items"][number]
    > => Boolean(item)
  );

  const progressMap = useMemo(() => {
    const map = new Map<string, boolean>();
    (showState?.detail?.progress ?? []).forEach((entry) => {
      if (!entry?.episodeId) {
        return;
      }
      map.set(entry.episodeId, Boolean(entry.completed));
    });
    return map;
  }, [showState?.detail?.progress]);

  const filteredEpisodes = useMemo(() => {
    return filterEpisodesByPlayback(
      currentEpisodes,
      showState?.episodeFilter ?? "all",
      (episodeId) => progressMap.get(episodeId) ?? false
    );
  }, [currentEpisodes, progressMap, showState?.episodeFilter]);

  useEffect(() => {
    setShowState((current) => {
      if (!current) {
        return current;
      }
      const nextIndex = withBoundedIndex(
        filteredEpisodes,
        current.selectedEpisodeIndex
      );
      if (nextIndex === current.selectedEpisodeIndex) {
        return current;
      }
      return {
        ...current,
        selectedEpisodeIndex: nextIndex,
      };
    });
  }, [filteredEpisodes]);

  const autoLoadingFilteredEpisodes = shouldAutoLoadMoreForEpisodeFilter({
    filter: showState?.episodeFilter ?? "all",
    filteredCount: filteredEpisodes.length,
    hasNextPage: Boolean(showState?.detail?.episodes.nextToken),
    initialLoading: Boolean(showState?.loading),
    loadingMore: Boolean(showState?.loadingMoreEpisodes),
  });

  useEffect(() => {
    if (!showState?.showId || !autoLoadingFilteredEpisodes) {
      return;
    }
    void loadShowDetail(showState.showId, true);
  }, [autoLoadingFilteredEpisodes, loadShowDetail, showState?.showId]);

  const selectedEpisode =
    filteredEpisodes[showState?.selectedEpisodeIndex ?? 0] ?? null;

  const openSearch = useCallback(() => {
    setSearch({
      open: true,
      query: "",
      loading: false,
      error: null,
      results: [],
      selectedIndex: 0,
      focus: "input",
    });
  }, []);

  const closeSearch = useCallback(() => {
    setSearch((current) => ({
      ...current,
      open: false,
      query: "",
      results: [],
      error: null,
      loading: false,
      selectedIndex: 0,
      focus: "input",
    }));
  }, []);

  const markNextForShow = useCallback(
    async (showId: string, title: string) => {
      await runSafeAction(async () => {
        await api.markNextEpisodeComplete(showId);
        await refreshProfile();
        if (showState?.showId === showId) {
          await loadShowDetail(showId, false);
        }
      }, `Logged next episode for ${title}.`);
    },
    [api, loadShowDetail, refreshProfile, runSafeAction, showState?.showId]
  );

  const applyLocalEpisodeProgress = useCallback(
    (showId: string, episodeId: string, completed: boolean) => {
      setShowState((current) => {
        if (current?.showId !== showId || !current.detail) {
          return current;
        }

        const updatedAt = new Date().toISOString();
        let replaced = false;
        const nextProgress = (current.detail.progress ?? []).map((entry) => {
          if (!entry?.episodeId || entry.episodeId !== episodeId) {
            return entry;
          }
          replaced = true;
          return {
            ...entry,
            completed,
            updatedAt,
            showId: entry.showId ?? showId,
          };
        });

        if (!replaced) {
          nextProgress.push({
            __typename: "Progress",
            episodeId,
            completed,
            updatedAt,
            showId,
          });
        }

        return {
          ...current,
          detail: {
            ...current.detail,
            progress: nextProgress,
          },
        };
      });
    },
    []
  );

  const openRating = useCallback(() => {
    const stars = currentSubscription?.ratingStars ?? 3;
    const review = currentSubscription?.ratingReview ?? "";
    setRating({
      open: true,
      stars: clamp(stars, 1, 5),
      review,
      saving: false,
    });
  }, [currentSubscription?.ratingReview, currentSubscription?.ratingStars]);

  useInput((input, key) => {
    const normalizedInput = input.toLowerCase();

    if (helpOpen) {
      if (normalizedInput === "?" || normalizedInput === "q" || key.escape) {
        setHelpOpen(false);
      }
      return;
    }

    if (confirm) {
      if (normalizedInput === "y" || key.return) {
        const confirmAction = confirm;
        setConfirm(null);
        void runSafeAction(
          async () => {
            if (confirmAction.action === "unsubscribe") {
              await api.unsubscribe(confirmAction.showId);
              await refreshProfile();
              if (showState?.showId === confirmAction.showId) {
                setShowState(null);
              }
              return;
            }

            await api.dropShow(confirmAction.showId);
            await refreshProfile();
            if (showState?.showId === confirmAction.showId) {
              await loadShowDetail(confirmAction.showId, false);
            }
          },
          confirmAction.action === "unsubscribe"
            ? `Unsubscribed from ${confirmAction.title}.`
            : `Dropped ${confirmAction.title}.`
        );
        return;
      }

      if (normalizedInput === "n" || key.escape) {
        setConfirm(null);
      }
      return;
    }

    if (rating.open && showState?.showId) {
      if (key.escape) {
        setRating((current) => ({ ...current, open: false }));
        return;
      }

      if (key.return && !rating.saving) {
        void runSafeAction(async () => {
          setRating((current) => ({ ...current, saving: true }));
          await api.rateShow(showState.showId, rating.stars, rating.review);
          await loadShowDetail(showState.showId, false);
          await refreshProfile();
          setRating({
            open: false,
            stars: rating.stars,
            review: rating.review,
            saving: false,
          });
        }, "Saved show rating.");
        return;
      }

      if (key.leftArrow) {
        setRating((current) => ({
          ...current,
          stars: clamp(current.stars - 1, 1, 5),
        }));
        return;
      }

      if (key.rightArrow) {
        setRating((current) => ({
          ...current,
          stars: clamp(current.stars + 1, 1, 5),
        }));
        return;
      }

      if (/[1-5]/.test(normalizedInput)) {
        setRating((current) => ({
          ...current,
          stars: Number.parseInt(normalizedInput, 10),
        }));
        return;
      }

      if (key.backspace || key.delete) {
        setRating((current) => ({
          ...current,
          review: current.review.slice(0, -1),
        }));
        return;
      }

      if (isPrintableInput(input) && !key.ctrl && !key.meta) {
        setRating((current) => ({
          ...current,
          review: `${current.review}${input}`,
        }));
      }

      return;
    }

    if (search.open) {
      if (key.escape || normalizedInput === "q") {
        closeSearch();
        return;
      }

      if (key.tab) {
        setSearch((current) => ({
          ...current,
          focus: current.focus === "input" ? "results" : "input",
        }));
        return;
      }

      if (search.focus === "input") {
        if (key.return) {
          setSearch((current) => ({
            ...current,
            focus: "results",
          }));
          return;
        }

        if (key.backspace || key.delete) {
          setSearch((current) => ({
            ...current,
            query: current.query.slice(0, -1),
            selectedIndex: 0,
          }));
          return;
        }

        if (isPrintableInput(input) && !key.ctrl && !key.meta) {
          setSearch((current) => ({
            ...current,
            query: `${current.query}${input}`,
          }));
        }
        return;
      }

      if (normalizedInput === "j" || key.downArrow) {
        setSearch((current) => ({
          ...current,
          selectedIndex: withBoundedIndex(
            current.results,
            current.selectedIndex + 1
          ),
        }));
        return;
      }

      if (normalizedInput === "k" || key.upArrow) {
        setSearch((current) => ({
          ...current,
          selectedIndex: withBoundedIndex(
            current.results,
            current.selectedIndex - 1
          ),
        }));
        return;
      }

      if (normalizedInput === "s") {
        const item = search.results[search.selectedIndex];
        if (item) {
          void toggleSearchSubscription(item);
        }
        return;
      }

      if (key.return) {
        const item = search.results[search.selectedIndex];
        if (!item) {
          return;
        }

        closeSearch();
        void openShow(item.id);
      }
      return;
    }

    if (normalizedInput === "?") {
      setHelpOpen(true);
      return;
    }

    if (normalizedInput === "/") {
      openSearch();
      return;
    }

    if (isShowScreen && showState) {
      const episodesLength = filteredEpisodes.length;

      if (normalizedInput === "q" || normalizedInput === "b") {
        closeShow();
        return;
      }

      if (normalizedInput === "r") {
        void loadShowDetail(showState.showId, false);
        return;
      }

      if (normalizedInput === "j" || key.downArrow) {
        setShowState((current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            selectedEpisodeIndex: clamp(
              current.selectedEpisodeIndex + 1,
              0,
              Math.max(episodesLength - 1, 0)
            ),
          };
        });
        return;
      }

      if (normalizedInput === "k" || key.upArrow) {
        setShowState((current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            selectedEpisodeIndex: clamp(
              current.selectedEpisodeIndex - 1,
              0,
              Math.max(episodesLength - 1, 0)
            ),
          };
        });
        return;
      }

      if (normalizedInput === "n") {
        const title = currentShow?.title ?? "show";
        void markNextForShow(showState.showId, title);
        return;
      }

      if (normalizedInput === "f") {
        setShowState((current) => {
          if (!current) {
            return current;
          }
          return {
            ...current,
            episodeFilter: nextInCycle(
              pickEpisodeFilterModes,
              current.episodeFilter
            ),
            selectedEpisodeIndex: 0,
          };
        });
        return;
      }

      if (normalizedInput === "a") {
        void runSafeAction(async () => {
          const count = await api.markAllEpisodesComplete(showState.showId);
          await loadShowDetail(showState.showId, false);
          await refreshProfile();
          setToast({
            message: `Marked ${count} episodes complete.`,
            tone: "success",
          });
        }, "Updated all episodes.");
        return;
      }

      if (normalizedInput === "s" && currentShow) {
        void runSafeAction(
          async () => {
            const activeSubscription = Boolean(
              showState.detail?.subscription &&
                !showState.detail.subscription.droppedAt
            );
            if (activeSubscription) {
              await api.unsubscribe(showState.showId);
            } else {
              await api.subscribe({
                id: currentShow.id,
                title: currentShow.title ?? "",
                publisher: currentShow.publisher ?? "",
                image: currentShow.image,
                totalEpisodes: currentShow.totalEpisodes,
              });
            }
            await loadShowDetail(showState.showId, false);
            await refreshProfile();
          },
          showState.detail?.subscription &&
            !showState.detail.subscription.droppedAt
            ? "Unsubscribed from show."
            : "Subscribed to show."
        );
        return;
      }

      if (normalizedInput === "u") {
        if (currentShow) {
          setConfirm({
            action: "unsubscribe",
            showId: showState.showId,
            title: currentShow.title ?? "this show",
          });
        }
        return;
      }

      if (normalizedInput === "d") {
        if (currentShow) {
          setConfirm({
            action: "drop",
            showId: showState.showId,
            title: currentShow.title ?? "this show",
          });
        }
        return;
      }

      if (normalizedInput === "t") {
        if (!currentShow) {
          return;
        }
        openRating();
        return;
      }

      if (normalizedInput === "o") {
        const episodeLink = selectedEpisode?.linkUrl;
        const showLink = currentShow?.externalUrl;
        const target = episodeLink ?? showLink;
        if (!target) {
          setToast({ message: "No external URL available.", tone: "info" });
          return;
        }
        void runSafeAction(async () => {
          await openUrl(target);
        }, "Opened URL in browser.");
        return;
      }

      if (normalizedInput === "]") {
        const next = showState.detail?.episodes.nextToken;
        if (next && !showState.loadingMoreEpisodes) {
          void loadShowDetail(showState.showId, true);
        }
        return;
      }

      if (key.return || normalizedInput === " ") {
        const episode = selectedEpisode;
        if (!episode?.episodeId) {
          return;
        }
        const completed = progressMap.get(episode.episodeId) ?? false;
        void runSafeAction(
          async () => {
            await api.markEpisodeProgress(
              showState.showId,
              episode.episodeId,
              !completed
            );
            applyLocalEpisodeProgress(
              showState.showId,
              episode.episodeId,
              !completed
            );
            await refreshProfile();
          },
          completed
            ? "Marked episode as uncompleted."
            : "Marked episode complete."
        );
      }

      return;
    }

    if (normalizedInput === "q") {
      app.exit();
      return;
    }

    if (normalizedInput === "r") {
      void refreshProfile();
      return;
    }

    if (normalizedInput === "s") {
      setSortMode((current) => nextInCycle(pickSortModes, current));
      return;
    }

    if (normalizedInput === "f") {
      setFilterMode((current) => nextInCycle(pickFilterModes, current));
      return;
    }

    if (normalizedInput === "g") {
      setSelectedHomeIndex(0);
      return;
    }

    if (normalizedInput === "j" || key.downArrow) {
      setSelectedHomeIndex((current) =>
        clamp(current + 1, 0, Math.max(filteredSortedShows.length - 1, 0))
      );
      return;
    }

    if (normalizedInput === "k" || key.upArrow) {
      setSelectedHomeIndex((current) =>
        clamp(current - 1, 0, Math.max(filteredSortedShows.length - 1, 0))
      );
      return;
    }

    if (normalizedInput === "u") {
      if (!selectedHomeShow) {
        return;
      }
      setConfirm({
        action: "unsubscribe",
        showId: selectedHomeShow.showId,
        title: selectedHomeShow.title,
      });
      return;
    }

    if (normalizedInput === "n") {
      if (!selectedHomeShow) {
        return;
      }
      void markNextForShow(selectedHomeShow.showId, selectedHomeShow.title);
      return;
    }

    if (key.return) {
      if (!selectedHomeShow) {
        return;
      }
      void openShow(selectedHomeShow.showId);
    }
  });

  const homeRows = getWindowedRows(
    filteredSortedShows,
    selectedHomeIndex,
    VISIBLE_ROWS
  );

  const showRows = getWindowedRows(
    filteredEpisodes,
    showState?.selectedEpisodeIndex ?? 0,
    VISIBLE_ROWS
  );
  const activeScreenLabel = search.open
    ? "Search"
    : isShowScreen
      ? "Show Detail"
      : "Home";

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" paddingX={1} flexDirection="column">
        <Text>
          Podcast Tracker CLI · {activeScreenLabel} · sort: {sortMode} · filter:{" "}
          {filterMode}
        </Text>
        <Text color="gray">
          Stats: {formatNumber(stats.totalShows)} shows ·{" "}
          {formatNumber(stats.episodesCompleted)} completed ·{" "}
          {formatNumber(stats.episodesInProgress)} in-progress
        </Text>
      </Box>

      {profileLoading ? (
        <Box marginTop={1}>
          <Text color="yellow">Loading profile…</Text>
        </Box>
      ) : null}

      {profileError ? (
        <Box marginTop={1}>
          <Text color="red">Profile error: {profileError}</Text>
        </Box>
      ) : null}

      {search.open ? (
        <Box
          marginTop={1}
          flexDirection="column"
          borderStyle="round"
          paddingX={1}
        >
          <Text color="cyan">Search podcasts</Text>
          <Text color="gray">
            Focus: {search.focus} · query: "{search.query}"{" "}
            {search.loading ? "· loading…" : ""}
          </Text>
          <Text color="gray">
            Type to search, Enter from input to move to results, Tab toggles
            focus, Esc/q closes search.
          </Text>
          {search.error ? <Text color="red">{search.error}</Text> : null}
          {search.results.length === 0 &&
          search.query.trim().length >= 2 &&
          !search.loading ? (
            <Text color="gray">No results.</Text>
          ) : null}
          {search.results.slice(0, 10).map((item, index) => {
            const active =
              search.focus === "results" && index === search.selectedIndex;
            return (
              <Text
                key={`search-${item.id}`}
                color={active ? "green" : undefined}
              >
                {active ? "❯" : " "} {truncate(item.title, 42)} ·{" "}
                {item.publisher} · {item.totalEpisodes} eps ·{" "}
                {toSearchResultSubscription(item)
                  ? "subscribed"
                  : "not subscribed"}
              </Text>
            );
          })}
          <Text color="gray">
            Results mode keys: j/k move · Enter open · s subscribe toggle
          </Text>
        </Box>
      ) : !isShowScreen ? (
        <Box marginTop={1} flexDirection="column">
          <Text color="cyan">Spotlight</Text>
          {spotlightShows.length === 0 ? (
            <Text color="gray">No spotlight shows yet.</Text>
          ) : (
            spotlightShows.slice(0, 4).map((show) => (
              <Text key={`spotlight-${show.showId}`}>
                • {truncate(show.title, 42)} · {show.unlistenedEpisodes}{" "}
                unlistened
              </Text>
            ))
          )}

          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">Library ({filteredSortedShows.length})</Text>
            {filteredSortedShows.length === 0 ? (
              <Text color="gray">No shows in this filter.</Text>
            ) : null}
            {homeRows.rows.map((show, idx) => {
              const absoluteIndex = homeRows.start + idx;
              const active = absoluteIndex === selectedHomeIndex;
              return (
                <Text key={show.showId} color={active ? "green" : undefined}>
                  {active ? "❯" : " "} {lineForShow(show)}
                </Text>
              );
            })}
          </Box>
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          {showState?.loading ? (
            <Text color="yellow">Loading show…</Text>
          ) : null}
          {showState?.loadingMoreEpisodes ? (
            <Text color="yellow">Loading more episodes…</Text>
          ) : null}
          {showState?.error ? <Text color="red">{showState.error}</Text> : null}
          {currentShow ? (
            <>
              <Text color="cyan">
                {truncate(currentShow.title ?? "Untitled show", 60)} ·{" "}
                {currentShow.publisher ?? "Unknown publisher"}
              </Text>
              <Text color="gray">
                Episodes: {formatNumber(currentShow.totalEpisodes ?? 0)} ·
                Subscribed:{" "}
                {currentSubscription && !currentSubscription.droppedAt
                  ? "yes"
                  : "no"}
                {currentSubscription?.droppedAt ? " (dropped)" : ""}
              </Text>
              <Text>
                {truncate(
                  stripHtml(
                    currentShow.description ?? currentShow.htmlDescription ?? ""
                  ),
                  100
                )}
              </Text>
            </>
          ) : null}

          <Box marginTop={1} flexDirection="column">
            <Text color="cyan">
              Episodes loaded: {currentEpisodes.length} · view:{" "}
              {showState?.episodeFilter ?? "all"}
              {showState?.detail?.episodes.nextToken
                ? " (more available: press ])"
                : ""}
            </Text>
            {filteredEpisodes.length === 0 && !showState?.loading ? (
              <Text color="gray">
                {autoLoadingFilteredEpisodes
                  ? "No matches in current pages; loading more episodes..."
                  : "No episodes match current filter."}
              </Text>
            ) : null}
            {showRows.rows.map((episode, idx) => {
              const absoluteIndex = showRows.start + idx;
              const active =
                absoluteIndex === (showState?.selectedEpisodeIndex ?? 0);
              const completed = episode.episodeId
                ? (progressMap.get(episode.episodeId) ?? false)
                : false;
              return (
                <Text
                  key={episode.episodeId}
                  color={active ? "green" : undefined}
                >
                  {active ? "❯" : " "} {lineForEpisode(episode, completed)}
                </Text>
              );
            })}
          </Box>

          {currentSubscription ? (
            <Text color="gray">
              Rating: {currentSubscription.ratingStars ?? "-"} · Updated:{" "}
              {formatDateTime(
                typeof currentSubscription.ratingUpdatedAt === "string"
                  ? currentSubscription.ratingUpdatedAt
                  : null
              )}
            </Text>
          ) : null}
        </Box>
      )}

      {rating.open ? (
        <Box
          borderStyle="single"
          marginTop={1}
          paddingX={1}
          flexDirection="column"
        >
          <Text color="magenta">Rate Show</Text>
          <Text>
            Stars: {"★".repeat(rating.stars)}
            {"☆".repeat(Math.max(0, 5 - rating.stars))}
          </Text>
          <Text>Review: {truncate(rating.review || "(empty)", 80)}</Text>
          <Text color="gray">
            Use 1-5 or left/right for stars, type review text, Enter save, Esc
            cancel.
          </Text>
        </Box>
      ) : null}

      {confirm ? (
        <Box
          borderStyle="single"
          marginTop={1}
          paddingX={1}
          flexDirection="column"
        >
          <Text color="yellow">
            Confirm {confirm.action} for "{confirm.title}"?
          </Text>
          <Text color="gray">Press y/Enter to confirm, n/Esc to cancel.</Text>
        </Box>
      ) : null}

      {helpOpen ? (
        <Box
          borderStyle="single"
          marginTop={1}
          paddingX={1}
          flexDirection="column"
        >
          <Text color="cyan">Keyboard Help</Text>
          <Text>Global: / search · ? help · q back/quit</Text>
          <Text>
            Home: j/k move · Enter open show · s sort · f filter · n mark next ·
            u unsubscribe
          </Text>
          <Text>
            Show: j/k move episode · Enter toggle progress · n mark next · a
            mark all
          </Text>
          <Text>
            Show: s subscribe toggle · d drop · t rate · u unsubscribe · f
            episode filter · o open URL · ] load more · b back
          </Text>
        </Box>
      ) : null}

      {toast ? (
        <Box marginTop={1}>
          <Text color={renderTone(toast.tone)}>{toast.message}</Text>
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text color="gray">
          {busy ? "Working… " : "Ready. "}
          {search.open
            ? "Search keys: type Enter/Tab j/k s Enter Esc/q"
            : isShowScreen
              ? "Show keys: j/k Enter n a s d t u f o ] b / ?"
              : "Home keys: j/k Enter s f n u / ? q"}
        </Text>
      </Box>
    </Box>
  );
}
