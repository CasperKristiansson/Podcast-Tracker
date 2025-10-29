import type { ProfileShow } from "@shared";
import { InteractiveButton } from "@ui";
import { cn } from "@ui/lib/cn";
import { formatDate, formatNumber } from "../../../lib/format";
import { normalizeDateInput } from "../../../lib/datetime";
import { navigateToShow } from "../utils";

interface NotStartedSectionProps {
  shows: ProfileShow[];
}

export function NotStartedSection({
  shows,
}: NotStartedSectionProps): JSX.Element | null {
  if (shows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Ready for a First Listen
          </h2>
          <p className="text-sm text-white/65">
            Pick a show and dive into its very first episode.
          </p>
        </div>
      </div>
      <div className="-mx-3 overflow-x-auto px-3 pb-2">
        <ul className="flex gap-4">
          {shows.map((show) => {
            const normalizedAddedAt = normalizeDateInput(show.addedAt) ?? null;
            const hasImage = typeof show.image === "string" && show.image;
            const totalEpisodes = formatNumber(
              typeof show.totalEpisodes === "number"
                ? show.totalEpisodes
                : Number(show.totalEpisodes ?? 0) || 0
            );

            return (
              <li key={show.showId} className="min-w-[220px] max-w-[220px]">
                <article
                  role="link"
                  tabIndex={0}
                  aria-label={`Open ${show.title ?? "podcast"}`}
                  onClick={() => {
                    navigateToShow(show.showId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigateToShow(show.showId);
                    }
                  }}
                  className="group flex h-full flex-col gap-4 rounded-2xl border border-white/12 bg-white/5 p-4 shadow-[0_25px_60px_rgba(19,11,52,0.40)] transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
                >
                  <div
                    className={cn(
                      "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10",
                      hasImage ? "bg-cover bg-center" : ""
                    )}
                  >
                    {hasImage ? (
                      <img
                        src={show.image}
                        alt={show.title ?? "Podcast artwork"}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xs uppercase tracking-[0.35em] text-white/60">
                        Podcast
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.4em] text-white/50">
                      {show.publisher}
                    </p>
                    <h3 className="line-clamp-2 text-base font-semibold text-white">
                      {show.title}
                    </h3>
                    <p className="text-xs text-white/60">
                      {totalEpisodes} episodes ·{" "}
                      {normalizedAddedAt
                        ? `Added ${formatDate(normalizedAddedAt)}`
                        : "Recently added"}
                    </p>
                  </div>
                  <InteractiveButton
                    variant="secondary"
                    className="mt-auto"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigateToShow(show.showId);
                    }}
                  >
                    Open show
                  </InteractiveButton>
                </article>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
