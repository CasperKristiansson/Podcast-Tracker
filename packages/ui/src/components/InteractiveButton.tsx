import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { ClassValue } from "../lib/cn";
import { cn } from "../lib/cn";

export type InteractiveButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost";

export interface InteractiveButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: InteractiveButtonVariant;
  isLoading?: boolean;
  icon?: ReactNode;
  loadingLabel?: string;
  className?: ClassValue;
}

const variantClasses: Record<InteractiveButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-[#8f73ff] via-[#745dd8] to-[#5635c7] text-white shadow-[0_18px_40px_rgba(104,80,200,0.35)] hover:from-[#9b81ff] hover:via-[#7f6ae3] hover:to-[#5f3fd4] focus-visible:ring-[#c6b5ff]",
  secondary:
    "bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/60",
  outline:
    "border border-white/15 bg-transparent text-white hover:border-white/30 focus-visible:ring-white/40",
  ghost:
    "bg-transparent text-white/80 hover:text-white focus-visible:ring-white/40",
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
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05020f]",
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        "before:absolute before:inset-0 before:-translate-y-full before:bg-white/30 before:opacity-0 before:transition duration-300 group-hover:before:translate-y-0 group-hover:before:opacity-100",
        "active:scale-[0.98]",
        className
      )}
    >
      <span className="relative inline-flex items-center gap-2">
        {icon ? (
          <span className="flex h-4 w-4 items-center justify-center">
            {icon}
          </span>
        ) : null}
        <span>{isLoading ? loadingLabel : children}</span>
      </span>
    </button>
  )
);

InteractiveButton.displayName = "InteractiveButton";
