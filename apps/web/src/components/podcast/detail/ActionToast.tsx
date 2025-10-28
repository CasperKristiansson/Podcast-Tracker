export type ActionToastState =
  | { state: "idle"; message: "" }
  | { state: "loading"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

interface ActionToastProps {
  status: ActionToastState;
  offset?: number;
}

export function ActionToast({
  status,
  offset = 0,
}: ActionToastProps): JSX.Element | null {
  if (status.state === "idle") {
    return null;
  }

  const containerClass =
    status.state === "loading"
      ? "border-white/15 bg-[#0f0423]/90 text-white/85"
      : status.state === "success"
        ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
        : "border-red-500/40 bg-red-500/20 text-red-100";

  const icon =
    status.state === "loading" ? (
      <span className="flex h-5 w-5 items-center justify-center">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      </span>
    ) : status.state === "success" ? (
      <span className="flex h-5 w-5 items-center justify-center text-current">
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 8.5l3 3L12.5 5" />
        </svg>
      </span>
    ) : (
      <span className="flex h-5 w-5 items-center justify-center text-current">
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 4l8 8" />
          <path d="M12 4l-8 8" />
        </svg>
      </span>
    );

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={status.state === "loading"}
      className={`fixed right-6 z-50 inline-flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_24px_60px_rgba(9,5,25,0.55)] backdrop-blur ${containerClass}`}
      style={{ bottom: `${24 + offset}px` }}
    >
      {icon}
      <span className="text-sm font-medium tracking-wide">
        {status.message}
      </span>
    </div>
  );
}
