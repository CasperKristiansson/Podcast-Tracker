import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProfileShow } from "@shared";
import { InteractiveButton } from "@ui";
import { cn } from "@ui/lib/cn";
import { formatDate, formatNumber } from "../../../lib/format";
import { normalizeDateInput } from "../../../lib/datetime";
import { navigateToShow } from "../utils";
import { CelebrationOverlay } from "./CelebrationOverlay";
import type { CelebrationState } from "../types";

interface LibrarySectionProps {
  shows: ProfileShow[];
  onCelebrate: (show: ProfileShow) => void;
  onUnsubscribe: (show: ProfileShow) => void;
  celebration: CelebrationState | null;
  pendingShowId: string | null;
  isMutating: boolean;
  unsubscribingId: string | null;
}

type LibraryFilterValue = "all" | "in-progress" | "completed" | "not-reviewed";

const LIBRARY_FILTERS: { value: LibraryFilterValue; label: string }[] = [
  { value: "all", label: "All started" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "not-reviewed", label: "Not reviewed" },
];
const LISTENING_ATLAS_FILE_NAME = "listening-atlas-prompt.md";

export function LibrarySection({
  shows,
  onCelebrate,
  onUnsubscribe,
  celebration,
  pendingShowId,
  isMutating,
  unsubscribingId,
}: LibrarySectionProps): JSX.Element {
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilterValue>("all");

  const startedShows = useMemo(() => {
    return shows.filter((show) => {
      const completed = show.completedEpisodes ?? 0;
      const inProgress = show.inProgressEpisodes ?? 0;
      return completed > 0 || inProgress > 0;
    });
  }, [shows]);

  const filteredShows = useMemo(() => {
    const filterShows = (predicate: (show: ProfileShow) => boolean) =>
      startedShows.filter(predicate);

    const hasReview = (show: ProfileShow) => {
      const rating =
        typeof show.ratingStars === "number" ? show.ratingStars : 0;
      const review =
        typeof show.ratingReview === "string" ? show.ratingReview.trim() : "";
      return rating > 0 || review.length > 0;
    };

    switch (libraryFilter) {
      case "in-progress":
        return filterShows((show) => {
          const inProgress = show.inProgressEpisodes ?? 0;
          const completed = show.completedEpisodes ?? 0;
          const unlistened = show.unlistenedEpisodes ?? 0;
          return inProgress > 0 || (completed > 0 && unlistened > 0);
        });
      case "completed":
        return filterShows((show) => {
          const completed = show.completedEpisodes ?? 0;
          const unlistened = show.unlistenedEpisodes ?? 0;
          return completed > 0 && unlistened === 0;
        });
      case "not-reviewed":
        return filterShows((show) => !hasReview(show));
      case "all":
      default:
        return startedShows;
    }
  }, [libraryFilter, startedShows]);
  const hasStartedShows = startedShows.length > 0;
  const emptyStateMessage = useMemo(() => {
    if (!hasStartedShows) {
      return "Start listening to a show to see it here.";
    }
    switch (libraryFilter) {
      case "not-reviewed":
        return "No shows waiting for a review right now.";
      case "completed":
        return "No completed shows to highlight yet.";
      case "in-progress":
        return "No shows currently in progress.";
      case "all":
      default:
        return "No shows to display yet.";
    }
  }, [hasStartedShows, libraryFilter]);

  const handleDownloadPrompt = useCallback(() => {
    if (typeof window === "undefined" || shows.length === 0) {
      return;
    }
    const promptMarkdown = buildListeningAtlasPrompt(shows);
    const file = new Blob([promptMarkdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = LISTENING_ATLAS_FILE_NAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [shows]);

  if (shows.length === 0) {
    return (
      <section className="flex flex-col items-center gap-6 rounded-[32px] border border-white/10 bg-[#14072f]/85 p-10 text-center backdrop-blur-2xl">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-white">
            Build your listening library
          </h2>
          <p className="text-sm text-white/60">
            You haven&apos;t added any podcasts yet. Start by searching for a
            show you love.
          </p>
        </div>
        <InteractiveButton
          variant="primary"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("open-podcast-search"));
            }
          }}
          className="transition-transform duration-200 hover:scale-[1.03] focus-visible:scale-[1.03]"
        >
          Add your first show
        </InteractiveButton>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#14072f]/85 p-2 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(128,94,255,0.18),_transparent_75%)]" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 px-4 pt-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-semibold text-white md:text-left">
            Your Entire Library
          </h2>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
            <LibraryFilterDropdown
              activeFilter={libraryFilter}
              onChange={setLibraryFilter}
            />
            <InteractiveButton
              variant="outline"
              onClick={handleDownloadPrompt}
              disabled={shows.length === 0}
              className="w-full rounded-full px-4 py-2 text-xs font-semibold md:w-auto md:text-sm md:leading-tight"
            >
              Download LLM prompt
            </InteractiveButton>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {filteredShows.length === 0 ? (
            <div className="mx-4 rounded-3xl border border-white/12 bg-white/[0.04] p-10 text-center text-sm text-white/70">
              {emptyStateMessage}
            </div>
          ) : null}
          {filteredShows.map((show) => (
            <LibraryCard
              key={show.showId}
              show={show}
              onCelebrate={onCelebrate}
              onUnsubscribe={onUnsubscribe}
              celebrating={
                celebration?.showId === show.showId ? celebration.seed : null
              }
              pending={pendingShowId === show.showId}
              globalMutating={isMutating}
              unsubscribing={unsubscribingId === show.showId}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface LibraryFilterDropdownProps {
  activeFilter: LibraryFilterValue;
  onChange: (value: LibraryFilterValue) => void;
}

function LibraryFilterDropdown({
  activeFilter,
  onChange,
}: LibraryFilterDropdownProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const activeLabel =
    LIBRARY_FILTERS.find((filter) => filter.value === activeFilter)?.label ??
    "All started";

  const handleSelect = (value: LibraryFilterValue) => {
    onChange(value);
    setMenuOpen(false);
  };

  return (
    <div className="relative inline-flex w-full max-w-xs flex-col md:w-auto md:max-w-none">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        className="inline-flex w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
      >
        <div className="flex flex-col text-left">
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/50">
            Filter shows
          </span>
          <span>{activeLabel}</span>
        </div>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`h-3 w-3 text-white/70 transition-transform duration-200 ${
            menuOpen ? "rotate-180" : "rotate-0"
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
      {menuOpen ? (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Library filters"
          className="absolute right-0 z-30 mt-2 w-full min-w-[230px] rounded-2xl border border-white/12 bg-[#14072f]/95 p-2 text-sm text-white shadow-[0_24px_80px_rgba(10,4,32,0.55)] backdrop-blur"
        >
          {LIBRARY_FILTERS.map(({ value, label }) => {
            const isActive = activeFilter === value;
            return (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]",
                  isActive
                    ? "bg-white/12 text-white"
                    : "text-white/70 hover:bg-white/10"
                )}
              >
                <span>{label}</span>
                {isActive ? <span aria-hidden>✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface LibraryCardProps {
  show: ProfileShow;
  onCelebrate: (show: ProfileShow) => void;
  onUnsubscribe: (show: ProfileShow) => void;
  celebrating: number | null;
  pending: boolean;
  globalMutating: boolean;
  unsubscribing: boolean;
}

function LibraryCard({
  show,
  onCelebrate,
  onUnsubscribe,
  celebrating,
  pending,
  globalMutating,
  unsubscribing,
}: LibraryCardProps): JSX.Element {
  const hasUnlistened = show.unlistenedEpisodes > 0;
  const hasImage = typeof show.image === "string" && show.image.length > 0;
  const addedAtValue = normalizeDateInput(show.addedAt);

  const celebrateLoading = pending && hasUnlistened;
  const celebrateDisabled =
    !hasUnlistened || unsubscribing || pending || (globalMutating && !pending);

  const handleNavigate = () => {
    navigateToShow(show.showId);
  };

  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-5 overflow-hidden rounded-[28px] border border-white/12 bg-[#190b36]/85 p-6 shadow-[0_38px_100px_rgba(21,10,52,0.5)] transition duration-300 hover:-translate-y-1 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(142,108,255,0.22),_transparent_80%)] opacity-90" />
      <div
        className="pointer-events-none absolute inset-0 bg-white/10 opacity-0 transition duration-200 ease-out group-hover:opacity-20 group-focus-visible:opacity-20"
        aria-hidden
      />
      <div className="pointer-events-none absolute right-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80 opacity-0 translate-y-1 transition duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
        View show
        <span aria-hidden>↗</span>
      </div>
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
              onClick={(event) => {
                event.stopPropagation();
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
              onClick={(event) => {
                event.stopPropagation();
                void onUnsubscribe(show);
              }}
              disabled={unsubscribing}
              isLoading={unsubscribing}
              loadingLabel="Removing…"
              compact
              className={cn(
                "h-10 w-10 rounded-full border border-white/10 bg-white/[0.05] p-0 text-white/60 transition duration-300",
                unsubscribing
                  ? "opacity-60"
                  : "hover:-translate-y-0.5 hover:bg-red-500/10 hover:text-red-200 focus-visible:ring-red-200/40"
              )}
              icon={<TrashIcon className="text-current" />}
            >
              <span className="sr-only">Remove show</span>
            </InteractiveButton>
          </div>
        </div>
      </div>

      <CelebrationOverlay active={Boolean(celebrating)} seed={celebrating} />
    </div>
  );
}

function buildListeningAtlasPrompt(shows: ProfileShow[]): string {
  const seedShows = shows.map((show) => ({
    podcast_name: show.title ?? "",
    publisher: show.publisher ?? "",
    stats: {
      user_rating_stars:
        typeof show.ratingStars === "number" ? show.ratingStars : null,
      user_review:
        typeof show.ratingReview === "string" ? show.ratingReview : "",
    },
  }));
  const seedJson = JSON.stringify(seedShows, null, 2);

  return `
You have web access. Your job: find new **scripted audio drama** podcasts available **on Spotify** only. No talk shows, interviews, news, education, true-crime documentary, recap, comedy chat, RPG actual-play, or non-fiction. Scripted fiction only.

GOAL
Return {{MAX_RESULTS}} high-quality Spotify audio dramas I have not logged below, ranked by fit to my tastes inferred from my seed list and reviews.

REGION
Assume availability in {{COUNTRY}}. If uncertain, prefer global availability.

INPUT — SEED PODCASTS I’VE HEARD
Paste JSON between the tags. Keep names exactly as shown on Spotify. “publisher” is the studio/network behind the show. “stats.user_rating_stars” and “stats.user_review” are my own ratings and notes.

<SEED_SHOWS_JSON>
${seedJson}
</SEED_SHOWS_JSON>

RESEARCH RULES
1) Search and cite only Spotify show pages. If a candidate lacks a valid Spotify show URL, exclude it.
2) Verify it is scripted fiction. Look for Spotify category tags, descriptions, cast, season labeling, and production notes that indicate drama/fiction. If uncertain, exclude.
3) Diversity: include a spread across subgenres when possible (mystery, thriller, sci-fi, horror, fantasy, noir).
4) Freshness: prefer series with recent releases or complete, acclaimed mini-series.
5) No duplicates of seed shows. No regional dead ends if {{COUNTRY}} cannot access.

RANKING
Compute:
- match_score [0–100]: textual similarity between seed reviews and candidate themes, tone, pacing, sound design.
- novelty_score [0–100]: how different it is from the largest clusters in my seed set while still aligned.
Final rank = round(0.7*match_score + 0.3*novelty_score).

OUTPUT FORMAT — JSON ONLY
Return a single JSON object with this shape:

{
  "summary": {
    "seed_count": <int>,
    "key_themes": ["<theme>", "..."],         // inferred from my reviews
    "method_note": "Spotify-only, scripted fiction verified"
  },
  "recommendations": [
    {
      "title": "<Spotify show title>",
      "publisher": "<studio/network>",
      "spotify_url": "https://open.spotify.com/show/....",
      "is_audio_drama": true,
      "status": "<ongoing|completed|miniseries>",
      "years": "YYYY–YYYY or YYYY–present",
      "typical_episode_length_min": <int|null>,
      "subgenres": ["mystery","thriller"],
      "why_it_matches": "One sentence that references my seed reviews directly.",
      "similar_to_seeds": ["<seed match 1>", "<seed match 2>"],
      "content_notes": ["violence","language"],     // if applicable
      "last_release_date": "YYYY-MM-DD",
      "match_score": <0-100>,
      "novelty_score": <0-100>,
      "rank": <1-based int>
    }
  ],
  "excluded_candidates": [
    {
      "title": "<name>",
      "reason": "<not on Spotify|not scripted fiction|region-locked|duplicate>"
    }
  ]
}

CONSTRAINTS
- Output must be valid JSON. No commentary before or after.
- Every recommendation must include a working Spotify show URL.
- If fewer than {{MAX_RESULTS}} valid scripted audio dramas are found, return the maximum valid number and explain shortage in summary.method_note.

VARIABLES TO SET BEFORE RUN
- {{MAX_RESULTS}} = 10
- {{COUNTRY}} = "Sweden"
`;
}

function TrashIcon({ className }: { className?: string }): JSX.Element {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
