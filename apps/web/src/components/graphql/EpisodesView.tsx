import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  EpisodesByShowDocument,
  type EpisodesByShowQuery,
  type EpisodesByShowQueryVariables,
  type Episode,
} from "@shared";

interface EpisodesViewProps {
  showId: string;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remaining}s`;
  }
  return `${remaining}s`;
};

const formatDate = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export default function EpisodesView({
  showId,
}: EpisodesViewProps): JSX.Element {
  const { data, loading, error, refetch } = useQuery<
    EpisodesByShowQuery,
    EpisodesByShowQueryVariables
  >(EpisodesByShowDocument, {
    variables: { showId, limit: 20 },
  });

  const items = useMemo<Episode[]>(() => {
    const list = data?.episodes.items ?? [];
    return list.filter(
      (episode: Episode | null | undefined): episode is Episode =>
        Boolean(episode),
    );
  }, [data]);

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center">
        <div className="animate-pulse rounded-lg bg-brand-surface/60 px-4 py-2 text-sm text-brand-muted">
          Loading episodes…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
        Failed to load episodes: {error.message}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-brand-primary/30 bg-brand-surface/60 p-8 text-center">
        <h2 className="text-xl font-semibold text-brand-text">
          No episodes available
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          Once the nightly refresh runs, new episodes will appear here
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-brand-text">Episodes</h2>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="inline-flex items-center justify-center rounded-md border border-brand-primary/50 px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-brand-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          Refresh
        </button>
      </div>

      <ul className="space-y-4">
        {items.map((episode) => {
          const formattedDate = formatDate(String(episode.publishedAt));
          const duration = formatDuration(Number(episode.durationSec ?? 0));
          const audioUrl = episode.audioUrl ? String(episode.audioUrl) : "";

          return (
            <li
              key={episode.episodeId}
              className="rounded-xl border border-white/5 bg-brand-surface/60 p-5 shadow-lg shadow-brand-primary/10"
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-brand-text">
                  {episode.title}
                </h3>
                <div className="text-xs uppercase tracking-widest text-brand-muted">
                  {formattedDate} • {duration}
                </div>
                {audioUrl ? (
                  <a
                    className="text-sm font-medium text-brand-primary transition hover:text-brand-accent"
                    href={audioUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Listen preview
                  </a>
                ) : (
                  <span className="text-xs text-brand-muted">
                    Audio preview unavailable
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
