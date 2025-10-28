import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { ClassValue } from "../lib/cn";
import { cn } from "../lib/cn";

export type InteractiveButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "primaryBright";

export interface InteractiveButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: InteractiveButtonVariant;
  isLoading?: boolean;
  icon?: ReactNode;
  loadingLabel?: string;
  compact?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  className?: ClassValue;
}

const variantClasses: Record<InteractiveButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-[#8f73ff] via-[#745dd8] to-[#5635c7] text-white shadow-[0_18px_40px_rgba(104,80,200,0.35)] hover:bg-[#7f4bff] focus-visible:ring-[#c6b5ff]",
  primaryBright:
    "bg-gradient-to-br from-[#d4c7ff] via-[#bcaeff] to-[#8f73ff] text-[#12072d] shadow-[0_24px_60px_rgba(122,103,255,0.38)] hover:from-[#ffffff] hover:via-[#eee7ff] hover:to-[#d7caff] hover:text-[#12072d] hover:shadow-[0_32px_90px_rgba(122,103,255,0.55)] focus-visible:ring-[#e9e3ff]",
  secondary:
    "bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/60",
  outline:
    "border border-white/15 bg-transparent text-white hover:border-white/30 focus-visible:ring-white/40",
  ghost:
    "bg-transparent text-white/80 hover:text-white focus-visible:ring-white/40",
};

const sizeClasses: Record<
  NonNullable<InteractiveButtonProps["size"]>,
  string
> = {
  xs: "px-3 py-1",
  sm: "px-4 py-2",
  md: "px-6 py-3",
  lg: "px-7 py-4",
};

export const InteractiveButton = forwardRef<
  HTMLButtonElement,
  InteractiveButtonProps
>(
  (
    {
      variant = "primary",
      isLoading = false,
      loadingLabel = "Working…",
      icon,
      compact = false,
      size = "md",
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      {...props}
      disabled={isLoading || disabled}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-full text-sm font-semibold transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05020f]",
        compact ? "gap-0" : "gap-2",
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        sizeClasses[size],
        variantClasses[variant],
        "before:absolute before:inset-0 before:-translate-y-full before:bg-white/30 before:opacity-0 before:transition duration-300 group-hover:before:translate-y-0 group-hover:before:opacity-100",
        "active:scale-[0.98]",
        className
      )}
    >
      <span
        className={cn(
          "relative inline-flex items-center",
          compact ? "gap-0" : "gap-2"
        )}
      >
        {icon && !isLoading ? (
          <span className="flex h-4 w-4 items-center justify-center">
            {icon}
          </span>
        ) : null}
        <span>
          {isLoading ? (
            <span className="flex h-4 w-4 items-center justify-center">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="sr-only">{loadingLabel}</span>
            </span>
          ) : (
            children
          )}
        </span>
      </span>
    </button>
  )
);

InteractiveButton.displayName = "InteractiveButton";
