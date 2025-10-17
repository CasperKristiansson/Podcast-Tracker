import { useId, useMemo, useState } from "react";
import type { ClassValue } from "../lib/cn";
import { cn } from "../lib/cn";

export interface StarRatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  className?: ClassValue;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

const focusRingMap: Record<NonNullable<StarRatingProps["size"]>, string> = {
  sm: "focus-visible:ring-[1.5px]",
  md: "focus-visible:ring-2",
  lg: "focus-visible:ring-[2.5px]",
};

export function StarRating({
  value,
  max = 5,
  onChange,
  readOnly = false,
  className,
  size = "md",
  label,
}: StarRatingProps): JSX.Element {
  const stars = useMemo(
    () => Array.from({ length: max }, (_, i) => i + 1),
    [max]
  );
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const gradientPrefix = useId();

  const currentValue = Math.max(0, Math.min(max, hoverValue ?? value));

  return (
    <div
      className={cn("inline-flex flex-col gap-2", className)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label={label}
    >
      <div className="flex items-center gap-1.5">
        {stars.map((star) => {
          const active = star <= currentValue;
          const tabIndex = readOnly ? -1 : star === Math.round(value) ? 0 : -1;
          return (
            <button
              key={star}
              type="button"
              role={readOnly ? undefined : "radio"}
              aria-checked={readOnly ? undefined : star <= value}
              tabIndex={tabIndex}
              disabled={readOnly}
              onClick={() => {
                if (readOnly) return;
                onChange?.(star);
              }}
              onMouseEnter={() => {
                if (readOnly) return;
                setHoverValue(star);
              }}
              onMouseLeave={() => {
                if (readOnly) return;
                setHoverValue(null);
              }}
              onFocus={() => {
                if (readOnly) return;
                setHoverValue(star);
              }}
              onBlur={() => {
                if (readOnly) return;
                setHoverValue(null);
              }}
              className={cn(
                "relative inline-flex items-center justify-center rounded-full transition duration-150",
                focusRingMap[size],
                "focus-visible:outline-none focus-visible:ring-[#c6b5ff]",
                readOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:scale-110 active:scale-95"
              )}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className={cn(sizeMap[size], "transition duration-150")}
              >
                <defs>
                  <linearGradient
                    id={`${gradientPrefix}-${star}`}
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#ffe196" />
                    <stop offset="50%" stopColor="#fbd468" />
                    <stop offset="100%" stopColor="#f2a65a" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                  fill={
                    active
                      ? `url(#${gradientPrefix}-${star})`
                      : "rgba(255,255,255,0.12)"
                  }
                  stroke={
                    active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)"
                  }
                  strokeWidth={active ? 0.4 : 0.6}
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
