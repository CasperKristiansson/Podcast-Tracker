import { useCallback, useEffect, useMemo, useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import {
  EpisodesByShowDocument,
  type EpisodesByShowQuery,
  type EpisodesByShowQueryVariables,
  EpisodeProgressByIdsDocument,
  type EpisodeProgressByIdsQuery,
  type EpisodeProgressByIdsQueryVariables,
  MarkEpisodeProgressDocument,
  type MarkEpisodeProgressMutation,
  type MarkEpisodeProgressMutationVariables,
  MyProfileDocument,
  type MyProfileQuery,
  type MyProfileQueryVariables,
  type ProfileShow,
  UnsubscribeFromShowDocument,
  type UnsubscribeFromShowMutation,
  type UnsubscribeFromShowMutationVariables,
} from "@shared";
import { AuroraBackground, InteractiveButton } from "@ui";
import { cn } from "@ui/lib/cn";
import { GraphQLProvider } from "../graphql/GraphQLProvider";

interface CelebrationState {
  showId: string;
  seed: number;
}

const formatNumber = (value: number): string =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const normalizeDateInput = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
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

  const [fetchEpisodes] = useLazyQuery<
    EpisodesByShowQuery,
    EpisodesByShowQueryVariables
  >(EpisodesByShowDocument, {
    fetchPolicy: "network-only",
  });
  const [fetchProgress] = useLazyQuery<
    EpisodeProgressByIdsQuery,
    EpisodeProgressByIdsQueryVariables
  >(EpisodeProgressByIdsDocument, {
    fetchPolicy: "network-only",
  });

  const [markProgress, { loading: progressMutating }] = useMutation<
    MarkEpisodeProgressMutation,
    MarkEpisodeProgressMutationVariables
  >(MarkEpisodeProgressDocument);
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

  const spotlight = useMemo(
    () => data?.myProfile.spotlight ?? [],
    [data?.myProfile.spotlight]
  );

  const shows = useMemo(
    () => data?.myProfile.shows ?? [],
    [data?.myProfile.shows]
  );

  const handleCelebrate = useCallback(
    async (show: ProfileShow) => {
      try {
        setPendingShowId(show.showId);
        const { data: episodesData } = await fetchEpisodes({
          variables: { showId: show.showId, limit: 25 },
        });
        const episodes =
          episodesData?.episodes.items
            ?.filter(Boolean)
            ?.map((episode) => ({
              episodeId: episode?.episodeId ?? "",
              durationSec: episode?.durationSec ?? 0,
            }))
            ?.filter((episode) => episode.episodeId.length > 0) ?? [];

        if (episodes.length === 0) {
          setToast("No episodes available yet for this show.");
          return;
        }

        const episodeIds = episodes.map((episode) => episode.episodeId);
        const { data: progressData } = await fetchProgress({
          variables: { episodeIds },
        });
        const completedSet = new Set(
          progressData?.episodeProgress
            ?.filter((progress) => progress?.completed)
            ?.map((progress) => progress?.episodeId ?? "")
            ?.filter((id) => id.length > 0) ?? []
        );

        const nextEpisode = episodes.find(
          (episode) => !completedSet.has(episode.episodeId)
        );

        if (!nextEpisode) {
          setToast("You’re already caught up on the latest 25 episodes!");
          return;
        }

        await markProgress({
          variables: {
            episodeId: nextEpisode.episodeId,
            positionSec: Math.max(0, Math.round(nextEpisode.durationSec ?? 0)),
            completed: true,
            showId: show.showId,
          },
        });

        await refetchProfile();
        setCelebration({
          showId: show.showId,
          seed: Date.now(),
        });
      } catch (err) {
        console.error("Failed to log progress", err);
        setToast("We couldn’t log that episode. Please try again.");
      } finally {
        setPendingShowId(null);
      }
    },
    [fetchEpisodes, fetchProgress, markProgress, refetchProfile]
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
        });
        await refetchProfile();
        setToast(`Removed ${show.title} from your library.`);
      } catch (err) {
        console.error("Failed to unsubscribe", err);
        setToast("We couldn’t unsubscribe from that show. Please try again.");
      } finally {
        setUnsubscribingId(null);
      }
    },
    [refetchProfile, unsubscribeFromShow]
  );

  const handleUnsubscribeClick = useCallback(
    (show: ProfileShow) => {
      void handleUnsubscribe(show);
    },
    [handleUnsubscribe]
  );

  if (loading) {
    return (
      <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 py-24 md:px-12 md:py-32">
        <AuroraBackground className="opacity-45 saturate-200 mix-blend-screen" />
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#d9c4ff]/26 blur-[210px]" />
        <div className="pointer-events-none absolute -bottom-48 left-[-12%] h-[32rem] w-[32rem] rounded-full bg-[#5a2ae4]/24 blur-[190px]" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-[#291150]/20 blur-[190px]" />
        <div className="relative z-10 w-full max-w-lg rounded-[36px] border border-white/15 bg-[#190d3a]/85 px-10 py-12 text-center text-white/80 shadow-[0_40px_120px_rgba(18,7,60,0.55)] backdrop-blur-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
            Syncing profile
            <span className="h-1 w-1 animate-pulse rounded-full bg-[#f5e4ff]" />
          </span>
          <p className="mt-6 text-lg font-semibold text-white">
            Loading your soundscape…
          </p>
          <p className="mt-3 text-sm text-white/65">
            We’re fetching the latest shows, progress, and celebrations for your
            account.
          </p>
        </div>
      </div>
    );
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
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-3 pb-12 pt-12 sm:px-5 sm:pb-16 sm:pt-16 md:px-10 md:pb-28 md:pt-22">
          <header className="space-y-6 text-center md:text-left">
            <span className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.45em] text-white/70 md:self-start">
              Listening atlas
              <span className="inline-block h-1 w-1 rounded-full bg-[#f6ecff]" />
            </span>
            <h1 className="bg-gradient-to-r from-[#f6ecff] via-[#c7adff] to-[#8cd4ff] bg-clip-text text-4xl font-semibold text-transparent md:text-5xl">
              Your sound galaxy, refreshed.
            </h1>
            <p className="mx-auto max-w-2xl text-white/75 md:mx-0">
              Keep track of every story you follow with a luminous snapshot of
              the shows you love. Stats update in real-time as you celebrate
              each episode.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-3">
            <StatCard
              label="Active Shows"
              value={stats.totalShows}
              accent="from-[#cdb6ff] via-[#9c75ff] to-[#5d31d1]"
            />
            <StatCard
              label="Episodes Completed"
              value={stats.episodesCompleted}
              accent="from-[#dcbfff] via-[#ab7dff] to-[#6c3ae0]"
            />
            <StatCard
              label="Episodes In Progress"
              value={stats.episodesInProgress}
              accent="from-[#bea6ff] via-[#8a5cff] to-[#4e29aa]"
            />
          </section>

          {spotlight.length > 0 ? (
            <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[#1b0c3c]/85 p-4 md:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(143,109,255,0.22),_transparent_70%)]" />
              <div className="relative space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">
                      Spotlights · Unfinished Adventures
                    </h2>
                    <p className="text-sm text-white/65">
                      The shows most eager for your attention. Pick one and log
                      your next listen—confetti and cheers included.
                    </p>
                  </div>
                  <InteractiveButton
                    variant="ghost"
                    onClick={() => {
                      void refetchProfile();
                      setToast("Profile refreshed.");
                    }}
                  >
                    Refresh overview
                  </InteractiveButton>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {spotlight.map((show) => (
                    <SpotlightCard
                      key={show.showId}
                      show={show}
                      onCelebrate={handleCelebrateClick}
                      celebrating={
                        celebration?.showId === show.showId
                          ? celebration.seed
                          : null
                      }
                      disabled={
                        pendingShowId === show.showId || progressMutating
                      }
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {shows.length > 0 ? (
            <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#14072f]/85 p-2 backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(128,94,255,0.18),_transparent_75%)]" />
              <div className="relative space-y-6">
                <div className="flex flex-col gap-3 text-center md:flex-row md:items-end md:justify-between md:text-left">
                  <h2 className="text-2xl font-semibold text-white md:text-left">
                    Your Entire Library
                  </h2>
                  <p className="text-sm text-white/70 md:max-w-md md:text-right md:text-white/60">
                    Browse everything you&apos;ve saved—mark progress, celebrate
                    completions, or jump back into a show you love.
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  {shows.map((show) => (
                    <LibraryCard
                      key={show.showId}
                      show={show}
                      onCelebrate={handleCelebrateClick}
                      onUnsubscribe={handleUnsubscribeClick}
                      celebrating={
                        celebration?.showId === show.showId
                          ? celebration.seed
                          : null
                      }
                      disabled={
                        pendingShowId === show.showId || progressMutating
                      }
                      unsubscribing={unsubscribingId === show.showId}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="flex flex-col items-center gap-6 rounded-[32px] border border-white/10 bg-[#14072f]/85 p-10 text-center backdrop-blur-2xl">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-white">
                  Build your listening library
                </h2>
                <p className="text-sm text-white/60">
                  You haven&apos;t added any podcasts yet. Start by searching
                  for a show you love.
                </p>
              </div>
              <InteractiveButton
                variant="primary"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(
                      new CustomEvent("open-podcast-search")
                    );
                  }
                }}
                className="transition-transform duration-200 hover:scale-[1.03] focus-visible:scale-[1.03]"
              >
                Add your first show
              </InteractiveButton>
            </section>
          )}
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

interface StatCardProps {
  label: string;
  value: number;
  accent: string;
}

function StatCard({ label, value, accent }: StatCardProps): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] px-8 py-10 text-left shadow-[0_45px_100px_rgba(26,16,84,0.55)] backdrop-blur-2xl transition-transform duration-500 hover:-translate-y-1">
      <div
        className={cn(
          "absolute -inset-16 opacity-60 blur-3xl",
          `bg-gradient-to-br ${accent}`
        )}
        aria-hidden
      />
      <div className="relative z-10 space-y-3">
        <p className="text-xs uppercase tracking-[0.45em] text-white/70">
          {label}
        </p>
        <div className="text-4xl font-semibold text-white">
          {formatNumber(value)}
        </div>
      </div>
    </div>
  );
}

interface SpotlightCardProps {
  show: ProfileShow;
  onCelebrate: (show: ProfileShow) => void;
  celebrating: number | null;
  disabled: boolean;
}

function SpotlightCard({
  show,
  onCelebrate,
  celebrating,
  disabled,
}: SpotlightCardProps): JSX.Element {
  const syncedAtValue = normalizeDateInput(show.subscriptionSyncedAt);
  const hasImage = typeof show.image === "string" && show.image.length > 0;

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-white/12 p-8 shadow-[0_45px_110px_rgba(24,14,78,0.5)] backdrop-blur-2xl"
    >
      <div
        className={cn(
          "absolute inset-0 bg-[linear-gradient(140deg,rgba(162,122,255,0.22),rgba(66,40,162,0.36))]",
          hasImage ? "bg-cover bg-center" : null
        )}
        style={hasImage ? { backgroundImage: `url(${show.image})` } : undefined}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#07041c]/82" aria-hidden />

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              {show.publisher}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              {show.title}
            </h3>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricBadge label="Completed" value={show.completedEpisodes} />
          <MetricBadge
            label="Unlistened"
            value={show.unlistenedEpisodes}
            accent
          />
        </div>

        <div className="flex flex-col gap-3 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-white/80">
              Total episodes · {formatNumber(show.totalEpisodes)}
            </p>
            <p className="text-xs text-white/50">
              Synced {syncedAtValue ? formatDate(syncedAtValue) : "just now"}
            </p>
          </div>
          <InteractiveButton
            onClick={() => {
              void onCelebrate(show);
            }}
            isLoading={disabled}
            loadingLabel="Logging…"
            className="overflow-hidden"
          >
            <span className="relative z-10">Log a new listen</span>
          </InteractiveButton>
        </div>
      </div>

      <CelebrationOverlay active={Boolean(celebrating)} seed={celebrating} />
    </div>
  );
}

function SettingsIcon(props: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

interface LibraryCardProps {
  show: ProfileShow;
  onCelebrate: (show: ProfileShow) => void;
  onUnsubscribe: (show: ProfileShow) => void;
  celebrating: number | null;
  disabled: boolean;
  unsubscribing: boolean;
}

function LibraryCard({
  show,
  onCelebrate,
  onUnsubscribe,
  celebrating,
  disabled,
  unsubscribing,
}: LibraryCardProps): JSX.Element {
  const hasUnlistened = show.unlistenedEpisodes > 0;
  const addedAtValue = normalizeDateInput(show.addedAt);
  const hasImage = typeof show.image === "string" && show.image.length > 0;
  const celebrateDisabled = !hasUnlistened || disabled || unsubscribing;
  const celebrateLoading = disabled && hasUnlistened;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-[#120727]/90 p-5 shadow-[0_32px_80px_rgba(24,14,78,0.45)] backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(142,108,255,0.22),_transparent_80%)] opacity-90" />
      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:flex-1 md:items-center md:gap-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#1a113a]/70 shadow-[0_20px_50px_rgba(43,24,108,0.5)] h-44 w-full sm:h-40 sm:w-48 md:h-28 md:w-28">
            {hasImage ? (
              <img
                src={show.image}
                alt={`${show.title} cover art`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4a2c91] via-[#2b1769] to-[#140a38] text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60">
                No artwork
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/35 via-transparent to-black/25" />
          </div>
          <div className="space-y-3 text-left">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white sm:text-2xl">
                {show.title}
              </h3>
              <p className="text-xs uppercase tracking-[0.35em] text-white/45">
                {show.publisher}
              </p>
            </div>
            <p className="text-sm font-medium text-white/85 sm:text-base">
              Listened {formatNumber(show.completedEpisodes)} /{" "}
              {formatNumber(show.totalEpisodes)}
            </p>
            <p className="text-xs text-white/55 sm:text-sm">
              Remaining {formatNumber(show.unlistenedEpisodes)} episodes
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 text-xs text-white/55 sm:text-sm md:items-end md:text-right">
          <p className="text-white/60">
            Subscribed since{" "}
            {addedAtValue ? formatDate(addedAtValue) : "Unknown"}
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <InteractiveButton
              variant="ghost"
              onClick={() => {
                void onCelebrate(show);
              }}
              disabled={celebrateDisabled}
              className={cn(
                "w-full rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white/90 shadow-[0_20px_48px_rgba(92,63,186,0.35)] transition duration-300 sm:w-auto",
                celebrateDisabled
                  ? "opacity-60"
                  : "hover:-translate-y-0.5 hover:bg-white/16 hover:text-white hover:shadow-[0_26px_60px_rgba(104,78,212,0.4)] focus-visible:ring-[#c6b5ff]"
              )}
              isLoading={celebrateLoading}
              loadingLabel="Logging…"
            >
              {hasUnlistened ? "Mark next episode complete" : "Listen again"}
            </InteractiveButton>
            <InteractiveButton
              variant="outline"
              onClick={() => {
                void onUnsubscribe(show);
              }}
              disabled={unsubscribing}
              isLoading={unsubscribing}
              loadingLabel="Removing…"
              className={cn(
                "w-full rounded-full border-red-400/45 px-6 py-3 text-sm font-semibold text-red-100 transition duration-300 sm:w-auto",
                unsubscribing
                  ? "opacity-70"
                  : "hover:-translate-y-0.5 hover:border-red-300/70 hover:text-red-50 focus-visible:ring-red-200/40"
              )}
            >
              Remove show
            </InteractiveButton>
          </div>
        </div>
      </div>

      <CelebrationOverlay active={Boolean(celebrating)} seed={celebrating} />
    </div>
  );
}

interface MetricBadgeProps {
  label: string;
  value: number;
  accent?: boolean;
}

function MetricBadge({ label, value, accent = false }: MetricBadgeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 transition-colors duration-300",
        accent
          ? "border-[#d7c6ff]/55 bg-[linear-gradient(135deg,rgba(149,110,255,0.28),rgba(81,48,176,0.2))] text-[#f3edff] shadow-[0_18px_40px_rgba(92,63,186,0.35)]"
          : "border-white/12 bg-white/[0.06] text-white/75"
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.35em]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}

interface CelebrationOverlayProps {
  active: boolean;
  seed: number | null;
}

function CelebrationOverlay({
  active,
  seed,
}: CelebrationOverlayProps): JSX.Element | null {
  const pieces = useMemo(() => {
    if (!seed) return [];
    const random = mulberry32(seed);
    return Array.from({ length: 16 }, (_, index) => ({
      id: index,
      left: `${Math.round(random() * 100)}%`,
      delay: `${(random() * 0.6).toFixed(2)}s`,
      duration: `${1.4 + random() * 0.8}s`,
      rotation: `${random() * 360}deg`,
      scale: 0.6 + random() * 0.9,
      hue: Math.round(random() * 360),
    }));
  }, [seed]);

  if (!active || pieces.length === 0) {
    return null;
  }

  return (
    <>
      <style>
        {`@keyframes confetti-fall {
          0% { transform: translate3d(0, -20%, 0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate3d(0, 120%, 0) rotate(360deg); opacity: 0; }
        }`}
      </style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((piece) => (
          <span
            key={`${piece.id}-${seed}`}
            className="absolute h-2.5 w-2.5 rounded-full"
            style={{
              left: piece.left,
              top: "-10%",
              background: `conic-gradient(from 0deg at 50% 50%, hsl(${piece.hue} 90% 70%), hsl(${(piece.hue + 60) % 360} 80% 55%))`,
              animation: `confetti-fall ${piece.duration} ease-in forwards`,
              animationDelay: piece.delay,
              transform: `rotate(${piece.rotation}) scale(${piece.scale})`,
            }}
          />
        ))}
      </div>
    </>
  );
}

function mulberry32(seed: number): () => number {
  const base = Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 1;
  let t = base >>> 0 || 1;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
