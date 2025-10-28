import { AuroraBackground } from "@ui";

export function ProfileSkeleton(): JSX.Element {
  return (
    <div className="relative isolate min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-56 left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-[#efe3ff]/26 blur-[240px]" />
        <div className="absolute -bottom-56 left-[-18%] h-[36rem] w-[36rem] rounded-full bg-[#5830d9]/22 blur-[210px]" />
        <div className="absolute -right-48 top-24 h-[34rem] w-[34rem] rounded-full bg-[#271052]/20 blur-[210px]" />
      </div>
      <AuroraBackground className="min-h-screen opacity-45 saturate-200 mix-blend-screen" />
      <div className="relative z-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-3 pb-12 pt-12 sm:px-5 sm:pb-16 sm:pt-16 md:px-10 md:pb-28 md:pt-22">
          <header className="space-y-6 text-center md:text-left">
            <div className="inline-flex h-8 w-52 animate-pulse items-center justify-center gap-2 self-center rounded-full bg-white/10 md:self-start" />
            <div className="h-12 w-full animate-pulse rounded-full bg-white/10 md:w-2/3" />
            <div className="mx-auto h-5 w-full animate-pulse rounded-full bg-white/8 md:mx-0 md:w-3/4" />
          </header>

          <section className="grid gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`profile-stat-skeleton-${index}`}
                className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04] px-8 py-10 shadow-[0_45px_100px_rgba(26,16,84,0.35)]"
              >
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-transparent to-white/5" />
                <div className="relative space-y-4">
                  <div className="h-3 w-24 rounded-full bg-white/15" />
                  <div className="h-10 w-32 rounded-full bg-white/12" />
                  <div className="h-3 w-20 rounded-full bg-white/10" />
                </div>
              </div>
            ))}
          </section>

          <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[#1b0c3c]/75 p-6 shadow-[0_45px_110px_rgba(24,14,78,0.4)]">
            <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,_rgba(143,109,255,0.15),_transparent_70%)]" />
            <div className="relative space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-3">
                  <div className="h-6 w-64 rounded-full bg-white/15" />
                  <div className="h-4 w-72 rounded-full bg-white/10" />
                </div>
                <div className="h-10 w-36 rounded-full bg-white/15" />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, cardIndex) => (
                  <div
                    key={`spotlight-skeleton-${cardIndex}`}
                    className="flex flex-col gap-5 rounded-3xl border border-white/12 bg-white/[0.04] p-6 shadow-[0_35px_90px_rgba(18,10,56,0.35)]"
                  >
                    <div className="h-6 w-3/4 rounded-full bg-white/12" />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="h-16 rounded-2xl bg-white/8" />
                      <div className="h-16 rounded-2xl bg-white/8" />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <div className="h-4 w-40 rounded-full bg-white/10" />
                        <div className="h-3 w-32 rounded-full bg-white/8" />
                      </div>
                      <div className="h-10 w-40 rounded-full bg-white/12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[#14072f]/80 p-4 shadow-[0_38px_110px_rgba(15,6,48,0.35)]">
            <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,_rgba(128,94,255,0.12),_transparent_75%)]" />
            <div className="relative space-y-6">
              <div className="flex flex-col gap-3 text-center md:flex-row md:items-end md:justify-between md:text-left px-2 pt-2">
                <div className="h-6 w-48 rounded-full bg-white/15" />
                <div className="h-4 w-64 rounded-full bg-white/10" />
              </div>
              <div className="flex flex-col gap-4">
                {Array.from({ length: 3 }).map((_, rowIndex) => (
                  <div
                    key={`library-skeleton-${rowIndex}`}
                    className="flex flex-col gap-6 rounded-[28px] border border-white/12 bg-[#190b36]/80 p-6"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                      <div className="h-28 w-28 rounded-3xl bg-white/8" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 w-2/3 rounded-full bg-white/12" />
                        <div className="h-3 w-1/3 rounded-full bg-white/10" />
                        <div className="h-3 w-1/2 rounded-full bg-white/8" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <div className="h-11 w-full rounded-full bg-white/10 sm:w-48" />
                      <div className="h-10 w-10 rounded-full bg-white/12" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
