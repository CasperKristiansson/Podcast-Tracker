import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  isLoading?: boolean;
  onClear?: () => void;
  allowClear?: boolean;
  leadingIcon?: ReactNode;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      isLoading = false,
      allowClear = false,
      onClear,
      leadingIcon,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const handleClear = onClear ?? (() => undefined);

    const showClear =
      allowClear && typeof value === "string" && value.length > 0 && onClear;

    return (
      <div className="relative">
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={onChange}
          className={cn(
            "w-full rounded-full border border-white/15 bg-white/[0.06] py-3 pl-12 pr-12 text-sm text-white placeholder:text-white/40 outline-none transition focus:border-[#a996ff]/60 focus:ring-2 focus:ring-[#8f73ff]/40",
            className
          )}
          {...props}
        />
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/50">
          {leadingIcon ?? (
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-current"
            >
              <path d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.505 4.505 0 0 1 9.5 14Z" />
            </svg>
          )}
        </span>
        <div className="absolute inset-y-0 right-3 flex items-center gap-2">
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#8f73ff]" />
          ) : null}
          {showClear ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full bg-white/10 p-1 text-white/70 transition hover:bg-white/20"
              aria-label="Clear search"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 fill-current"
              >
                <path d="m13.41 12 4.3-4.29a1 1 0 1 0-1.42-1.42L12 10.59l-4.29-4.3a1 1 0 0 0-1.42 1.42L10.59 12l-4.3 4.29a1 1 0 1 0 1.42 1.42L12 13.41l4.29 4.3a1 1 0 0 0 1.42-1.42Z" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";
