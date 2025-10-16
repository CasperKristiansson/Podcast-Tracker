import { useState } from "react";
import { beginLogin } from "../../lib/auth/flow";
import { isAuthReady } from "../../lib/flags";

const BUTTON_BASE =
  "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export default function LoginPage(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authEnabled = isAuthReady();

  const handleSignIn = async (): Promise<void> => {
    if (!authEnabled) {
      setError("Authentication is currently disabled.");
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      await beginLogin();
    } catch (err) {
      setIsLoading(false);
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected error initiating sign-in.";
      setError(message);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 rounded-xl bg-brand-surface/60 p-8 shadow-lg shadow-brand-primary/20">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-muted">
          Secure Sign-In
        </p>
        <h1 className="text-3xl font-semibold text-brand-text">
          Continue with Google
        </h1>
        <p className="text-sm text-brand-muted">
          Podcast Tracker uses Cognito with PKCE to authenticate. You will be
          redirected to Google to continue.
        </p>
      </header>

      <button
        type="button"
        onClick={() => {
          void handleSignIn();
        }}
        disabled={isLoading || !authEnabled}
        className={`${BUTTON_BASE} ${
          authEnabled
            ? isLoading
              ? "cursor-not-allowed bg-brand-primary/40 text-brand-text/70"
              : "bg-brand-primary text-brand-text hover:bg-brand-primary/90"
            : "cursor-not-allowed bg-brand-surface/60 text-brand-muted"
        } focus-visible:outline-brand-accent`}
      >
        {authEnabled
          ? isLoading
            ? "Redirecting…"
            : "Sign in with Google"
          : "Authentication disabled"}
      </button>

      <p className="text-xs leading-relaxed text-brand-muted/80">
        By continuing you agree to our terms. PKCE ensures the authorization
        code cannot be intercepted in transit.
      </p>

      {error ? (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      {!authEnabled ? (
        <div className="rounded-md border border-brand-primary/40 bg-brand-surface/60 p-3 text-xs text-brand-muted">
          Sign-in is currently disabled. Check back once authentication is
          marked ready.
        </div>
      ) : null}
    </div>
  );
}
