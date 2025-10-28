import type { ReactNode } from "react";
import type { ClassValue } from "../lib/cn";
import { cn } from "../lib/cn";

export interface GlowCardProps {
  children: ReactNode;
  className?: ClassValue;
  variant?: "default" | "untracked" | "completed";
}

const containerBase =
  "relative mx-auto w-full max-w-lg overflow-hidden rounded-3xl px-10 py-12 backdrop-blur-2xl";

const pseudoBase =
  "before:absolute before:inset-x-1/3 before:-top-32 before:h-64 before:rounded-full before:bg-gradient-to-b before:blur-3xl before:content-[''] after:absolute after:-bottom-24 after:left-1/2 after:h-48 after:w-48 after:-translate-x-1/2 after:rounded-full after:blur-3xl after:content-['']";

const variantClasses: Record<NonNullable<GlowCardProps["variant"]>, string> = {
  default:
    "border-white/12 bg-[linear-gradient(140deg,rgba(147,115,255,0.28),rgba(31,14,68,0.78))] shadow-[0_30px_80px_rgba(59,39,114,0.45)] ring-1 ring-white/[0.06] before:from-[#9e83ff]/70 before:via-[#745dd8]/40 before:to-transparent after:bg-[#6a3af8]/25",
  untracked:
    "border-white/12 bg-[linear-gradient(140deg,rgba(132,124,162,0.24),rgba(24,19,48,0.78))] shadow-[0_26px_70px_rgba(48,41,86,0.35)] ring-1 ring-white/[0.04] before:from-[#b1aad4]/55 before:via-[#726d95]/32 before:to-transparent after:bg-[#6d6790]/24",
  completed:
    "border-[#58f0bd]/30 bg-[linear-gradient(140deg,rgba(67,206,161,0.34),rgba(16,30,46,0.82))] shadow-[0_34px_85px_rgba(40,128,98,0.45)] ring-1 ring-[#78ffd8]/18 before:from-[#78f0c9]/55 before:via-[#5e74d2]/28 before:to-transparent after:bg-[#3f9b73]/32",
};

export const GlowCard = ({
  children,
  className,
  variant = "default",
}: GlowCardProps): JSX.Element => (
  <div
    className={cn(
      containerBase,
      pseudoBase,
      variantClasses[variant],
      className
    )}
  >
    <div className="relative z-10">{children}</div>
  </div>
);
