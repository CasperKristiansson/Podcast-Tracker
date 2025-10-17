import type { ClassValue } from "../lib/cn";
import { cn } from "../lib/cn";

export interface AuroraBackgroundProps {
  className?: ClassValue;
}

export const AuroraBackground = ({
  className,
}: AuroraBackgroundProps): JSX.Element => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-0 overflow-hidden",
      className
    )}
  >
    <div className="absolute -left-1/4 -top-1/4 h-[38rem] w-[38rem] animate-blob rounded-full bg-gradient-to-br from-[#7357f5]/40 via-[#6a3af8]/30 to-transparent blur-3xl" />
    <div className="absolute bottom-[-30%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 animate-blob rounded-full bg-gradient-to-tr from-[#5b2de1]/35 via-[#301859]/20 to-transparent blur-[180px]" />
    <div className="absolute -right-1/4 top-1/3 h-[32rem] w-[32rem] animate-drift rounded-full bg-gradient-to-bl from-[#8f6bff]/45 via-[#26123f]/15 to-transparent blur-3xl" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
  </div>
);
