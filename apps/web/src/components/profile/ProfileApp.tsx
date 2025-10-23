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
      <div className="relative isolate overflow-hidden px-6 py-20 sm:px-10">
        <AuroraBackground className="opacity-45 saturate-200 mix-blend-screen" />
        <div className="pointer-events-none absolute -top-48 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[#d8c3ff]/22 blur-[200px]" />
        <div className="pointer-events-none absolute -bottom-48 left-[-12%] h-[32rem] w-[32rem] rounded-full bg-[#6e49ff]/18 blur-[170px]" />
        <div className="pointer-events-none absolute -right-40 top-20 h-[30rem] w-[30rem] rounded-full bg-[#57dfff]/14 blur-[170px]" />
        <div className="relative z-10 flex min-h-[320px] flex-col items-center justify-center gap-4 text-center text-white/80">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
            Syncing profile
            <span className="h-1 w-1 animate-pulse rounded-full bg-[#f5e4ff]" />
          </span>
          <p className="text-lg font-semibold text-white">
            Loading your soundscape…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative isolate overflow-hidden px-6 py-16 text-sm text-rose-100 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,135,188,0.25),_transparent_75%)]" />
        <AuroraBackground className="opacity-35 saturate-200 mix-blend-screen" />
        <div className="relative z-10 mx-auto flex max-w-md flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-200/30 bg-rose-400/20 px-4 py-1 text-xs uppercase tracking-[0.35em] text-rose-100/80">
            Profile hiccup
          </span>
          <p className="text-base font-semibold text-rose-50">
            Failed to load profile: {error.message}
          </p>
          <InteractiveButton
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
    <div className="relative isolate overflow-hidden px-6 py-16 md:px-12 md:py-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-[#efe3ff]/22 blur-[220px]" />
        <div className="absolute -bottom-56 left-[-18%] h-[36rem] w-[36rem] rounded-full bg-[#7a58ff]/18 blur-[190px]" />
        <div className="absolute -right-48 top-24 h-[34rem] w-[34rem] rounded-full bg-[#5ee2ff]/14 blur-[190px]" />
      </div>
      <AuroraBackground className="opacity-45 saturate-200 mix-blend-screen" />
      <div className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-16">
          <header className="space-y-6 text-center md:text-left">
            <span className="inline-flex items-center justify-center gap-2 self-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.45em] text-white/70 md:self-start">
              Listening atlas
              <span className="inline-block h-1 w-1 rounded-full bg-[#f6ecff]" />
            </span>
            <h1 className="bg-gradient-to-r from-[#f6ecff] via-[#c7adff] to-[#8cd4ff] bg-clip-text text-4xl font-semibold text-transparent md:text-5xl">
              Your sound galaxy, refreshed.
            </h1>
            <p className="mx-auto max-w-2xl text-base text-white/75 md:mx-0">
              Keep track of every story you follow with a luminous snapshot of
              the shows you love. Stats update in real-time as you celebrate
              each episode.
            </p>
          </header>

          <section className="grid gap-6 md:grid-cols-3">
            <StatCard
              label="Active Shows"
              value={stats.totalShows}
              accent="from-[#deb2ff] via-[#a67bff] to-[#6541ff]"
            />
            <StatCard
              label="Episodes Completed"
              value={stats.episodesCompleted}
              accent="from-[#ffbdec] via-[#f76fdc] to-[#b43cff]"
            />
            <StatCard
              label="Episodes In Progress"
              value={stats.episodesInProgress}
              accent="from-[#9af9ff] via-[#4ad0ff] to-[#2476ff]"
            />
          </section>

          {spotlight.length > 0 ? (
            <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/[0.05] p-8 backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(135,97,255,0.22),_transparent_70%)]" />
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

          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(94,158,255,0.2),_transparent_75%)]" />
            <div className="relative space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <h2 className="text-2xl font-semibold text-white">
                  Your Entire Library
                </h2>
                <p className="text-sm text-white/60 md:max-w-md md:text-right">
                  Browse everything you&apos;ve saved—mark progress, celebrate
                  completions, or jump back into a show you love.
                </p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {shows.map((show) => (
                  <LibraryCard
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
            </div>
          </section>
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

  return (
    <TiltCard className="group bg-[linear-gradient(140deg,rgba(162,122,255,0.22),rgba(66,40,162,0.36))]">
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
          <span className="rounded-full border border-[#d8c8ff]/50 bg-[#7d59ff]/30 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.35em] text-white">
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
    <TiltCard className="bg-[linear-gradient(150deg,rgba(120,88,255,0.18),rgba(33,19,96,0.32))]">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-white">{show.title}</h3>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              {show.publisher}
            </p>
          </div>
          {hasUnlistened ? (
            <span className="rounded-full border border-[#8bffe2]/45 bg-[#32d9b0]/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#e8fff6]">
              {show.unlistenedEpisodes} to go
            </span>
          ) : (
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
              Fully caught up
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MetricBadge label="Completed" value={show.completedEpisodes} />
          <MetricBadge label="Progress" value={show.inProgressEpisodes} />
          <MetricBadge label="Total" value={show.totalEpisodes} />
        </div>

        <div className="flex flex-col gap-3 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Subscribed since{" "}
            {addedAtValue ? formatDate(addedAtValue) : "Unknown"}
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
        "rounded-2xl border px-4 py-3 transition-colors duration-300",
        accent
          ? "border-[#7efff0]/50 bg-[linear-gradient(135deg,rgba(66,255,213,0.22),rgba(73,139,255,0.18))] text-[#e8fff8] shadow-[0_18px_40px_rgba(82,236,255,0.25)]"
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
        "relative overflow-hidden rounded-3xl border border-white/12 p-8 shadow-[0_45px_110px_rgba(24,14,78,0.5)] backdrop-blur-2xl transition-transform duration-500 hover:-translate-y-1",
        "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_transparent_70%)] before:opacity-0 before:transition before:duration-500 hover:before:opacity-100",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_bottom,_rgba(144,94,255,0.28),_transparent_75%)] after:opacity-0 after:transition after:duration-500 hover:after:opacity-100",
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
