import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface GoogleButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  loading?: boolean;
  label?: string;
}

export const GoogleButton = ({
  loading = false,
  label = "Continue with Google",
  className,
  ...buttonProps
}: GoogleButtonProps): JSX.Element => (
  <button
    {...buttonProps}
    type="button"
    disabled={loading || buttonProps.disabled}
    className={cn(
      "group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-white/[0.97] via-white/[0.9] to-white/[0.82] px-6 py-3.5 text-base font-semibold text-slate-900 shadow-[0_14px_40px_rgba(83,60,160,0.45)] transition duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-[#8f73ff]",
      "disabled:cursor-not-allowed disabled:opacity-70",
      "hover:-translate-y-[1px] hover:shadow-[0_18px_52px_rgba(83,60,160,0.55)]",
      className
    )}
  >
    <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-inner shadow-black/10">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
        <path
          d="M23.04 12.261c0-.815-.073-1.598-.209-2.348H12v4.44h6.193c-.267 1.417-1.08 2.618-2.298 3.422v2.846h3.717c2.178-2.006 3.428-4.966 3.428-8.36Z"
          fill="#4285F4"
        />
        <path
          d="M12 24c3.24 0 5.956-1.075 7.941-2.914l-3.717-2.846c-1.032.693-2.355 1.103-4.224 1.103-3.248 0-6-2.194-6.983-5.152H1.16v3.231C3.132 21.773 7.242 24 12 24Z"
          fill="#34A853"
        />
        <path
          d="M5.017 14.191A7.21 7.21 0 0 1 4.64 12c0-.765.132-1.503.372-2.191V6.578H1.16A11.992 11.992 0 0 0 0 12c0 1.91.455 3.713 1.16 5.422l3.857-3.231Z"
          fill="#FBBC05"
        />
        <path
          d="M12 4.75c1.764 0 3.345.607 4.588 1.801l3.44-3.44C17.95 1.146 15.234 0 12 0 7.242 0 3.132 2.227 1.16 6.578l3.852 3.231C5.999 6.944 8.752 4.75 12 4.75Z"
          fill="#EA4335"
        />
      </svg>
    </div>
    <span className="relative">{loading ? "Connecting…" : label}</span>
    <span className="absolute inset-x-6 bottom-0 h-px translate-y-2 bg-gradient-to-r from-transparent via-[#8f73ff]/40 to-transparent opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100" />
  </button>
);
