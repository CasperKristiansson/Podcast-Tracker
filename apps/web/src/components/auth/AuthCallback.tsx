import { useEffect, useState } from "react";
import { completeLogin } from "../../lib/auth/flow";

type Status = "pending" | "success" | "error";

export default function AuthCallback(): JSX.Element {
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState<string>("Completing sign-in…");

  useEffect(() => {
    let cancelled = false;

    completeLogin()
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.status === "success") {
          setStatus("success");
          setMessage("Signed in successfully. Redirecting…");
          window.setTimeout(() => {
            window.location.replace("/");
          }, 1200);
        } else {
          setStatus("error");
          setMessage(result.message);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus("error");
          const description =
            error instanceof Error
              ? error.message
              : "Unexpected error completing sign-in.";
          setMessage(description);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-xl bg-brand-surface/60 p-8 text-center shadow-lg shadow-brand-primary/20">
      <h1 className="text-2xl font-semibold text-brand-text">
        Authenticating…
      </h1>
      <p
        className={`text-sm ${
          status === "error"
            ? "text-red-200"
            : status === "success"
              ? "text-brand-text"
              : "text-brand-muted"
        }`}
      >
        {message}
      </p>

      {status === "error" ? (
        <div className="flex flex-col gap-2 text-sm text-brand-muted">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 font-semibold text-brand-text transition hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            onClick={() => window.location.replace("/login")}
          >
            Try again
          </button>
          <span>
            If the issue persists, clear your cookies and restart the sign-in
            flow.
          </span>
        </div>
      ) : null}
    </div>
  );
}
