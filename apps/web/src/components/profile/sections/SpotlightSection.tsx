import type { ProfileShow } from "@shared";
import { InteractiveButton } from "@ui";
import { cn } from "@ui/lib/cn";
import { formatDate, formatNumber } from "../../../lib/format";
import { normalizeDateInput } from "../../../lib/datetime";
import { navigateToShow } from "../utils";
import { CelebrationOverlay } from "./CelebrationOverlay";
import type { CelebrationState } from "../types";

interface SpotlightSectionProps {
  spotlight: ProfileShow[];
  onRefresh: () => void;
  onCelebrate: (show: ProfileShow) => void;
  celebration: CelebrationState | null;
  pendingShowId: string | null;
  isMutating: boolean;
}

export function SpotlightSection({
  spotlight,
  onRefresh,
  onCelebrate,
  celebration,
  pendingShowId,
  isMutating,
}: SpotlightSectionProps): JSX.Element {
  if (spotlight.length === 0) {
    return <></>;
  }

  const getCompletedEpisodes = (show: ProfileShow): number => {
    const raw = (show as { completedEpisodes?: unknown }).completedEpisodes;
    if (typeof raw === "number") {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const hasProgress = (show: ProfileShow): boolean =>
    getCompletedEpisodes(show) > 0;

  const orderedSpotlight = [
    ...spotlight.filter(hasProgress),
    ...spotlight.filter((show) => !hasProgress(show)),
  ];

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[#1b0c3c]/85 p-4 md:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(143,109,255,0.22),_transparent_70%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">
              Spotlights · Unfinished Adventures
            </h2>
            <p className="text-sm text-white/65">
              The shows most eager for your attention. Pick one and log your
              next listen—confetti and cheers included.
            </p>
          </div>
          <InteractiveButton variant="ghost" onClick={onRefresh}>
            Refresh overview
          </InteractiveButton>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {orderedSpotlight.map((show) => (
            <SpotlightCard
              key={show.showId}
              show={show}
              onCelebrate={onCelebrate}
              celebrating={
                celebration?.showId === show.showId ? celebration.seed : null
              }
              pending={pendingShowId === show.showId}
              globalMutating={isMutating}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface SpotlightCardProps {
  show: ProfileShow;
  onCelebrate: (show: ProfileShow) => void;
  celebrating: number | null;
  pending: boolean;
  globalMutating: boolean;
}

function SpotlightCard({
  show,
  onCelebrate,
  celebrating,
  pending,
  globalMutating,
}: SpotlightCardProps): JSX.Element {
  const syncedAtValue = normalizeDateInput(show.subscriptionSyncedAt);
  const hasImage = typeof show.image === "string" && show.image.length > 0;

  const handleNavigate = () => {
    navigateToShow(show.showId);
  };

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-3xl border border-white/12 p-8 shadow-[0_45px_110px_rgba(24,14,78,0.5)] backdrop-blur-2xl focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
      role="link"
      tabIndex={0}
      aria-label={`View details for ${show.title ?? "podcast"}`}
      onClick={handleNavigate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNavigate();
        }
      }}
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
      <div
        className="pointer-events-none absolute inset-0 bg-white/10 opacity-0 transition duration-200 ease-out group-hover:opacity-20 group-focus-visible:opacity-20"
        aria-hidden
      />
      <div className="pointer-events-none absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 opacity-0 translate-y-1 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        View show
        <span aria-hidden>↗</span>
      </div>

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
            onClick={(event) => {
              event.stopPropagation();
              void onCelebrate(show);
            }}
            disabled={pending || (globalMutating && !pending)}
            isLoading={pending}
            loadingLabel="Logging…"
            className="overflow-hidden transition-colors duration-300 hover:bg-[#bcaeff]/80 hover:shadow-[0_24px_60px_rgba(140,105,255,0.45)]"
          >
            <span className="relative z-10">Log a new listen</span>
          </InteractiveButton>
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
