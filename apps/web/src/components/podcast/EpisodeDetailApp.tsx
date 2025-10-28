import { useMemo } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  EpisodeDetailsDocument,
  type EpisodeDetailsQuery,
  type EpisodeDetailsQueryVariables,
  ShowDetailDocument,
  type ShowDetailQuery,
  type ShowDetailQueryVariables,
  MarkEpisodeProgressDocument,
  type MarkEpisodeProgressMutation,
  type MarkEpisodeProgressMutationVariables,
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
    data: showDetailData,
    loading: showDetailLoading,
    error: showDetailError,
    refetch: refetchShowDetail,
  } = useQuery<ShowDetailQuery, ShowDetailQueryVariables>(ShowDetailDocument, {
    variables: {
      showId,
      episodeLimit: 0,
      episodeCursor: null,
      progressEpisodeIds: [episodeId],
    },
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

  const [markProgress, { loading: progressMutating }] = useMutation<
    MarkEpisodeProgressMutation,
    MarkEpisodeProgressMutationVariables
  >(MarkEpisodeProgressDocument);

  const episode = episodeData?.episode ?? null;
  const show = showDetailData?.showDetail?.show ?? null;
  const progress =
    showDetailData?.showDetail?.progress?.find(
      (entry) => entry?.episodeId === episodeId
    ) ?? null;
  const descriptionHtml =
    episode?.htmlDescription ?? episode?.description ?? "";
  const languages = episode?.languages?.filter(Boolean) ?? [];

  const totalDuration = Number(episode?.durationSec ?? 0);

  const isCompleted = Boolean(progress?.completed);
  const progressLabel = useMemo(() => {
    if (!totalDuration) return isCompleted ? "Completed" : "Not watched";
    return isCompleted
      ? `Completed · ${formatDuration(totalDuration)}`
      : `Not watched · ${formatDuration(totalDuration)}`;
  }, [isCompleted, totalDuration]);

  const handleCompletionToggle = async (completed: boolean) => {
    if (!episode) return;
    await markProgress({
      variables: {
        episodeId,
        completed,
        showId,
      },
    });
    await refetchShowDetail();
  };

  if (episodeLoading || showDetailLoading) {
    return (
      <div className="relative isolate w-full">
        <AuroraBackground className="opacity-80" />
        <div className="relative z-10 mx-auto flex max-w-4xl items-center justify-center px-6 py-20 text-sm text-white/70">
          Loading episode…
        </div>
      </div>
    );
  }

  if (episodeError || showDetailError) {
    return (
      <div className="rounded-3xl border border-red-500/40 bg-red-500/20 p-6 text-sm text-red-100">
        Failed to load episode:{" "}
        {episodeError?.message ?? showDetailError?.message}
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
                    {show?.title}
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
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/55">
                  <span>Status</span>
                  <span>{progressLabel}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <InteractiveButton
                    variant={isCompleted ? "outline" : "secondary"}
                    onClick={() => {
                      void handleCompletionToggle(!isCompleted);
                    }}
                    isLoading={progressMutating}
                    loadingLabel="Updating…"
                  >
                    {isCompleted ? "Mark as unwatched" : "Mark as watched"}
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
