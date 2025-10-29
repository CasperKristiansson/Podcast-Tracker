import { useEffect, useMemo, useRef, useState } from "react";
import type { Episode, ShowDetailQuery } from "@shared";
import { InteractiveButton } from "@ui";
import {
  formatDate,
  formatDuration,
  formatRelative,
} from "../../../lib/format";

type EpisodeFilterValue = "all" | "unplayed" | "played";

const EPISODE_FILTERS: { value: EpisodeFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unplayed", label: "Unplayed" },
  { value: "played", label: "Watched" },
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

interface EpisodeSectionProps {
  episodesConnection: ShowDetailQuery["showDetail"]["episodes"] | null;
  progressMap: Map<string, ShowDetailQuery["showDetail"]["progress"][number]>;
  isSubscribed: boolean;
  episodesInitialLoading: boolean;
  progressSyncing: boolean;
  onEpisodeCompletion: (episode: Episode, completed: boolean) => Promise<void>;
  pendingEpisodeId: string | null;
  markProgressLoading: boolean;
  onLoadMore: () => Promise<void>;
  loadingMore: boolean;
}

export function EpisodeSection({
  episodesConnection,
  progressMap,
  isSubscribed,
  episodesInitialLoading,
  progressSyncing,
  onEpisodeCompletion,
  pendingEpisodeId,
  markProgressLoading,
  onLoadMore,
  loadingMore,
}: EpisodeSectionProps): JSX.Element {
  const [episodeFilter, setEpisodeFilter] = useState<EpisodeFilterValue>("all");
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const episodes = useMemo(() => {
    const items = episodesConnection?.items ?? [];
    return items.filter((episode): episode is Episode => Boolean(episode));
  }, [episodesConnection?.items]);

  const filteredEpisodes = useMemo(() => {
    if (episodeFilter === "all") {
      return episodes;
    }
    return episodes.filter((episode) => {
      const progress = progressMap.get(episode.episodeId);
      const isWatched = Boolean(progress?.completed);
      return episodeFilter === "played" ? isWatched : !isWatched;
    });
  }, [episodeFilter, episodes, progressMap]);

  const activeFilterLabel = useMemo(() => {
    const current = EPISODE_FILTERS.find(
      (filter) => filter.value === episodeFilter
    );
    return current?.label ?? "All";
  }, [episodeFilter]);

  useEffect(() => {
    if (!filterMenuOpen) {
      return undefined;
    }
    const handleClickOutside = (event: MouseEvent | Event) => {
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

  const canTrackProgress = isSubscribed;

  const handleFilterSelect = (value: EpisodeFilterValue) => {
    setEpisodeFilter(value);
    setFilterMenuOpen(false);
  };

  return (
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
                      onClick={() => handleFilterSelect(value)}
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

      {filteredEpisodes.length === 0 && !episodesInitialLoading ? (
        <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-10 text-center text-sm text-white/70">
          No episodes match this filter yet.
        </div>
      ) : null}

      <ul className="space-y-5">
        {episodesInitialLoading
          ? Array.from({ length: 3 }).map((_, idx) => (
              <EpisodeCardSkeleton key={`episode-skeleton-${idx}`} />
            ))
          : filteredEpisodes.map((episode, index) => {
              const progress = progressMap.get(episode.episodeId);
              const isWatched = Boolean(progress?.completed);
              const publishedAt = episode.publishedAt
                ? formatDate(String(episode.publishedAt))
                : "";
              const episodeLanguages =
                episode.languages?.filter(isNonEmptyString) ?? [];
              const durationSeconds = Number(episode.durationSec ?? 0);
              const durationLabel = formatDuration(durationSeconds);
              const isEpisodeUpdating =
                pendingEpisodeId === episode.episodeId && markProgressLoading;
              const canTrack = canTrackProgress;
              const cardClassName =
                canTrack && isWatched
                  ? "group relative overflow-hidden rounded-3xl border border-emerald-400/35 bg-gradient-to-br from-emerald-500/15 via-[#12072d]/70 to-[#12072d]/90 p-6 shadow-[0_28px_80px_rgba(9,93,69,0.35)] transition duration-300 hover:border-emerald-300/60 hover:shadow-[0_32px_90px_rgba(9,93,69,0.45)]"
                  : "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_60px_rgba(29,16,65,0.35)] transition duration-300 hover:border-white/25 hover:bg-white/[0.09]";

              return (
                <li key={episode.episodeId} className={cardClassName}>
                  <div
                    className={
                      canTrack && isWatched
                        ? "absolute -top-24 -right-20 h-48 w-48 rounded-full bg-emerald-400/25 blur-[110px] opacity-50"
                        : "absolute -top-24 -right-20 h-48 w-48 rounded-full bg-[#8f73ff]/20 blur-[110px] opacity-40"
                    }
                  />
                  <div className="relative flex flex-col gap-6">
                    {canTrack ? (
                      <div
                        className={
                          isWatched
                            ? "absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-100"
                            : "absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/60"
                        }
                      >
                        <span
                          className={
                            isWatched
                              ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/30 text-emerald-100"
                              : "flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/70"
                          }
                          aria-hidden
                        >
                          {isWatched ? (
                            <svg
                              viewBox="0 0 16 16"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 8l2.5 2.5L12 5" />
                            </svg>
                          ) : (
                            <span className="text-base leading-none">•</span>
                          )}
                        </span>
                        <span>{isWatched ? "Watched" : "Queued"}</span>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/45">
                      <span>{`Episode ${index + 1}`}</span>
                      <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
                      {publishedAt ? <span>{publishedAt}</span> : null}
                      <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
                      <span>{durationLabel}</span>
                      {progress?.updatedAt ? (
                        <>
                          <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
                          <span>
                            Updated{" "}
                            {formatRelative(
                              typeof progress.updatedAt === "string"
                                ? progress.updatedAt
                                : null
                            )}
                          </span>
                        </>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
                      <div className="flex flex-1 flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <h3 className="text-xl font-semibold text-white">
                            {episode.title}
                          </h3>
                          <p className="text-sm text-white/65">
                            {episode.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
                          {episode.explicit ? (
                            <span className="rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-red-200">
                              Explicit
                            </span>
                          ) : null}
                          {episodeLanguages.length ? (
                            <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-white/55">
                              {episodeLanguages.join(" · ")}
                            </span>
                          ) : null}
                          {episode.linkUrl ? (
                            <a
                              href={episode.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#12072d] transition hover:-translate-y-0.5 hover:bg-white/90"
                            >
                              Play on Spotify ↗
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {canTrack ? (
                      <div className="flex flex-wrap gap-3">
                        <InteractiveButton
                          variant={isWatched ? "outline" : "secondary"}
                          onClick={() => {
                            void onEpisodeCompletion(episode, !isWatched);
                          }}
                          disabled={
                            markProgressLoading &&
                            pendingEpisodeId !== episode.episodeId
                          }
                          isLoading={isEpisodeUpdating}
                          loadingLabel="Updating…"
                          className="transform hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(29,16,65,0.45)]"
                        >
                          {isWatched ? "Mark as unwatched" : "Mark as watched"}
                        </InteractiveButton>
                      </div>
                    ) : null}
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
              void onLoadMore();
            }}
            isLoading={loadingMore}
            loadingLabel="Loading…"
          >
            Load more episodes
          </InteractiveButton>
        </div>
      ) : null}
    </div>
  );
}

function EpisodeCardSkeleton(): JSX.Element {
  return (
    <li className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_24px_60px_rgba(29,16,65,0.35)]">
      <div
        className="absolute -top-24 -right-20 h-48 w-48 rounded-full bg-[#8f73ff]/20 blur-[110px] opacity-40"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6">
        <div className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs uppercase tracking-[0.35em] text-white/60">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
            <span className="h-2 w-2 rounded-full bg-white/25" />
          </span>
          <span className="h-3 w-16 rounded-full bg-white/15" />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/45">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`episode-meta-placeholder-${idx}`}
              className={`h-3 rounded-full bg-white/12 ${
                idx === 0
                  ? "w-28"
                  : idx === 1
                    ? "w-20"
                    : idx === 2
                      ? "w-16"
                      : "w-24"
              } animate-pulse`}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="h-6 w-3/4 animate-pulse rounded-full bg-white/12" />
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`episode-tag-placeholder-${idx}`}
                  className="h-7 w-28 animate-pulse rounded-full bg-white/10"
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-48 animate-pulse rounded-full bg-white/12" />
        </div>
      </div>
    </li>
  );
}
