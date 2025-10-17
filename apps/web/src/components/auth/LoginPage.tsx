import { useState } from "react";
import { AuroraBackground, GlowCard, GoogleButton } from "@ui";
import { beginLogin } from "../../lib/auth/flow";

export default function LoginPage(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (): Promise<void> => {
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
    <div className="relative isolate w-full">
      <AuroraBackground />

      <GlowCard>
        <div className="space-y-8 text-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1 text-xs font-medium uppercase tracking-[0.35em] text-white/70">
              Welcome
              <span className="inline-block h-1 w-1 rounded-full bg-[#8f73ff]" />
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold text-white/95">
                Sign in to Podcast Tracker
              </h1>
              <p className="text-base text-white/70">
                One tap with Google and you&apos;re back to your queue.
              </p>
            </div>
          </div>

          <GoogleButton
            onClick={() => {
              void handleSignIn();
            }}
            loading={isLoading}
            aria-label="Continue with Google"
          />

          {error ? (
            <div className="mx-auto w-full max-w-sm rounded-full border border-red-400/30 bg-red-500/15 px-4 py-2 text-sm text-red-100 shadow-[0_10px_30px_rgba(185,57,82,0.25)]">
              {error}
            </div>
          ) : (
            <p className="text-sm text-white/55">
              We use Google for sign-in. That&apos;s it.
            </p>
          )}
        </div>
      </GlowCard>
    </div>
  );
}
