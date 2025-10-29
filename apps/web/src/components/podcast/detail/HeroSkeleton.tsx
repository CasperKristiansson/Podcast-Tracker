import { GlowCard } from "@ui";

export function HeroSectionSkeleton(): JSX.Element {
  return (
    <GlowCard
      variant="default"
      className="relative w-full max-w-none overflow-hidden px-6 py-10 sm:px-10 sm:py-12"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="relative mx-auto w-44 shrink-0 sm:w-56 lg:mx-0 lg:w-64">
          <div
            className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-white/30 via-transparent to-white/10 opacity-60 blur-3xl"
            aria-hidden
          />
          <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-white/10 shadow-[0_45px_120px_rgba(31,16,78,0.4)]">
            <div className="aspect-square w-full animate-pulse bg-white/5" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/20" />
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="h-9 w-72 max-w-full animate-pulse rounded-full bg-white/12" />
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <div className="h-11 w-full animate-pulse rounded-full bg-white/12 sm:w-44" />
                <div className="h-11 w-full animate-pulse rounded-full bg-white/[0.08] sm:w-36" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={`hero-description-line-${idx}`}
                    className={`h-4 rounded-full bg-white/10 ${
                      idx === 0 ? "w-full" : idx === 1 ? "w-11/12" : "w-4/5"
                    } animate-pulse`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={`hero-stat-pill-${idx}`}
                    className="h-7 w-32 animate-pulse rounded-full bg-white/10"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={`hero-language-pill-${idx}`}
                  className="h-7 w-28 animate-pulse rounded-full bg-white/10"
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={`hero-star-placeholder-${idx}`}
                    className="h-8 w-8 animate-pulse rounded-full bg-white/12"
                  />
                ))}
              </div>
              <div className="h-4 w-48 animate-pulse rounded-full bg-white/10" />
            </div>
            <div className="h-20 w-full max-w-xl animate-pulse rounded-2xl border border-white/10 bg-white/8" />
          </div>
        </div>
      </div>
    </GlowCard>
  );
}
