import { useEffect, useState } from "react";
import { isDemoMode } from "../../lib/demo/mode";

interface DemoBadgeProps {
  className?: string;
}

export default function DemoBadge({
  className,
}: DemoBadgeProps): JSX.Element | null {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isDemoMode());
  }, []);

  if (!active) {
    return null;
  }

  return (
    <span
      className={
        className ??
        "inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70"
      }
    >
      Demo mode
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#f6ecff]" />
    </span>
  );
}
