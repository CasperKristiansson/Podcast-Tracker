import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  MarkNextEpisodeCompleteDocument,
  type MarkNextEpisodeCompleteMutation,
  type MarkNextEpisodeCompleteMutationVariables,
  MyProfileDocument,
  type MyProfileQuery,
  type MyProfileQueryVariables,
  type ProfileShow,
  UnsubscribeFromShowDocument,
  type UnsubscribeFromShowMutation,
  type UnsubscribeFromShowMutationVariables,
} from "@shared";
import { AuroraBackground, InteractiveButton } from "@ui";
import { normalizeDateInput } from "../../lib/datetime";
import { GraphQLProvider } from "../graphql/GraphQLProvider";
import { StatsSection } from "./sections/StatsSection";
import { SpotlightSection } from "./sections/SpotlightSection";
import { LibrarySection } from "./sections/LibrarySection";
import type { CelebrationState } from "./types";
import { ProfileSkeleton } from "./sections/ProfileSkeleton";

const toFiniteNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const computeSpotlightList = (
  shows: (ProfileShow | null | undefined)[] | null | undefined
): ProfileShow[] => {
  const validShows = (shows ?? []).filter((entry): entry is ProfileShow =>
    Boolean(entry)
  );

  return validShows
    .filter((show) => toFiniteNumber(show.unlistenedEpisodes) > 0)
    .sort((a, b) => {
      const aCompleted = toFiniteNumber(a.completedEpisodes);
      const bCompleted = toFiniteNumber(b.completedEpisodes);
      if (aCompleted > 0 !== bCompleted > 0) {
        return aCompleted > 0 ? -1 : 1;
      }
      const unlistenedDelta =
        toFiniteNumber(b.unlistenedEpisodes) -
        toFiniteNumber(a.unlistenedEpisodes);
      if (unlistenedDelta !== 0) {
        return unlistenedDelta;
      }
      const titleA = typeof a.title === "string" ? a.title : "";
      const titleB = typeof b.title === "string" ? b.title : "";
      return titleA.localeCompare(titleB);
    })
    .slice(0, 4);
};

function ProfileAppContent(): JSX.Element {
  const {
    data,
    loading,
    error,
    refetch: refetchProfile,
  } = useQuery<MyProfileQuery, MyProfileQueryVariables>(MyProfileDocument, {
    fetchPolicy: "network-only",
  });

  const [markNextEpisodeComplete, { loading: progressMutating }] = useMutation<
    MarkNextEpisodeCompleteMutation,
    MarkNextEpisodeCompleteMutationVariables
  >(MarkNextEpisodeCompleteDocument);
  const [unsubscribeFromShow] = useMutation<
    UnsubscribeFromShowMutation,
    UnsubscribeFromShowMutationVariables
  >(UnsubscribeFromShowDocument);

  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingShowId, setPendingShowId] = useState<string | null>(null);
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!celebration) return;
    const timeout = window.setTimeout(() => setCelebration(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  const stats = data?.myProfile.stats ?? {
    totalShows: 0,
    episodesCompleted: 0,
    episodesInProgress: 0,
  };

  const shows = useMemo<ProfileShow[]>(
    () =>
      (data?.myProfile.shows ?? []).filter((entry): entry is ProfileShow =>
        Boolean(entry)
      ),
    [data?.myProfile.shows]
  );

  const spotlight = useMemo<ProfileShow[]>(
    () => computeSpotlightList(shows),
    [shows]
  );
  const handleCelebrate = useCallback(
    async (show: ProfileShow) => {
      try {
        setPendingShowId(show.showId);
        const { data: progressData } = await markNextEpisodeComplete({
          variables: { showId: show.showId, limit: 25 },
          update: (cache, { data: progressMutation }) => {
            const progress = progressMutation?.markNextEpisodeComplete;
            if (!progress) {
              return;
            }

            cache.updateQuery<MyProfileQuery>(
              { query: MyProfileDocument, variables: {} },
              (existingProfile) => {
                const profile = existingProfile?.myProfile;
                if (!profile) {
                  return existingProfile;
                }

                const updateShowList = (
                  list: (ProfileShow | null | undefined)[] | null | undefined
                ): ProfileShow[] =>
                  (list ?? [])
                    .map((entry) => {
                      if (!entry || entry.showId !== show.showId) {
                        return entry ?? null;
                      }
                      const completedEpisodes =
                        (entry.completedEpisodes ?? 0) + 1;
                      const unlistenedEpisodes = Math.max(
                        0,
                        (entry.unlistenedEpisodes ?? 0) - 1
                      );
                      const inProgressEpisodes = Math.max(
                        0,
                        entry.inProgressEpisodes ?? 0
                      );
                      const addedAt =
                        normalizeDateInput(entry.addedAt) ??
                        new Date().toISOString();
                      const subscriptionSyncedAt = normalizeDateInput(
                        entry.subscriptionSyncedAt
                      );
                      return {
                        ...entry,
                        __typename: entry.__typename ?? "ProfileShow",
                        completedEpisodes,
                        inProgressEpisodes,
                        unlistenedEpisodes,
                        addedAt,
                        subscriptionSyncedAt: subscriptionSyncedAt ?? null,
                      } satisfies ProfileShow;
                    })
                    .filter((entry): entry is ProfileShow => Boolean(entry));

                const updatedShows = updateShowList(profile.shows);
                const updatedSpotlight = computeSpotlightList(updatedShows);

                const currentStats =
                  profile.stats ??
                  ({
                    __typename: "ProfileStats",
                    totalShows: 0,
                    episodesCompleted: 0,
                    episodesInProgress: 0,
                  } satisfies MyProfileQuery["myProfile"]["stats"]);

                const updatedStats = {
                  __typename: currentStats.__typename ?? "ProfileStats",
                  totalShows: currentStats.totalShows ?? 0,
                  episodesCompleted: (currentStats.episodesCompleted ?? 0) + 1,
                  episodesInProgress: currentStats.episodesInProgress ?? 0,
                } satisfies MyProfileQuery["myProfile"]["stats"];

                return {
                  __typename: existingProfile?.__typename ?? "Query",
                  myProfile: {
                    __typename: profile.__typename ?? "UserProfile",
                    stats: updatedStats,
                    spotlight: updatedSpotlight,
                    shows: updatedShows,
                  },
                } satisfies MyProfileQuery;
              }
            );
          },
        });

        if (!progressData?.markNextEpisodeComplete) {
          setToast("We couldn’t log that episode. Please try again.");
          return;
        }

        setCelebration({
          showId: show.showId,
          seed: Date.now(),
        });
      } catch (err) {
        console.error("Failed to log progress", err);
        const message =
          err instanceof Error && err.message
            ? err.message
            : "We couldn’t log that episode. Please try again.";
        setToast(message);
      } finally {
        setPendingShowId(null);
      }
    },
    [markNextEpisodeComplete]
  );

  const handleCelebrateClick = useCallback(
    (show: ProfileShow) => {
      void handleCelebrate(show);
    },
    [handleCelebrate]
  );

  const handleUnsubscribe = useCallback(
    async (show: ProfileShow) => {
      try {
        setUnsubscribingId(show.showId);
        await unsubscribeFromShow({
          variables: { showId: show.showId },
          update: (cache) => {
            cache.updateQuery<MyProfileQuery>(
              {
                query: MyProfileDocument,
                variables: {},
              },
              (existing) => {
                const currentProfile = existing?.myProfile;
                if (!currentProfile) {
                  return existing;
                }

                const showsList = currentProfile.shows ?? [];
                const showRemoved = showsList.some(
                  (profileShow) => profileShow?.showId === show.showId
                );

                if (!showRemoved) {
                  return existing;
                }

                const filteredShows = showsList.filter(
                  (profileShow) => profileShow?.showId !== show.showId
                );
                const updatedSpotlight = computeSpotlightList(filteredShows);

                const currentStats = currentProfile.stats;
                const updatedStats = {
                  __typename: currentStats.__typename ?? "ProfileStats",
                  totalShows: Math.max(0, (currentStats.totalShows ?? 0) - 1),
                  episodesCompleted: currentStats.episodesCompleted ?? 0,
                  episodesInProgress: currentStats.episodesInProgress ?? 0,
                } satisfies MyProfileQuery["myProfile"]["stats"];

                return {
                  __typename: existing?.__typename ?? "Query",
                  myProfile: {
                    __typename: currentProfile.__typename ?? "UserProfile",
                    stats: updatedStats,
                    spotlight: updatedSpotlight,
                    shows: filteredShows,
                  },
                } satisfies MyProfileQuery;
              }
            );
          },
        });
        setToast(`Removed ${show.title} from your library.`);
      } catch (err) {
        console.error("Failed to unsubscribe", err);
        setToast("We couldn’t unsubscribe from that show. Please try again.");
      } finally {
        setUnsubscribingId(null);
      }
    },
    [unsubscribeFromShow]
  );
  const handleUnsubscribeClick = useCallback(
    (show: ProfileShow) => {
      void handleUnsubscribe(show);
    },
    [handleUnsubscribe]
  );

  const handleRefreshOverview = useCallback(() => {
    void refetchProfile();
    setToast("Profile refreshed.");
  }, [refetchProfile]);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-24 text-sm text-white md:px-12 md:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(154,114,255,0.26),_transparent_75%)]" />
        <AuroraBackground className="opacity-35 saturate-200 mix-blend-screen" />
        <div className="relative z-10 w-full max-w-lg rounded-[36px] border border-white/15 bg-[#1d0a3f]/85 px-10 py-12 text-center shadow-[0_45px_120px_rgba(35,12,82,0.55)] backdrop-blur-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d5c3ff]/40 bg-[#7c5cff]/25 px-4 py-1 text-xs uppercase tracking-[0.35em] text-[#f0eaff]/80">
            Profile hiccup
          </span>
          <p className="mt-6 text-base font-semibold">
            Failed to load profile: {error.message}
          </p>
          <p className="mt-3 text-xs text-[#d6ccff]/75">
            We couldn’t reach the profile service. Give it another try in a
            moment.
          </p>
          <InteractiveButton
            className="mt-6"
            onClick={() => {
              void refetchProfile();
            }}
          >
            Try again
          </InteractiveButton>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-[#efe3ff]/26 blur-[240px]" />
        <div className="absolute -bottom-56 left-[-18%] h-[36rem] w-[36rem] rounded-full bg-[#5830d9]/22 blur-[210px]" />
        <div className="absolute -right-48 top-24 h-[34rem] w-[34rem] rounded-full bg-[#271052]/20 blur-[210px]" />
      </div>
      <AuroraBackground className="min-h-screen opacity-45 saturate-200 mix-blend-screen" />
      <div className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 pb-12 pt-10 sm:px-5 sm:pb-16 sm:pt-14 md:px-10 md:pb-24 md:pt-20">
          <header className="space-y-4 text-center md:text-left">
            <span className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.45em] text-white/70 md:self-start">
              Listening atlas
              <span className="inline-block h-1 w-1 rounded-full bg-[#f6ecff]" />
            </span>
            <h1 className="bg-gradient-to-r from-[#f6ecff] via-[#c7adff] to-[#8cd4ff] bg-clip-text text-3xl font-semibold text-transparent md:text-4xl">
              Your sound galaxy, refreshed.
            </h1>
            <p className="mx-auto max-w-xl text-sm text-white/75 md:mx-0 md:text-base">
              Keep track of every story you follow with a luminous snapshot of
              the shows you love. Stats update in real-time as you celebrate
              each episode.
            </p>
          </header>

          <StatsSection stats={stats} />

          <SpotlightSection
            spotlight={spotlight}
            onRefresh={handleRefreshOverview}
            onCelebrate={handleCelebrateClick}
            celebration={celebration}
            pendingShowId={pendingShowId}
            isMutating={progressMutating}
          />

          <LibrarySection
            shows={shows}
            onCelebrate={handleCelebrateClick}
            onUnsubscribe={handleUnsubscribeClick}
            celebration={celebration}
            pendingShowId={pendingShowId}
            isMutating={progressMutating}
            unsubscribingId={unsubscribingId}
          />
        </div>

        {toast ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center px-4">
            <div className="rounded-full border border-white/20 bg-gradient-to-r from-[#6f4bff]/85 via-[#3b1ec8]/85 to-[#14106d]/90 px-6 py-2 text-xs font-medium text-white shadow-[0_25px_60px_rgba(25,9,80,0.55)]">
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ProfileApp(): JSX.Element {
  return (
    <GraphQLProvider>
      <ProfileAppContent />
    </GraphQLProvider>
  );
}
