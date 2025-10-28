import type { ClassValue } from "../lib/cn";
import { cn } from "../lib/cn";

export interface AuroraBackgroundProps {
  className?: ClassValue;
  variant?: "default" | "completed";
}

const baseLayers: Record<
  NonNullable<AuroraBackgroundProps["variant"]>,
  string[]
> = {
  default: [
    "absolute -left-1/4 -top-1/4 h-[38rem] w-[38rem] animate-blob rounded-full bg-gradient-to-br from-[#7357f5]/40 via-[#6a3af8]/30 to-transparent blur-3xl",
    "absolute bottom-[-30%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 animate-blob rounded-full bg-gradient-to-tr from-[#5b2de1]/35 via-[#301859]/20 to-transparent blur-[180px]",
    "absolute -right-1/4 top-1/3 h-[32rem] w-[32rem] animate-drift rounded-full bg-gradient-to-bl from-[#8f6bff]/45 via-[#26123f]/15 to-transparent blur-3xl",
  ],
  completed: [
    "absolute -left-1/4 -top-1/4 h-[38rem] w-[38rem] animate-blob rounded-full bg-gradient-to-br from-[#6bf5c3]/45 via-[#6c7ff5]/28 to-transparent blur-3xl",
    "absolute bottom-[-30%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 animate-blob rounded-full bg-gradient-to-tr from-[#3fd9a4]/40 via-[#3d5db8]/22 to-transparent blur-[180px]",
    "absolute -right-1/4 top-1/3 h-[32rem] w-[32rem] animate-drift rounded-full bg-gradient-to-bl from-[#75facd]/40 via-[#3c2c7a]/18 to-transparent blur-3xl",
  ],
};

const overlayLayers: Record<
  NonNullable<AuroraBackgroundProps["variant"]>,
  string
> = {
  default:
    "absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)]",
  completed:
    "absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(142,255,213,0.14),_transparent_65%)]",
};

export const AuroraBackground = ({
  className,
  variant = "default",
}: AuroraBackgroundProps): JSX.Element => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-0 overflow-hidden",
      className
    )}
  >
    {baseLayers[variant].map((layerClass, index) => (
      <div key={`aurora-layer-${variant}-${index}`} className={layerClass} />
    ))}
    <div className={overlayLayers[variant]} />
  </div>
);
