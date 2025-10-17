import type { ReactNode } from "react";
import type { ClassValue } from "../lib/cn";
import { cn } from "../lib/cn";

export interface GlowCardProps {
  children: ReactNode;
  className?: ClassValue;
}

export const GlowCard = ({
  children,
  className,
}: GlowCardProps): JSX.Element => (
  <div
    className={cn(
      "relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-10 py-12 shadow-[0_30px_80px_rgba(59,39,114,0.45)] backdrop-blur-2xl ring-1 ring-white/[0.05]",
      "before:absolute before:inset-x-1/3 before:-top-32 before:h-64 before:rounded-full before:bg-gradient-to-b before:from-[#9e83ff]/70 before:via-[#745dd8]/40 before:to-transparent before:blur-3xl before:content-['']",
      "after:absolute after:-bottom-24 after:left-1/2 after:h-48 after:w-48 after:-translate-x-1/2 after:rounded-full after:bg-[#6a3af8]/25 after:blur-3xl after:content-['']",
      className
    )}
  >
    <div className="relative z-10">
      {children}
    </div>
  </div>
);
