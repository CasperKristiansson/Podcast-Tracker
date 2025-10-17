import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  EpisodesByShowDocument,
  type EpisodesByShowQuery,
  type EpisodesByShowQueryVariables,
  EpisodeProgressByIdsDocument,
  type EpisodeProgressByIdsQuery,
  type Episode,
  MarkEpisodeProgressDocument,
  MySubscriptionByShowDocument,
  type MySubscriptionByShowQuery,
  RateShowDocument,
  ShowByIdDocument,
  type ShowByIdQuery,
  SubscribeToShowDocument,
  UnsubscribeFromShowDocument,
} from "@shared";
import { AuroraBackground, GlowCard, InteractiveButton, StarRating } from "@ui";

interface PodcastDetailAppProps {
  showId: string;
}

interface RatingDraft {
  stars: number;
  review: string;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const toOptionalString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

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

export default function PodcastDetailApp({ showId }: PodcastDetailAppProps) {
  const {
    data: showData,
    loading: showLoading,
    error: showError,
  } = useQuery<ShowByIdQuery>(ShowByIdDocument, {
    variables: { showId },
  });

  const {
    data: subscriptionData,
    loading: subscriptionLoading,
    refetch: refetchSubscription,
  } = useQuery<MySubscriptionByShowQuery>(MySubscriptionByShowDocument, {
    variables: { showId },
  });

  const {
    data: episodesData,
    loading: episodesLoading,
    error: episodesError,
    fetchMore,
  } = useQuery<EpisodesByShowQuery, EpisodesByShowQueryVariables>(
    EpisodesByShowDocument,
    {
      variables: { showId, limit: 25 },
    }
  );

  const episodes = useMemo(() => {
    const list = episodesData?.episodes.items ?? [];
    return list.filter((episode): episode is Episode => Boolean(episode));
  }, [episodesData]);

  const episodeIds = useMemo(
    () => episodes.map((episode) => episode.episodeId),
    [episodes]
  );

  const {
    data: progressData,
    loading: progressLoading,
    refetch: refetchProgress,
  } = useQuery<EpisodeProgressByIdsQuery>(EpisodeProgressByIdsDocument, {
    variables: { episodeIds },
    skip: episodeIds.length === 0,
  });

  const progressMap = useMemo(() => {
    const map = new Map<
      string,
      EpisodeProgressByIdsQuery["episodeProgress"][number]
    >();
    for (const item of progressData?.episodeProgress ?? []) {
      if (item?.episodeId) {
        map.set(item.episodeId, item);
      }
    }
    return map;
  }, [progressData]);

  const [sliderDrafts, setSliderDrafts] = useState<Record<string, number>>({});
  const [editingEpisode, setEditingEpisode] = useState<string | null>(null);

  useEffect(() => {
    if (!progressData) return;
    setSliderDrafts((current) => {
      const next = { ...current };
      for (const item of progressData.episodeProgress ?? []) {
        if (!item?.episodeId || editingEpisode === item.episodeId) {
          continue;
        }
        next[item.episodeId] = item.positionSec ?? 0;
      }
      return next;
    });
  }, [progressData, editingEpisode]);

  useEffect(() => {
    if (editingEpisode) return;
    setSliderDrafts((current) => {
      const next = { ...current };
      for (const episode of episodes) {
        next[episode.episodeId] ??= 0;
      }
      return next;
    });
  }, [episodes, editingEpisode]);

  const subscription = subscriptionData?.mySubscription ?? null;

  const [ratingDraft, setRatingDraft] = useState<RatingDraft>({
    stars: subscription?.ratingStars ?? 0,
    review: subscription?.ratingReview ?? "",
  });
  const [isEditingRating, setIsEditingRating] = useState(false);

  useEffect(() => {
    if (!subscription) {
      setRatingDraft({ stars: 0, review: "" });
      setIsEditingRating(false);
      return;
    }
    setRatingDraft({
      stars: subscription.ratingStars ?? 0,
      review: subscription.ratingReview ?? "",
    });
    setIsEditingRating(false);
  }, [subscription?.ratingStars, subscription?.ratingReview, subscription]);

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

  const show = showData?.show;
  const descriptionHtml = show?.htmlDescription ?? show?.description ?? "";
  const showLanguages = show?.languages?.filter(isNonEmptyString) ?? [];
  const isSubscribed = Boolean(subscription);
  const isMutatingSubscription = subscribeLoading || unsubscribeLoading;
  const ratingValue = isEditingRating
    ? ratingDraft.stars
    : (subscription?.ratingStars ?? 0);
  const ratingChangeHandler = isEditingRating
    ? (stars: number) =>
        setRatingDraft((prev) => ({
          ...prev,
          stars,
        }))
    : undefined;
  const subscriptionAddedAt = toOptionalString(subscription?.addedAt);
  const ratingUpdatedAt = toOptionalString(subscription?.ratingUpdatedAt);

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
      await refetchSubscription();
    } catch (err) {
      console.error("Subscription mutation failed", err);
    }
  };

  const handleProgressCommit = async (
    episode: Episode,
    positionSec: number
  ) => {
    try {
      const totalDuration = Number(episode.durationSec ?? 0);
      const bounded = Math.max(0, Math.min(positionSec, totalDuration));
      const completed =
        totalDuration > 0 ? bounded >= totalDuration - 5 : false;
      await markProgress({
        variables: {
          episodeId: episode.episodeId,
          positionSec: Math.round(bounded),
          completed,
          showId: episode.showId ?? showId,
        },
      });
      setEditingEpisode(null);
      await refetchProgress();
    } catch (err) {
      console.error("Failed to update progress", err);
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
      await refetchSubscription();
      setIsEditingRating(false);
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
      await refetchSubscription();
      setIsEditingRating(false);
    } catch (err) {
      console.error("Failed to clear rating", err);
    }
  };

  const handleLoadMore = async () => {
    if (!episodesData?.episodes.nextToken) return;
    await fetchMore({
      variables: {
        nextToken: episodesData.episodes.nextToken,
      },
    });
  };

  return (
    <div className="relative isolate w-full">
      <AuroraBackground className="opacity-80" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        {showLoading || subscriptionLoading ? (
          <div className="mx-auto flex h-32 w-full max-w-xl items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] text-sm text-white/70">
            Loading podcast details…
          </div>
        ) : null}

        {showError ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/20 p-6 text-sm text-red-100">
            Failed to load show: {showError.message}
          </div>
        ) : null}

        {show ? (
          <GlowCard className="w-full max-w-none px-10 py-12">
            <div className="flex flex-col gap-10 md:flex-row md:items-start">
              <div className="relative mx-auto aspect-square w-40 overflow-hidden rounded-3xl border border-white/10 shadow-[0_30px_80px_rgba(41,23,90,0.45)] md:mx-0">
                {show.image ? (
                  <img
                    src={show.image}
                    alt={show.title ?? "Podcast artwork"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/5 text-sm text-white/40">
                    No artwork
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              <div className="flex-1 space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.35em] text-white/50">
                      {show.publisher}
                    </div>
                    <h1 className="text-4xl font-semibold text-white">
                      {show.title}
                    </h1>
                    <p className="text-sm text-white/60">
                      {show.totalEpisodes} episodes tracked
                    </p>
                  </div>

                  <InteractiveButton
                    onClick={() => {
                      void handleSubscribeToggle();
                    }}
                    variant={isSubscribed ? "outline" : "primary"}
                    isLoading={isMutatingSubscription}
                    loadingLabel={isSubscribed ? "Removing…" : "Adding…"}
                    className="self-start"
                  >
                    {isSubscribed ? "Remove from my shows" : "Add to my shows"}
                  </InteractiveButton>
                </div>

                {descriptionHtml ? (
                  <div
                    className="prose prose-invert max-w-3xl text-base leading-relaxed text-white/70 prose-p:my-3 prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  {show.categories?.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-white/15 bg-white/[0.08] px-4 py-1 text-xs font-medium uppercase tracking-widest text-white/70"
                    >
                      {category}
                    </span>
                  ))}
                  {show.explicit ? (
                    <span className="rounded-full border border-red-400/40 bg-red-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-red-100">
                      Explicit
                    </span>
                  ) : null}
                  {showLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/60"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                  {subscriptionAddedAt ? (
                    <span>
                      In your rotation {formatRelative(subscriptionAddedAt)}
                    </span>
                  ) : null}
                  {show.externalUrl ? (
                    <a
                      className="inline-flex items-center gap-2 text-white/80 transition hover:text-white"
                      href={show.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on Spotify ↗
                    </a>
                  ) : null}
                  {show.mediaType ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/50">
                      {show.mediaType}
                    </span>
                  ) : null}
                  {show.availableMarkets?.length ? (
                    <span className="text-xs uppercase tracking-widest text-white/40">
                      Available in {show.availableMarkets.length} markets
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </GlowCard>
        ) : null}

        <GlowCard className="w-full max-w-none px-10 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                Rate this podcast
              </h2>
              <p className="text-sm text-white/60">
                Let future you know how this show feels. Just a quick rating and
                optional note.
              </p>
              {!isEditingRating && subscription?.ratingReview ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70">
                  “{subscription.ratingReview}”
                </p>
              ) : null}
            </div>

            <div className="flex w-full max-w-md flex-col gap-4">
              <StarRating
                value={ratingValue}
                onChange={ratingChangeHandler}
                readOnly={!isEditingRating}
                size="lg"
                className="justify-end"
              />

              {isEditingRating ? (
                <div className="space-y-4">
                  <textarea
                    value={ratingDraft.review}
                    onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                      setRatingDraft((prev) => ({
                        ...prev,
                        review: event.target.value,
                      }))
                    }
                    rows={3}
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
                      onClick={() => {
                        setIsEditingRating(false);
                        setRatingDraft({
                          stars: subscription?.ratingStars ?? 0,
                          review: subscription?.ratingReview ?? "",
                        });
                      }}
                    >
                      Cancel
                    </InteractiveButton>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <InteractiveButton
                    variant="secondary"
                    onClick={() => setIsEditingRating(true)}
                  >
                    {(subscription?.ratingStars ?? 0) > 0
                      ? "Update rating"
                      : "Add rating"}
                  </InteractiveButton>
                  {ratingUpdatedAt ? (
                    <span className="text-xs uppercase tracking-widest text-white/50">
                      Last updated {formatRelative(ratingUpdatedAt)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </GlowCard>

        {episodesError ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/20 p-6 text-sm text-red-100">
            Failed to load episodes: {episodesError.message}
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-semibold text-white">Episodes</h2>
              <p className="text-sm text-white/60">
                Modern queue of everything you haven&apos;t listened to yet.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/50">
              {progressLoading || markProgressLoading
                ? "Syncing progress…"
                : null}
            </div>
          </div>

          {episodesLoading && episodes.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/70">
              Fetching the freshest episodes…
            </div>
          ) : null}

          <ul className="space-y-5">
            {episodes.map((episode, index) => {
              const progress = progressMap.get(episode.episodeId);
              const sliderValue =
                sliderDrafts[episode.episodeId] ?? progress?.positionSec ?? 0;
              const totalDuration = Number(episode.durationSec ?? 0);
              const percent = totalDuration
                ? Math.round((sliderValue / totalDuration) * 100)
                : 0;
              const publishedAt = toOptionalString(episode.publishedAt);
              const episodeLanguages =
                episode.languages?.filter(isNonEmptyString) ?? [];

              return (
                <li
                  key={episode.episodeId}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_60px_rgba(29,16,65,0.35)] transition duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/50">
                        <span>Episode {index + 1}</span>
                        <span className="h-1 w-1 rounded-full bg-white/30" />
                        <span>{formatDate(publishedAt)}</span>
                        <span className="h-1 w-1 rounded-full bg-white/30" />
                        <span>
                          {formatDuration(Number(episode.durationSec ?? 0))}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-white">
                        {episode.title}
                      </h3>
                      {episode.htmlDescription ? (
                        <div
                          className="prose prose-invert prose-sm line-clamp-4 text-white/70 prose-p:my-1"
                          dangerouslySetInnerHTML={{
                            __html: episode.htmlDescription,
                          }}
                        />
                      ) : episode.description ? (
                        <p className="line-clamp-3 text-sm text-white/70">
                          {episode.description}
                        </p>
                      ) : null}

                      <div className="flex flex-wrap gap-3 text-xs text-white/60">
                        {progress?.completed ? (
                          <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-200">
                            Completed
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-3 py-1">
                            {percent}% complete
                          </span>
                        )}
                        {episode.explicit ? (
                          <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-200">
                            Explicit
                          </span>
                        ) : null}
                        {episodeLanguages.length ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] uppercase tracking-[0.3em] text-white/50">
                            {episodeLanguages.join(" · ")}
                          </span>
                        ) : null}
                        <a
                          href={`/app/show/${showId}/episode/${episode.episodeId}`}
                          className="inline-flex items-center gap-2 text-white/75 transition hover:text-white"
                        >
                          Episode details ↗
                        </a>
                        {episode.linkUrl ? (
                          <a
                            href={episode.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-white/75 transition hover:text-white"
                          >
                            Play on Spotify ↗
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="w-full rounded-2xl border border-white/10 bg-black/30 p-5 md:w-64">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
                          <span>Progress</span>
                          <span>{formatDuration(sliderValue)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={Math.max(1, Number(episode.durationSec ?? 0))}
                          value={sliderValue}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            setEditingEpisode(episode.episodeId);
                            setSliderDrafts((prev) => ({
                              ...prev,
                              [episode.episodeId]: Number(event.target.value),
                            }));
                          }}
                          onPointerUp={(event) => {
                            const value = Number(
                              (event.target as HTMLInputElement).value
                            );
                            void handleProgressCommit(episode, value);
                          }}
                          onMouseUp={(event) => {
                            const value = Number(
                              (event.target as HTMLInputElement).value
                            );
                            void handleProgressCommit(episode, value);
                          }}
                          onKeyUp={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              const value = Number(
                                (event.target as HTMLInputElement).value
                              );
                              void handleProgressCommit(episode, value);
                            }
                          }}
                          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#8f73ff]"
                        />
                        <div className="flex flex-wrap items-center gap-3">
                          <InteractiveButton
                            variant="secondary"
                            onClick={() => {
                              setSliderDrafts((prev) => ({
                                ...prev,
                                [episode.episodeId]: Number(
                                  episode.durationSec ?? 0
                                ),
                              }));
                              void handleProgressCommit(
                                episode,
                                Number(episode.durationSec ?? 0)
                              );
                            }}
                          >
                            Mark done
                          </InteractiveButton>
                          <InteractiveButton
                            variant="ghost"
                            onClick={() => {
                              setSliderDrafts((prev) => ({
                                ...prev,
                                [episode.episodeId]: 0,
                              }));
                              void handleProgressCommit(episode, 0);
                            }}
                          >
                            Reset
                          </InteractiveButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {episodesData?.episodes.nextToken ? (
            <div className="flex justify-center">
              <InteractiveButton
                variant="secondary"
                onClick={() => {
                  void handleLoadMore();
                }}
                isLoading={episodesLoading}
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
