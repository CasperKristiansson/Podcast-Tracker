import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
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
} from "@shared";
import { AuroraBackground, InteractiveButton } from "@ui";
import { cn } from "@ui/lib/cn";

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

export default function ProfileApp(): JSX.Element {
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

  const [celebration, setCelebration] = useState<CelebrationState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingShowId, setPendingShowId] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="relative isolate w-full">
        <AuroraBackground className="opacity-80" />
        <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-center px-6 py-24 text-sm text-white/70">
          Loading your soundscape…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/40 bg-red-500/20 p-6 text-sm text-red-100">
        Failed to load profile: {error.message}
      </div>
    );
  }

  return (
    <div className="relative isolate">
      <AuroraBackground className="opacity-70" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 md:py-24">
        <header className="space-y-4 text-center md:text-left">
          <span className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.08] px-4 py-1 text-[11px] uppercase tracking-[0.45em] text-white/60">
            Your Listening Atlas
          </span>
          <h1 className="text-4xl font-semibold text-white md:text-5xl">
            Welcome back, curator.
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-white/70 md:mx-0">
            Your personal profile keeps an ambient snapshot of every podcast you
            care about—what’s waiting in your queue, what’s halfway through, and
            the stories you’ve completed.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="Active Shows"
            value={stats.totalShows}
            accent="from-[#86A8FF] to-[#6243FF]"
          />
          <StatCard
            label="Episodes Completed"
            value={stats.episodesCompleted}
            accent="from-[#F3B0FF] to-[#943DFF]"
          />
          <StatCard
            label="Episodes In Progress"
            value={stats.episodesInProgress}
            accent="from-[#9BF6FF] to-[#00B5D8]"
          />
        </section>

        {spotlight.length > 0 ? (
          <section className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Spotlights · Unfinished Adventures
                </h2>
                <p className="text-sm text-white/60">
                  The shows most eager for your attention. Pick one and log your
                  next listen—with animated cheers to celebrate.
                </p>
              </div>
              <InteractiveButton
                variant="ghost"
                onClick={() => {
                  void refetchProfile();
                  setToast("Profile refreshed.");
                }}
              >
                Refresh
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
                  disabled={pendingShowId === show.showId || progressMutating}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">
            Your Entire Library
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {shows.map((show) => (
              <LibraryCard
                key={show.showId}
                show={show}
                onCelebrate={handleCelebrateClick}
                celebrating={
                  celebration?.showId === show.showId ? celebration.seed : null
                }
                disabled={pendingShowId === show.showId || progressMutating}
              />
            ))}
          </div>
        </section>

        {toast ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-10 flex justify-center">
            <div className="rounded-full border border-white/20 bg-black/70 px-6 py-2 text-xs font-medium text-white shadow-lg shadow-black/40 backdrop-blur">
              {toast}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  accent: string;
}

function StatCard({ label, value, accent }: StatCardProps): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] px-8 py-10 text-left shadow-[0_30px_70px_rgba(35,24,73,0.4)] backdrop-blur-lg transition-transform duration-500 hover:-translate-y-1">
      <div
        className={cn(
          "absolute inset-x-1/3 -top-24 h-52 rounded-full blur-3xl",
          `bg-gradient-to-b ${accent}`
        )}
        aria-hidden
      />
      <div className="relative z-10 space-y-3">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">
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

  return (
    <TiltCard className="group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              {show.publisher}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-white">
              {show.title}
            </h3>
          </div>
          <span className="rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.35em] text-white/70">
            {show.unlistenedEpisodes} waiting
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <MetricBadge label="Completed" value={show.completedEpisodes} />
          <MetricBadge label="In Progress" value={show.inProgressEpisodes} />
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
    </TiltCard>
  );
}

interface LibraryCardProps {
  show: ProfileShow;
  onCelebrate: (show: ProfileShow) => void;
  celebrating: number | null;
  disabled: boolean;
}

function LibraryCard({
  show,
  onCelebrate,
  celebrating,
  disabled,
}: LibraryCardProps): JSX.Element {
  const hasUnlistened = show.unlistenedEpisodes > 0;
  const addedAtValue = normalizeDateInput(show.addedAt);

  return (
    <TiltCard className="bg-white/[0.03]">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">{show.title}</h3>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              {show.publisher}
            </p>
          </div>
          {hasUnlistened ? (
            <span className="rounded-full border border-emerald-300/40 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-100">
              {show.unlistenedEpisodes} to go
            </span>
          ) : (
            <span className="rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/60">
              Fully caught up
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricBadge label="Complete" value={show.completedEpisodes} />
          <MetricBadge label="Progress" value={show.inProgressEpisodes} />
          <MetricBadge label="Total" value={show.totalEpisodes} />
        </div>

        <div className="flex flex-col gap-3 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Subscribed since {addedAtValue ? formatDate(addedAtValue) : "Unknown"}
          </p>
          <InteractiveButton
            variant="ghost"
            onClick={() => {
              void onCelebrate(show);
            }}
            disabled={!hasUnlistened}
            className="self-start sm:self-auto"
            isLoading={disabled && hasUnlistened}
            loadingLabel="Logging…"
          >
            {hasUnlistened ? "Mark next episode complete" : "Listen again"}
          </InteractiveButton>
        </div>
      </div>

      <CelebrationOverlay active={Boolean(celebrating)} seed={celebrating} />
    </TiltCard>
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
        "rounded-2xl border px-4 py-3",
        accent
          ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
          : "border-white/10 bg-white/[0.04] text-white/70"
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.35em]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">
        {formatNumber(value)}
      </p>
    </div>
  );
}

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

function TiltCard({ children, className }: TiltCardProps): JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateX = ((y / rect.height - 0.5) * 12).toFixed(2);
      const rotateY = ((x / rect.width - 0.5) * -12).toFixed(2);
      node.style.setProperty("--tilt-x", `${rotateX}deg`);
      node.style.setProperty("--tilt-y", `${rotateY}deg`);
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/10 p-8 shadow-[0_35px_80px_rgba(28,20,70,0.45)] backdrop-blur-xl transition-transform duration-500",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.08] before:via-transparent before:to-transparent before:opacity-0 before:transition before:duration-500 hover:before:opacity-100",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent)] after:opacity-0 after:transition after:duration-500 hover:after:opacity-100",
        className
      )}
      style={{
        transform:
          "perspective(1200px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateZ(0)",
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="relative z-10">{children}</div>
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
