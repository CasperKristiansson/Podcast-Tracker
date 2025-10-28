import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  ShowDetailDocument,
  type ShowDetailQuery,
  type ShowDetailQueryVariables,
  type Episode,
  MarkEpisodeProgressDocument,
  type MarkEpisodeProgressMutation,
  type MarkEpisodeProgressMutationVariables,
  MarkAllEpisodesCompleteDocument,
  type MarkAllEpisodesCompleteMutation,
  type MarkAllEpisodesCompleteMutationVariables,
  RateShowDocument,
  type RateShowMutation,
  type RateShowMutationVariables,
  SubscribeToShowDocument,
  type SubscribeToShowMutation,
  type SubscribeToShowMutationVariables,
  UnsubscribeFromShowDocument,
  type UnsubscribeFromShowMutation,
  type UnsubscribeFromShowMutationVariables,
} from "@shared";
import { AuroraBackground, InteractiveButton } from "@ui";
import { GraphQLProvider } from "../graphql/GraphQLProvider";
import { EpisodeSection } from "./detail/EpisodeSection";
import { HeroSection } from "./detail/HeroSection";
import { RatingModal } from "./detail/RatingModal";
import { ActionToast, type ActionToastState } from "./detail/ActionToast";

interface PodcastDetailAppProps {
  showId: string;
}

interface RatingDraft {
  stars: number;
  review: string;
}
const toOptionalString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

function PodcastDetailAppContent({
  showId,
}: PodcastDetailAppProps): JSX.Element {
  const showDetailVariables = useMemo<ShowDetailQueryVariables>(
    () => ({ showId, episodeLimit: 25 }),
    [showId]
  );

  const {
    data: showDetailData,
    loading: showDetailLoading,
    error: showDetailError,
    fetchMore,
  } = useQuery<ShowDetailQuery, ShowDetailQueryVariables>(ShowDetailDocument, {
    variables: showDetailVariables,
  });

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const detail = showDetailData?.showDetail ?? null;

  const episodesConnection = detail?.episodes ?? null;

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
  const show = detail?.show ?? null;

  const [ratingDraft, setRatingDraft] = useState<RatingDraft>({
    stars: subscription?.ratingStars ?? 0,
    review: subscription?.ratingReview ?? "",
  });
  const [isRatingModalOpen, setRatingModalOpen] = useState(false);
  const [pendingEpisodeId, setPendingEpisodeId] = useState<string | null>(null);
  const [toastStatus, setToastStatus] = useState<ActionToastState>({
    state: "idle",
    message: "",
  });

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

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const [markProgress, { loading: markProgressLoading }] = useMutation<
    MarkEpisodeProgressMutation,
    MarkEpisodeProgressMutationVariables
  >(MarkEpisodeProgressDocument);
  const [markAllEpisodesComplete, { loading: markAllLoading }] = useMutation<
    MarkAllEpisodesCompleteMutation,
    MarkAllEpisodesCompleteMutationVariables
  >(MarkAllEpisodesCompleteDocument);
  const [subscribeToShow, { loading: subscribeLoading }] = useMutation<
    SubscribeToShowMutation,
    SubscribeToShowMutationVariables
  >(SubscribeToShowDocument);
  const [unsubscribeFromShow, { loading: unsubscribeLoading }] = useMutation<
    UnsubscribeFromShowMutation,
    UnsubscribeFromShowMutationVariables
  >(UnsubscribeFromShowDocument);
  const [rateShow, { loading: rateLoading }] = useMutation<
    RateShowMutation,
    RateShowMutationVariables
  >(RateShowDocument);

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

  const hasEpisodesToMark = useMemo(() => {
    if (!isSubscribed) {
      return false;
    }

    if (typeof show?.totalEpisodes === "number" && show.totalEpisodes > 0) {
      return watchedCount < show.totalEpisodes;
    }

    if (
      typeof subscription?.totalEpisodes === "number" &&
      subscription.totalEpisodes > 0
    ) {
      return watchedCount < subscription.totalEpisodes;
    }

    const items = (episodesConnection?.items ?? []).filter(
      (
        episode
      ): episode is NonNullable<
        ShowDetailQuery["showDetail"]["episodes"]["items"][number]
      > => Boolean(episode)
    );

    if (items.length === 0) {
      return false;
    }

    return items.some((episode) => {
      const progress = progressMap.get(episode.episodeId);
      return !progress?.completed;
    });
  }, [
    episodesConnection?.items,
    isSubscribed,
    progressMap,
    show?.totalEpisodes,
    subscription?.totalEpisodes,
    watchedCount,
  ]);

  const heroLoading = showDetailLoading && !show;
  const episodesInitialLoading =
    showDetailLoading && (episodesConnection?.items?.length ?? 0) === 0;
  const progressSyncing = showDetailLoading || markProgressLoading;

  const handleSubscribeToggle = async () => {
    if (!show) return;
    try {
      if (isSubscribed) {
        setToastStatus({
          state: "loading",
          message: "Removing from your library…",
        });
        await unsubscribeFromShow({
          variables: { showId },
          update: (cache) => {
            cache.updateQuery<ShowDetailQuery, ShowDetailQueryVariables>(
              {
                query: ShowDetailDocument,
                variables: showDetailVariables,
              },
              (existing) => {
                if (!existing?.showDetail?.show) {
                  return existing;
                }
                const showDetail = existing.showDetail;
                const updated = {
                  ...existing,
                  showDetail: {
                    ...showDetail,
                    subscription: null,
                    show: {
                      ...showDetail.show,
                      isSubscribed: false,
                    },
                  },
                } satisfies ShowDetailQuery;
                return updated;
              }
            );
          },
        });
        const title = show.title?.trim();
        setToastStatus({
          state: "success",
          message: title
            ? `Removed “${title}” from your library.`
            : "Removed the show from your library.",
        });
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
          update: (cache, result) => {
            const subscriptionPayload = result.data?.subscribe;
            if (!subscriptionPayload) {
              return;
            }
            cache.updateQuery<ShowDetailQuery, ShowDetailQueryVariables>(
              {
                query: ShowDetailDocument,
                variables: showDetailVariables,
              },
              (existing) => {
                if (!existing?.showDetail?.show) {
                  return existing;
                }
                const showDetail = existing.showDetail;
                const updated = {
                  ...existing,
                  showDetail: {
                    ...showDetail,
                    subscription: subscriptionPayload,
                    show: {
                      ...showDetail.show,
                      isSubscribed: true,
                    },
                  },
                } satisfies ShowDetailQuery;
                return updated;
              }
            );
          },
        });
      }
    } catch (err) {
      console.error("Subscription mutation failed", err);
      if (isSubscribed) {
        setToastStatus({
          state: "error",
          message: "We couldn’t remove the show. Please try again.",
        });
      }
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
    if (toastStatus.state === "success" || toastStatus.state === "error") {
      const timer = window.setTimeout(() => {
        setToastStatus({ state: "idle", message: "" });
      }, 4000);
      return () => {
        window.clearTimeout(timer);
      };
    }
    return undefined;
  }, [toastStatus.state]);

  const handleEpisodeCompletion = async (
    episode: Episode,
    completed: boolean
  ) => {
    setPendingEpisodeId(episode.episodeId);
    try {
      await markProgress({
        variables: {
          episodeId: episode.episodeId,
          completed,
          showId,
        },
        optimisticResponse: {
          __typename: "Mutation",
          markProgress: {
            __typename: "Progress",
            episodeId: episode.episodeId,
            completed,
            updatedAt: new Date().toISOString(),
            showId,
          },
        },
        update(cache, result: { data?: MarkEpisodeProgressMutation | null }) {
          const progressEntry = result.data?.markProgress;
          if (!progressEntry) {
            return;
          }

          const existing = cache.readQuery<
            ShowDetailQuery,
            ShowDetailQueryVariables
          >({
            query: ShowDetailDocument,
            variables: showDetailVariables,
          });

          if (!existing?.showDetail) {
            return;
          }

          const currentProgress = existing.showDetail.progress ?? [];

          let replaced = false;
          const nextProgress: ShowDetailQuery["showDetail"]["progress"] = [];

          for (const entry of currentProgress) {
            if (!entry) continue;
            if (entry.episodeId === progressEntry.episodeId) {
              nextProgress.push(progressEntry);
              replaced = true;
            } else {
              nextProgress.push(entry);
            }
          }

          if (!replaced) {
            nextProgress.push(progressEntry);
          }

          cache.writeQuery<ShowDetailQuery, ShowDetailQueryVariables>({
            query: ShowDetailDocument,
            variables: showDetailVariables,
            data: {
              ...existing,
              showDetail: {
                ...existing.showDetail,
                progress: nextProgress,
              },
            },
          });
        },
      });
    } catch (err) {
      console.error("Failed to update episode completion", err);
    } finally {
      setPendingEpisodeId(null);
    }
  };

  const handleMarkAllEpisodes = useCallback(async () => {
    setToastStatus({
      state: "loading",
      message: "Marking episodes as watched…",
    });
    try {
      const response = await markAllEpisodesComplete({
        variables: { showId },
        update(cache, result) {
          const updates =
            result.data?.markAllEpisodesComplete?.filter(
              (
                entry
              ): entry is NonNullable<
                MarkAllEpisodesCompleteMutation["markAllEpisodesComplete"][number]
              > => Boolean(entry?.episodeId)
            ) ?? [];

          if (updates.length === 0) {
            return;
          }

          const existing = cache.readQuery<
            ShowDetailQuery,
            ShowDetailQueryVariables
          >({
            query: ShowDetailDocument,
            variables: showDetailVariables,
          });

          if (!existing?.showDetail) {
            return;
          }

          const updateMap = new Map(
            updates.map((entry) => [entry.episodeId, entry])
          );

          const nextProgress: ShowDetailQuery["showDetail"]["progress"] = [];

          for (const entry of existing.showDetail.progress ?? []) {
            if (!entry?.episodeId) {
              continue;
            }
            const updateEntry = updateMap.get(entry.episodeId);
            if (updateEntry) {
              nextProgress.push({
                ...entry,
                ...updateEntry,
              });
              updateMap.delete(entry.episodeId);
            } else {
              nextProgress.push(entry);
            }
          }

          for (const updateEntry of updateMap.values()) {
            nextProgress.push(updateEntry);
          }

          cache.writeQuery<ShowDetailQuery, ShowDetailQueryVariables>({
            query: ShowDetailDocument,
            variables: showDetailVariables,
            data: {
              ...existing,
              showDetail: {
                ...existing.showDetail,
                progress: nextProgress,
              },
            },
          });
        },
      });

      const newlyMarkedCount =
        response.data?.markAllEpisodesComplete?.reduce((count, entry) => {
          return entry?.episodeId ? count + 1 : count;
        }, 0) ?? 0;

      if (newlyMarkedCount > 0) {
        setToastStatus({
          state: "success",
          message:
            newlyMarkedCount === 1
              ? "Marked 1 episode as watched."
              : `Marked ${newlyMarkedCount} episodes as watched.`,
        });
      } else {
        setToastStatus({
          state: "success",
          message: "All episodes were already marked as watched.",
        });
      }
    } catch (err) {
      console.error("Failed to mark all episodes complete", err);
      setToastStatus({
        state: "error",
        message: "Failed to mark every episode. Please try again.",
      });
    }
  }, [markAllEpisodesComplete, showDetailVariables, showId]);

  const handleRatingSave = async () => {
    if (!show) return;
    try {
      await rateShow({
        variables: {
          showId,
          stars: ratingDraft.stars,
          review: ratingDraft.review.trim() || null,
        },
        update: (cache, result) => {
          const updatedSubscription = result.data?.rateShow;
          if (!updatedSubscription) {
            return;
          }
          cache.updateQuery<ShowDetailQuery, ShowDetailQueryVariables>(
            {
              query: ShowDetailDocument,
              variables: showDetailVariables,
            },
            (existing) => {
              if (!existing?.showDetail) {
                return existing;
              }
              const showDetail = existing.showDetail;
              return {
                ...existing,
                showDetail: {
                  ...showDetail,
                  subscription: updatedSubscription,
                },
              } satisfies ShowDetailQuery;
            }
          );
        },
      });
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
        update: (cache, result) => {
          const updatedSubscription = result.data?.rateShow;
          cache.updateQuery<ShowDetailQuery, ShowDetailQueryVariables>(
            {
              query: ShowDetailDocument,
              variables: showDetailVariables,
            },
            (existing) => {
              if (!existing?.showDetail) {
                return existing;
              }
              const showDetail = existing.showDetail;
              return {
                ...existing,
                showDetail: {
                  ...showDetail,
                  subscription: updatedSubscription ?? null,
                },
              } satisfies ShowDetailQuery;
            }
          );
        },
      });
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

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative isolate w-full">
      <RatingModal
        isOpen={isRatingModalOpen}
        ratingDraft={ratingDraft}
        onStarsChange={handleDraftStarChange}
        onReviewChange={(value) =>
          setRatingDraft((prev) => ({ ...prev, review: value }))
        }
        onClose={handleCloseRatingModal}
        onSave={() => {
          void handleRatingSave();
        }}
        onClear={() => {
          void handleRatingClear();
        }}
        canClear={
          (subscription?.ratingStars ?? 0) > 0 ||
          Boolean(subscription?.ratingReview)
        }
        loading={rateLoading}
        showTitle={show?.title ?? null}
      />
      <ActionToast status={toastStatus} />
      <BackToProfileLink />
      <AuroraBackground
        className="opacity-80"
        variant={hasEpisodesToMark ? "default" : "completed"}
      />
      {showScrollTop && !episodesInitialLoading ? (
        <div className="fixed bottom-16 right-8 z-50">
          <InteractiveButton
            variant="outline"
            size="sm"
            onClick={handleScrollToTop}
            icon={
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 9.5L8 5l4.5 4.5" />
                <path d="M8 5v8" />
              </svg>
            }
            className="shadow-[0_20px_60px_rgba(47,24,86,0.45)] hover:-translate-y-0.5"
            aria-label="Back to top"
          >
            Back to top
          </InteractiveButton>
        </div>
      ) : null}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-16">
        {heroLoading ? (
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.05] px-6 py-10 sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(164,132,255,0.18),_transparent_75%)]"
              aria-hidden
            />
            <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-start">
              <div className="relative mx-auto w-44 shrink-0 sm:w-56 lg:mx-0 lg:w-64">
                <div
                  className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-white/20 via-transparent to-white/10 opacity-60 blur-3xl"
                  aria-hidden
                />
                <div className="aspect-square animate-pulse rounded-[32px] border border-white/10 bg-white/10" />
              </div>
              <div className="flex-1 space-y-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-4">
                    <div className="h-6 w-44 animate-pulse rounded-full bg-white/10" />
                    <div className="h-10 w-3/4 animate-pulse rounded-full bg-white/12" />
                    <div className="flex flex-wrap gap-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                          key={`hero-stat-pill-${idx}`}
                          className="h-6 w-28 animate-pulse rounded-full bg-white/10"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex w-full max-w-xs flex-col gap-3">
                    <div className="h-10 w-full animate-pulse rounded-full bg-white/10" />
                    <div className="h-10 w-full animate-pulse rounded-full bg-white/10" />
                    <div className="h-10 w-full animate-pulse rounded-full bg-white/10" />
                  </div>
                </div>
                <div className="relative max-w-3xl">
                  <div
                    className="space-y-2"
                    style={{
                      WebkitMaskImage:
                        "linear-gradient(180deg, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                      maskImage:
                        "linear-gradient(180deg, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)",
                    }}
                  >
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={`hero-description-line-${idx}`}
                        className="h-4 w-full animate-pulse rounded-full bg-white/10"
                      />
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center translate-y-2 pb-4">
                    <div
                      className="h-7 w-28 animate-pulse rounded-full border border-white/15 bg-white/10"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div
                      key={`hero-pill-${idx}`}
                      className="h-6 w-24 animate-pulse rounded-full bg-white/10"
                    />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="h-10 w-48 animate-pulse rounded-full bg-white/10" />
                  <div className="h-12 w-full animate-pulse rounded-2xl bg-white/8" />
                </div>
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
          <HeroSection
            show={show}
            subscription={subscription}
            isSubscribed={isSubscribed}
            isMutatingSubscription={isMutatingSubscription}
            onSubscribeToggle={() => {
              void handleSubscribeToggle();
            }}
            onOpenRatingModal={handleOpenRatingModal}
            onMarkAllEpisodes={() => {
              void handleMarkAllEpisodes();
            }}
            markAllLoading={markAllLoading}
            hasEpisodesToMark={hasEpisodesToMark}
            canRateShow={canRateShow}
            ratingDisplayValue={ratingDisplayValue}
            subscriptionAddedAt={subscriptionAddedAt}
            ratingUpdatedAt={ratingUpdatedAt}
            watchedCount={watchedCount}
          />
        ) : null}

        <EpisodeSection
          showId={showId}
          episodesConnection={episodesConnection}
          progressMap={progressMap}
          isSubscribed={isSubscribed}
          episodesInitialLoading={episodesInitialLoading}
          progressSyncing={progressSyncing}
          onEpisodeCompletion={handleEpisodeCompletion}
          pendingEpisodeId={pendingEpisodeId}
          markProgressLoading={markProgressLoading}
          onLoadMore={handleLoadMore}
          loadingMore={loadingMore}
        />
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

function BackToProfileLink(): JSX.Element | null {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <a
      href="/app/profile"
      className="group fixed left-4 top-4 z-[999] inline-flex items-center gap-3 rounded-full border border-white/15 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#12072d]/80 shadow-[0_12px_35px_rgba(17,8,40,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#bcaeff] hover:bg-[#f5f0ff] hover:text-[#12072d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
    >
      <svg
        aria-hidden
        viewBox="0 0 28 16"
        className="h-3.5 w-6 text-[#8f73ff] transition-colors duration-200 group-hover:text-[#5635c7]"
        fill="none"
      >
        <path
          d="M10.5 1.5L3 8l7.5 6.5"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26 8H4"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
      <span className="transition-colors duration-200 group-hover:text-[#12072d]">
        Back to profile
      </span>
    </a>,
    document.body
  );
}
