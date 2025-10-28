import { formatNumber } from "../../../lib/format";
import { cn } from "@ui/lib/cn";

interface StatsSectionProps {
  stats: {
    totalShows: number;
    episodesCompleted: number;
    episodesInProgress: number;
  };
}

export function StatsSection({ stats }: StatsSectionProps): JSX.Element {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <StatCard
        label="Active Shows"
        value={stats.totalShows}
        accent="from-[#cdb6ff] via-[#9c75ff] to-[#5d31d1]"
      />
      <StatCard
        label="Episodes Completed"
        value={stats.episodesCompleted}
        accent="from-[#dcbfff] via-[#ab7dff] to-[#6c3ae0]"
      />
      <StatCard
        label="Episodes In Progress"
        value={stats.episodesInProgress}
        accent="from-[#bea6ff] via-[#8a5cff] to-[#4e29aa]"
      />
    </section>
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
        <p className="text-4xl font-semibold text-white">
          {formatNumber(value)}
        </p>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-white/60" />
          Updated live
        </div>
      </div>
    </div>
  );
}
