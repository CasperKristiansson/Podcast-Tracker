import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  ShowDetailDocument,
  type ShowDetailQuery,
  type ShowDetailQueryVariables,
  type Episode,
  MarkEpisodeProgressDocument,
  RateShowDocument,
  SubscribeToShowDocument,
  UnsubscribeFromShowDocument,
} from "@shared";
import { AuroraBackground, GlowCard, InteractiveButton, StarRating } from "@ui";
import { GraphQLProvider } from "../graphql/GraphQLProvider";

interface PodcastDetailAppProps {
  showId: string;
}

interface RatingDraft {
  stars: number;
  review: string;
}

type EpisodeFilterValue = "all" | "unplayed" | "played";

const EPISODE_FILTERS: { value: EpisodeFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unplayed", label: "Unplayed" },
  { value: "played", label: "Watched" },
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const toOptionalString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const formatNumber = (value: number): string =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0
  );

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0s";
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const parts = [] as string[];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (hrs === 0 && secs > 0) parts.push(`${secs}s`);
  return parts.join(" ") || "0s";
};

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return "";
  try {
    const formatter = new Intl.RelativeTimeFormat(undefined, {
      numeric: "auto",
    });
    const now = Date.now();
    const target = new Date(iso).getTime();
    const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));
    return formatter.format(diffDays, "day");
  } catch {
    return iso;
  }
};

function PodcastDetailAppContent({
  showId,
}: PodcastDetailAppProps): JSX.Element {
  const {
    data: showDetailData,
    loading: showDetailLoading,
    error: showDetailError,
    fetchMore,
    refetch: refetchShowDetail,
  } = useQuery<ShowDetailQuery, ShowDetailQueryVariables>(ShowDetailDocument, {
    variables: { showId, episodeLimit: 25 },
  });

  const [episodeFilter, setEpisodeFilter] = useState<EpisodeFilterValue>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const detail = showDetailData?.showDetail ?? null;

  const episodesConnection = detail?.episodes ?? null;

  const episodes = useMemo(() => {
    const list = episodesConnection?.items ?? [];
    return list.filter((episode): episode is Episode => Boolean(episode));
  }, [episodesConnection]);

  const progressMap = useMemo(() => {
    const map = new Map<
      string,
      ShowDetailQuery["showDetail"]["progress"][number]
    >();
    for (const item of detail?.progress ?? []) {
      if (item?.episodeId) {
        map.set(item.episodeId, item);
      }
    }
    return map;
  }, [detail?.progress]);

  const subscription = detail?.subscription ?? null;

  const [ratingDraft, setRatingDraft] = useState<RatingDraft>({
    stars: subscription?.ratingStars ?? 0,
    review: subscription?.ratingReview ?? "",
  });
  const [isRatingModalOpen, setRatingModalOpen] = useState(false);
  const [pendingEpisodeId, setPendingEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!subscription) {
      setRatingDraft({ stars: 0, review: "" });
      if (isRatingModalOpen) {
        setRatingModalOpen(false);
      }
      return;
    }
    if (!isRatingModalOpen) {
      setRatingDraft({
        stars: subscription.ratingStars ?? 0,
        review: subscription.ratingReview ?? "",
      });
    }
  }, [
    subscription?.ratingStars,
    subscription?.ratingReview,
    subscription,
    isRatingModalOpen,
  ]);

  const [markProgress, { loading: markProgressLoading }] = useMutation(
    MarkEpisodeProgressDocument
  );
  const [subscribeToShow, { loading: subscribeLoading }] = useMutation(
    SubscribeToShowDocument
  );
  const [unsubscribeFromShow, { loading: unsubscribeLoading }] = useMutation(
    UnsubscribeFromShowDocument
  );
  const [rateShow, { loading: rateLoading }] = useMutation(RateShowDocument);

  const show = detail?.show ?? null;
  const descriptionHtml = show?.htmlDescription ?? show?.description ?? "";
  const showLanguages = show?.languages?.filter(isNonEmptyString) ?? [];
  const isSubscribed = Boolean(subscription) || Boolean(show?.isSubscribed);
  const isMutatingSubscription = subscribeLoading || unsubscribeLoading;
  const ratingDisplayValue = subscription?.ratingStars ?? 0;
  const canRateShow = Boolean(subscription);
  const handleDraftStarChange = (stars: number) => {
    setRatingDraft((prev) => ({
      ...prev,
      stars,
    }));
  };
  const subscriptionAddedAt = toOptionalString(subscription?.addedAt);
  const ratingUpdatedAt = toOptionalString(subscription?.ratingUpdatedAt);

  const watchedCount = useMemo(() => {
    return (detail?.progress ?? []).filter((entry) => entry?.completed).length;
  }, [detail?.progress]);

  const filteredEpisodes = useMemo(() => {
    if (episodeFilter === "all") {
      return episodes;
    }

    return episodes.filter((episode) => {
      const progress = progressMap.get(episode.episodeId);
      const isWatched = Boolean(progress?.completed);
      if (episodeFilter === "played") {
        return isWatched;
      }
      return !isWatched;
    });
  }, [episodeFilter, episodes, progressMap]);

  const activeFilterLabel = useMemo(() => {
    const current = EPISODE_FILTERS.find(
      (item) => item.value === episodeFilter
    );
    return current?.label ?? "All";
  }, [episodeFilter]);

  const heroLoading = showDetailLoading && !show;
  const episodesInitialLoading = showDetailLoading && episodes.length === 0;
  const progressSyncing = showDetailLoading || markProgressLoading;

  const handleSubscribeToggle = async () => {
    if (!show) return;
    try {
      if (isSubscribed) {
        await unsubscribeFromShow({ variables: { showId } });
      } else {
        await subscribeToShow({
          variables: {
            showId,
            title: show.title ?? "",
            publisher: show.publisher ?? "",
            image: show.image ?? "",
            totalEpisodes:
              typeof show.totalEpisodes === "number" ? show.totalEpisodes : 0,
          },
        });
      }
      await refetchShowDetail();
    } catch (err) {
      console.error("Subscription mutation failed", err);
    }
  };

  const handleOpenRatingModal = useCallback(() => {
    if (!subscription) {
      return;
    }
    setRatingDraft({
      stars: subscription?.ratingStars ?? 0,
      review: subscription?.ratingReview ?? "",
    });
    setRatingModalOpen(true);
  }, [subscription?.ratingStars, subscription?.ratingReview]);

  const handleCloseRatingModal = useCallback(() => {
    setRatingDraft({
      stars: subscription?.ratingStars ?? 0,
      review: subscription?.ratingReview ?? "",
    });
    setRatingModalOpen(false);
  }, [subscription?.ratingStars, subscription?.ratingReview]);

  useEffect(() => {
    if (!isRatingModalOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseRatingModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRatingModalOpen, handleCloseRatingModal]);

  useEffect(() => {
    if (!filterMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        filterButtonRef.current?.contains(target) ||
        filterMenuRef.current?.contains(target)
      ) {
        return;
      }
      setFilterMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [filterMenuOpen]);

  useEffect(() => {
    if (!actionsMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        actionsButtonRef.current?.contains(target) ||
        actionsMenuRef.current?.contains(target)
      ) {
        return;
      }
      setActionsMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [actionsMenuOpen]);

  const handleEpisodeCompletion = async (
    episode: Episode,
    completed: boolean
  ) => {
    setPendingEpisodeId(episode.episodeId);
    try {
      const totalDuration = Number(episode.durationSec ?? 0);
      const positionSec = completed
        ? Math.max(1, Math.round(totalDuration))
        : 0;
      await markProgress({
        variables: {
          episodeId: episode.episodeId,
          positionSec,
          completed,
          showId,
        },
      });
      await refetchShowDetail();
    } catch (err) {
      console.error("Failed to update episode completion", err);
    } finally {
      setPendingEpisodeId(null);
    }
  };

  const handleRatingSave = async () => {
    if (!show) return;
    try {
      await rateShow({
        variables: {
          showId,
          stars: ratingDraft.stars,
          review: ratingDraft.review.trim() || null,
        },
      });
      await refetchShowDetail();
      handleCloseRatingModal();
    } catch (err) {
      console.error("Failed to save rating", err);
    }
  };

  const handleRatingClear = async () => {
    try {
      await rateShow({
        variables: {
          showId,
          stars: 0,
          review: null,
        },
      });
      await refetchShowDetail();
      handleCloseRatingModal();
    } catch (err) {
      console.error("Failed to clear rating", err);
    }
  };

  const handleLoadMore = async () => {
    const nextToken = episodesConnection?.nextToken;
    if (!nextToken) return;
    setLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          showId,
          episodeLimit: 25,
          episodeCursor: nextToken,
        },
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!fetchMoreResult?.showDetail) {
            return previous;
          }
          if (!previous?.showDetail) {
            return fetchMoreResult;
          }

          const prevDetail = previous.showDetail;
          const nextDetail = fetchMoreResult.showDetail;

          const mergedEpisodes = [
            ...(prevDetail.episodes?.items ?? []),
            ...(nextDetail.episodes?.items ?? []),
          ];

          const progressMap = new Map<
            string,
            ShowDetailQuery["showDetail"]["progress"][number]
          >();
          for (const entry of prevDetail.progress ?? []) {
            if (entry?.episodeId) {
              progressMap.set(entry.episodeId, entry);
            }
          }
          for (const entry of nextDetail.progress ?? []) {
            if (entry?.episodeId) {
              progressMap.set(entry.episodeId, entry);
            }
          }

          return {
            ...previous,
            showDetail: {
              ...prevDetail,
              ...nextDetail,
              show: nextDetail.show ?? prevDetail.show,
              subscription: nextDetail.subscription ?? prevDetail.subscription,
              episodes: {
                ...nextDetail.episodes,
                items: mergedEpisodes,
              },
              progress: Array.from(progressMap.values()),
            },
          };
        },
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSelectEpisodeFilter = (value: EpisodeFilterValue) => {
    setEpisodeFilter(value);
    setFilterMenuOpen(false);
  };

  const ratingModal =
    isRatingModalOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onMouseDown={(event) => {
                event.stopPropagation();
                handleCloseRatingModal();
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="rating-dialog-title"
              className="relative z-10 w-full max-w-lg rounded-[32px] border border-white/12 bg-[#14072f]/95 p-6 shadow-[0_40px_140px_rgba(10,4,32,0.6)]"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              onMouseUp={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <h2
                  id="rating-dialog-title"
                  className="text-lg font-semibold text-white"
                >
                  Rate this podcast
                </h2>
                <button
                  type="button"
                  onClick={handleCloseRatingModal}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/70 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Close rating modal"
                >
                  &times;
                </button>
              </div>
              <div className="mt-6 space-y-5">
                <div className="flex flex-col items-center gap-4 text-center text-white/80">
                  <StarRating
                    value={ratingDraft.stars}
                    onChange={handleDraftStarChange}
                    size="lg"
                    className="justify-center"
                  />
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    {show?.title ?? "This show"}
                  </p>
                </div>
                <textarea
                  value={ratingDraft.review}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setRatingDraft((prev) => ({
                      ...prev,
                      review: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Optional note about the show"
                  className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#8f73ff]"
                />
                <div className="flex flex-wrap gap-3">
                  <InteractiveButton
                    onClick={() => {
                      void handleRatingSave();
                    }}
                    isLoading={rateLoading}
                    loadingLabel="Saving…"
                  >
                    Save rating
                  </InteractiveButton>
                  {(subscription?.ratingStars ?? 0) > 0 ||
                  subscription?.ratingReview ? (
                    <InteractiveButton
                      variant="outline"
                      onClick={() => {
                        void handleRatingClear();
                      }}
                      isLoading={rateLoading}
                      loadingLabel="Clearing…"
                    >
                      Clear rating
                    </InteractiveButton>
                  ) : null}
                  <InteractiveButton
                    variant="ghost"
                    onClick={handleCloseRatingModal}
                    disabled={rateLoading}
                  >
                    Cancel
                  </InteractiveButton>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative isolate w-full">
      {ratingModal}
      <AuroraBackground className="opacity-80" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        {heroLoading ? (
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.05] px-6 py-10 sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(164,132,255,0.18),_transparent_75%)]"
              aria-hidden
            />
            <div className="relative z-10 flex flex-col gap-10 lg:flex-row">
              <div className="mx-auto w-44 sm:w-56 lg:mx-0 lg:w-64">
                <div className="aspect-square animate-pulse rounded-[32px] bg-white/10" />
              </div>
              <div className="flex-1 space-y-6">
                <div className="space-y-3">
                  <div className="h-3 w-36 animate-pulse rounded-full bg-white/10" />
                  <div className="h-12 w-3/4 animate-pulse rounded-full bg-white/10" />
                  <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={`hero-line-${idx}`}
                      className="h-4 w-full animate-pulse rounded-full bg-white/10"
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`hero-pill-${idx}`}
                      className="h-6 w-24 animate-pulse rounded-full bg-white/10"
                    />
                  ))}
                </div>
                <div className="h-28 w-full animate-pulse rounded-[28px] bg-white/10" />
              </div>
            </div>
          </div>
        ) : null}

        {showDetailError ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/20 p-6 text-sm text-red-100">
            Failed to load show: {showDetailError.message}
          </div>
        ) : null}

        {show ? (
          <GlowCard className="relative overflow-hidden w-full max-w-none px-6 py-10 sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(138,94,255,0.23),_transparent_70%)]"
              aria-hidden
            />
            {show.image ? (
              <div
                className="pointer-events-none absolute -right-36 -top-40 hidden h-[22rem] w-[22rem] rotate-12 transform-gpu rounded-full bg-cover bg-center opacity-35 blur-[120px] sm:block"
                style={{
                  backgroundImage: `url(${show.image})`,
                }}
                aria-hidden
              />
            ) : null}
            <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-start">
              <div className="relative mx-auto w-44 shrink-0 sm:w-56 lg:mx-0 lg:w-64">
                <div
                  className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-white/40 via-transparent to-white/10 opacity-80 blur-3xl"
                  aria-hidden
                />
                {show.image ? (
                  <div
                    className="pointer-events-none absolute -top-10 -right-16 hidden h-32 w-32 rotate-12 overflow-hidden rounded-[28px] border border-white/10 opacity-50 sm:block"
                    aria-hidden
                  >
                    <img
                      src={show.image}
                      alt=""
                      className="h-full w-full object-cover opacity-75"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#12072d]/80 shadow-[0_45px_120px_rgba(31,16,78,0.55)]">
                  {show.image ? (
                    <img
                      src={show.image}
                      alt={show.title ?? "Podcast artwork"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-white/5 text-sm text-white/40">
                      No artwork
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/30" />
                </div>
              </div>

              <div className="flex-1 space-y-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.4em] text-white/65">
                      {show.publisher}
                      <span className="hidden h-1 w-1 rounded-full bg-white/50 sm:inline" />
                      <span className="text-white/45">
                        {show.mediaType ?? "Podcast"}
                      </span>
                    </span>
                    <h1 className="text-4xl font-semibold text-white sm:text-5xl">
                      {show.title}
                    </h1>
                    <div className="flex flex-wrap gap-3 text-sm text-white/70">
                      <span className="rounded-2xl border border-white/12 bg-white/[0.05] px-3 py-1">
                        {formatNumber(show.totalEpisodes ?? 0)} episodes
                      </span>
                      <span className="rounded-2xl border border-emerald-400/40 bg-emerald-400/15 px-3 py-1 text-emerald-100">
                        {progressSyncing
                          ? "Tracking progress…"
                          : `${formatNumber(watchedCount)} watched`}
                      </span>
                      {subscriptionAddedAt ? (
                        <span className="rounded-2xl border border-white/12 bg-white/[0.04] px-3 py-1 text-white/60">
                          In rotation {formatRelative(subscriptionAddedAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-3">
                    {!isSubscribed ? (
                      <InteractiveButton
                        onClick={() => {
                          void handleSubscribeToggle();
                        }}
                        variant="primary"
                        isLoading={isMutatingSubscription}
                        loadingLabel="Adding…"
                        className="w-full rounded-full sm:w-auto transition-colors duration-200 hover:bg-[#7f4bff]/20 hover:text-white"
                      >
                        Add to my shows
                      </InteractiveButton>
                    ) : null}
                    <div className="relative w-full sm:w-auto">
                      <button
                        ref={actionsButtonRef}
                        type="button"
                        onClick={() => setActionsMenuOpen((prev) => !prev)}
                        aria-haspopup="menu"
                        aria-expanded={actionsMenuOpen}
                        className="inline-flex w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
                      >
                        <span>More actions</span>
                        <svg
                          aria-hidden
                          viewBox="0 0 12 12"
                          className={`h-3 w-3 text-white/70 transition-transform duration-200 ${
                            actionsMenuOpen ? "rotate-180" : "rotate-0"
                          }`}
                          focusable="false"
                        >
                          <path
                            d="M2 4.25L6 8l4-3.75"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {actionsMenuOpen ? (
                        <div
                          ref={actionsMenuRef}
                          role="menu"
                          aria-label="Additional actions"
                          className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-white/12 bg-[#14072f]/95 p-2 text-sm text-white shadow-[0_26px_90px_rgba(10,4,32,0.6)] backdrop-blur"
                        >
                          {canRateShow ? (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={(event) => {
                                event.stopPropagation();
                                setActionsMenuOpen(false);
                                window.setTimeout(() => {
                                  handleOpenRatingModal();
                                }, 0);
                              }}
                              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
                            >
                              <span>
                                {ratingDisplayValue > 0
                                  ? "Edit rating"
                                  : "Add rating"}
                              </span>
                              <span aria-hidden>★</span>
                            </button>
                          ) : (
                            <div className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-white/45">
                              <span>Add to my shows to rate</span>
                              <span aria-hidden>★</span>
                            </div>
                          )}
                          {show.externalUrl ? (
                            <a
                              role="menuitem"
                              onClick={() => {
                                setActionsMenuOpen(false);
                              }}
                              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff] no-underline"
                              href={show.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <span>Listen on Spotify</span>
                              <span aria-hidden>↗</span>
                            </a>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {descriptionHtml ? (
                  <div
                    className="prose prose-invert max-w-3xl text-base leading-relaxed text-white/75 prose-a:text-white prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                ) : null}

                <div className="flex flex-wrap gap-3">
                  {show.categories?.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-white/15 bg-white/[0.08] px-4 py-1 text-xs font-medium uppercase tracking-[0.4em] text-white/70"
                    >
                      {category}
                    </span>
                  ))}
                  {show.explicit ? (
                    <span className="rounded-full border border-red-400/50 bg-red-500/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-red-100">
                      Explicit
                    </span>
                  ) : null}
                  {showLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/65"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                  {show.availableMarkets?.length ? (
                    <span>
                      Available in {formatNumber(show.availableMarkets.length)}
                      &nbsp;markets
                    </span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <StarRating
                      value={ratingDisplayValue}
                      readOnly
                      size="lg"
                      className="justify-start"
                    />
                    {ratingUpdatedAt && ratingDisplayValue > 0 ? (
                      <span className="text-xs uppercase tracking-[0.35em] text-white/50">
                        Updated {formatRelative(ratingUpdatedAt)}
                      </span>
                    ) : null}
                  </div>
                  {subscription?.ratingReview ? (
                    <p className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
                      “{subscription.ratingReview}”
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </GlowCard>
        ) : null}

        <div className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-white">Episodes</h2>
              <p className="text-sm text-white/60">
                Modern queue of everything you haven&apos;t listened to yet.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              <div className="flex items-center gap-3 text-xs text-white/50">
                {progressSyncing ? "Syncing progress…" : null}
              </div>
              <div className="relative">
                <button
                  ref={filterButtonRef}
                  type="button"
                  onClick={() => setFilterMenuOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={filterMenuOpen}
                  className="inline-flex min-w-[190px] items-center justify-between gap-3 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-left text-sm text-white transition hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.4em] text-white/50">
                      Filter episodes
                    </span>
                    <span className="font-semibold text-white">
                      {activeFilterLabel}
                    </span>
                  </div>
                  <svg
                    aria-hidden
                    viewBox="0 0 12 12"
                    className={`h-3 w-3 text-white/70 transition-transform duration-200 ${
                      filterMenuOpen ? "rotate-180" : "rotate-0"
                    }`}
                    focusable="false"
                  >
                    <path
                      d="M2 4.25L6 8l4-3.75"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {filterMenuOpen ? (
                  <div
                    ref={filterMenuRef}
                    role="listbox"
                    aria-label="Episode filters"
                    className="absolute right-0 z-20 mt-2 w-60 rounded-2xl border border-white/12 bg-[#14072f]/95 p-2 text-sm text-white shadow-[0_24px_80px_rgba(10,4,32,0.55)] backdrop-blur"
                  >
                    {EPISODE_FILTERS.map(({ value, label }) => {
                      const isActive = episodeFilter === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() => handleSelectEpisodeFilter(value)}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff] ${
                            isActive
                              ? "bg-white/12 text-white"
                              : "text-white/70 hover:bg-white/10"
                          }`}
                        >
                          <span>{label}</span>
                          {isActive ? <span aria-hidden>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {episodesInitialLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`episode-skeleton-${idx}`}
                  className="animate-pulse rounded-3xl border border-white/10 bg-white/[0.05] p-6"
                >
                  <div className="h-3 w-1/3 rounded-full bg-white/10" />
                  <div className="mt-4 h-6 w-2/3 rounded-full bg-white/10" />
                  <div className="mt-3 h-4 w-full rounded-full bg-white/10" />
                  <div className="mt-2 h-4 w-5/6 rounded-full bg-white/10" />
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Array.from({ length: 3 }).map((_, pillIdx) => (
                      <div
                        key={`episode-pill-${idx}-${pillIdx}`}
                        className="h-6 w-24 rounded-full bg-white/10"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {filteredEpisodes.length === 0 && !episodesInitialLoading ? (
            <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-10 text-center text-sm text-white/70">
              No episodes match this filter yet.
            </div>
          ) : null}

          <ul className="space-y-5">
            {filteredEpisodes.map((episode, index) => {
              const progress = progressMap.get(episode.episodeId);
              const isWatched = Boolean(progress?.completed);
              const publishedAt = toOptionalString(episode.publishedAt);
              const episodeLanguages =
                episode.languages?.filter(isNonEmptyString) ?? [];
              const durationLabel = formatDuration(
                Number(episode.durationSec ?? 0)
              );
              const isEpisodeUpdating =
                pendingEpisodeId === episode.episodeId && markProgressLoading;

              return (
                <li
                  key={episode.episodeId}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_60px_rgba(29,16,65,0.35)] transition duration-300 hover:border-white/25 hover:bg-white/[0.09]"
                >
                  <div className="absolute -top-24 -right-20 h-48 w-48 rounded-full bg-[#8f73ff]/20 blur-[110px] opacity-40" />
                  <div className="relative flex flex-col gap-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/45">
                      <span>Episode {index + 1}</span>
                      <span className="h-1 w-1 rounded-full bg-white/35" />
                      <span>{formatDate(publishedAt)}</span>
                      <span className="h-1 w-1 rounded-full bg-white/35" />
                      <span>{durationLabel}</span>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-white md:text-2xl">
                        {episode.title}
                      </h3>
                      {episode.htmlDescription ? (
                        <div
                          className="prose prose-invert prose-sm line-clamp-4 text-white/75 prose-p:my-1"
                          dangerouslySetInnerHTML={{
                            __html: episode.htmlDescription,
                          }}
                        />
                      ) : episode.description ? (
                        <p className="line-clamp-3 text-sm text-white/70">
                          {episode.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/65">
                      <span
                        className={
                          isWatched
                            ? "inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/20 px-3 py-1 text-emerald-100"
                            : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-white/70"
                        }
                      >
                        {isWatched ? "Watched" : "Not watched yet"}
                      </span>
                      {episode.explicit ? (
                        <span className="rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-red-200">
                          Explicit
                        </span>
                      ) : null}
                      {episodeLanguages.length ? (
                        <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/55">
                          {episodeLanguages.join(" · ")}
                        </span>
                      ) : null}
                      <a
                        href={`/app/show/${showId}/episode/${episode.episodeId}`}
                        className="inline-flex items-center gap-2 text-[#bcd9ff] transition hover:text-white"
                      >
                        Episode details ↗
                      </a>
                      {episode.linkUrl ? (
                        <a
                          href={episode.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-[#bcd9ff] transition hover:text-white"
                        >
                          Play on Spotify ↗
                        </a>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <InteractiveButton
                        variant={isWatched ? "outline" : "primary"}
                        onClick={() => {
                          void handleEpisodeCompletion(episode, !isWatched);
                        }}
                        disabled={
                          markProgressLoading &&
                          pendingEpisodeId !== episode.episodeId
                        }
                        isLoading={isEpisodeUpdating}
                        loadingLabel="Updating…"
                      >
                        {isWatched ? "Mark as unwatched" : "Mark as watched"}
                      </InteractiveButton>
                      {episode.linkUrl ? (
                        <a
                          href={episode.linkUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                        >
                          Open external player ↗
                        </a>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {episodesConnection?.nextToken ? (
            <div className="flex justify-center">
              <InteractiveButton
                variant="secondary"
                onClick={() => {
                  void handleLoadMore();
                }}
                isLoading={loadingMore}
                loadingLabel="Loading…"
              >
                Load more episodes
              </InteractiveButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PodcastDetailApp(
  props: PodcastDetailAppProps
): JSX.Element {
  return (
    <GraphQLProvider>
      <PodcastDetailAppContent {...props} />
    </GraphQLProvider>
  );
}
