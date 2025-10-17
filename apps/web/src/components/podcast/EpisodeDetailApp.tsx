import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  EpisodeDetailsDocument,
  type EpisodeDetailsQuery,
  type EpisodeDetailsQueryVariables,
  EpisodeProgressByIdsDocument,
  type EpisodeProgressByIdsQuery,
  type EpisodeProgressByIdsQueryVariables,
  MarkEpisodeProgressDocument,
  type MarkEpisodeProgressMutation,
  type MarkEpisodeProgressMutationVariables,
  ShowByIdDocument,
  type ShowByIdQuery,
  type ShowByIdQueryVariables,
} from "@shared";
import { AuroraBackground, GlowCard, InteractiveButton } from "@ui";

interface EpisodeDetailAppProps {
  showId: string;
  episodeId: string;
}

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
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
      dateStyle: "full",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export default function EpisodeDetailApp({
  showId,
  episodeId,
}: EpisodeDetailAppProps) {
  const {
    data: showData,
    loading: showLoading,
    error: showError,
  } = useQuery<ShowByIdQuery, ShowByIdQueryVariables>(ShowByIdDocument, {
    variables: { showId },
  });
  const {
    data: episodeData,
    loading: episodeLoading,
    error: episodeError,
  } = useQuery<EpisodeDetailsQuery, EpisodeDetailsQueryVariables>(
    EpisodeDetailsDocument,
    {
      variables: { showId, episodeId },
    }
  );

  const {
    data: progressData,
    refetch: refetchProgress,
    loading: progressLoading,
  } = useQuery<EpisodeProgressByIdsQuery, EpisodeProgressByIdsQueryVariables>(
    EpisodeProgressByIdsDocument,
    {
      variables: { episodeIds: [episodeId] },
    }
  );

  const [markProgress, { loading: progressMutating }] = useMutation<
    MarkEpisodeProgressMutation,
    MarkEpisodeProgressMutationVariables
  >(MarkEpisodeProgressDocument);

  const episode = episodeData?.episode ?? null;
  const progress = useMemo(() => {
    const list = progressData?.episodeProgress ?? [];
    return list.length > 0 ? (list[0] ?? null) : null;
  }, [progressData]);
  const [draftProgress, setDraftProgress] = useState<number>(
    progress?.positionSec ?? 0
  );

  const descriptionHtml =
    episode?.htmlDescription ?? episode?.description ?? "";
  const languages = episode?.languages?.filter(Boolean) ?? [];

  useEffect(() => {
    setDraftProgress(progress?.positionSec ?? 0);
  }, [progress?.positionSec]);

  const totalDuration = Number(episode?.durationSec ?? 0);

  const handleProgressUpdate = async (positionSec: number) => {
    if (!episode) return;
    const bounded = Math.max(0, Math.min(positionSec, totalDuration));
    const completed = totalDuration > 0 ? bounded >= totalDuration - 5 : false;
    await markProgress({
      variables: {
        episodeId,
        positionSec: Math.round(bounded),
        completed,
      },
    });
    await refetchProgress();
  };

  if (episodeLoading || showLoading || progressLoading) {
    return (
      <div className="relative isolate w-full">
        <AuroraBackground className="opacity-80" />
        <div className="relative z-10 mx-auto flex max-w-4xl items-center justify-center px-6 py-20 text-sm text-white/70">
          Loading episode…
        </div>
      </div>
    );
  }

  if (episodeError || showError) {
    return (
      <div className="rounded-3xl border border-red-500/40 bg-red-500/20 p-6 text-sm text-red-100">
        Failed to load episode: {episodeError?.message ?? showError?.message}
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/70">
        Episode not found.
      </div>
    );
  }

  return (
    <div className="relative isolate w-full">
      <AuroraBackground className="opacity-70" />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
        <a
          href={`/app/show/${showId}`}
          className="text-xs uppercase tracking-[0.35em] text-white/50 transition hover:text-white"
        >
          &larr; Back to podcast
        </a>

        <GlowCard className="w-full max-w-none px-10 py-12">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
              <div className="relative aspect-square w-36 overflow-hidden rounded-3xl border border-white/10 shadow-[0_24px_60px_rgba(41,23,90,0.45)]">
                {episode.image ? (
                  <img
                    src={episode.image}
                    alt={episode.title ?? "Episode artwork"}
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

              <div className="flex-1 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    {showData?.show?.title}
                  </p>
                  <h1 className="text-3xl font-semibold text-white">
                    {episode.title}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-white/50">
                  <span>{formatDate(String(episode.publishedAt))}</span>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span>{formatDuration(totalDuration)}</span>
                  {progress?.completed ? (
                    <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-emerald-200">
                      Completed
                    </span>
                  ) : null}
                </div>
                {descriptionHtml ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none text-white/70 prose-p:my-2"
                    dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                  />
                ) : null}
                <div className="flex flex-wrap gap-3 text-sm text-white/70">
                  {episode.explicit ? (
                    <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs uppercase tracking-[0.3em] text-red-200">
                      Explicit
                    </span>
                  ) : null}
                  {episode.isExternallyHosted ? (
                    <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/50">
                      External host
                    </span>
                  ) : null}
                  {languages.length ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/50">
                      {languages.join(" · ")}
                    </span>
                  ) : null}
                  {episode.linkUrl ? (
                    <a
                      href={episode.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-white/75 transition hover:text-white"
                    >
                      Open in Spotify ↗
                    </a>
                  ) : null}
                  {episode.audioUrl && episode.audioUrl !== episode.linkUrl ? (
                    <a
                      href={episode.audioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-white/75 transition hover:text-white"
                    >
                      Preview audio ↗
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
                  <span>Progress</span>
                  <span>{formatDuration(draftProgress)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, totalDuration)}
                  value={draftProgress}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDraftProgress(value);
                  }}
                  onPointerUp={(event) => {
                    const value = Number(
                      (event.target as HTMLInputElement).value
                    );
                    void handleProgressUpdate(value);
                  }}
                  onMouseUp={(event) => {
                    const value = Number(
                      (event.target as HTMLInputElement).value
                    );
                    void handleProgressUpdate(value);
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#8f73ff]"
                />
                <div className="flex flex-wrap gap-3">
                  <InteractiveButton
                    variant="secondary"
                    onClick={() => {
                      setDraftProgress(totalDuration);
                      void handleProgressUpdate(totalDuration);
                    }}
                    isLoading={progressMutating}
                    loadingLabel="Updating…"
                  >
                    Mark complete
                  </InteractiveButton>
                  <InteractiveButton
                    variant="ghost"
                    onClick={() => {
                      setDraftProgress(0);
                      void handleProgressUpdate(0);
                    }}
                    isLoading={progressMutating}
                  >
                    Reset progress
                  </InteractiveButton>
                </div>
              </div>
            </div>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
