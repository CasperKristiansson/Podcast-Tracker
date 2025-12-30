import { useState } from "react";
import { GlowCard, GoogleButton, InteractiveButton } from "@ui";
import { beginLogin } from "../../lib/auth/flow";
import { disableDemoMode, enableDemoMode } from "../../lib/demo/mode";

export default function LoginPage(): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSignIn = async (): Promise<void> => {
    setNotice(null);
    setError(null);
    setIsLoading(true);
    disableDemoMode();

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

  const handleDemo = (): void => {
    setError(null);
    setNotice(null);
    enableDemoMode();
    window.location.assign("/profile");
  };

  return (
    <div className="relative isolate w-full">
      <GlowCard className="bg-[linear-gradient(140deg,rgba(147,115,255,0.3),rgba(26,13,70,0.75))] shadow-[0_45px_120px_rgba(32,14,84,0.55)] ring-white/[0.08]">
        <div className="space-y-8 text-center">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-white/80">
              Welcome back
              <span className="inline-block h-1 w-1 animate-pulse rounded-full bg-[#f5e8ff]" />
            </span>
            <div className="space-y-3">
              <h1 className="bg-gradient-to-r from-[#f7edff] via-[#c4a4ff] to-[#88d4ff] bg-clip-text text-4xl font-semibold text-transparent sm:text-5xl">
                Sign in to Podcast Tracker
              </h1>
              <p className="text-base text-white/75">
                A single tap with Google and your listening universe comes back
                into view.
              </p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm space-y-3">
            <InteractiveButton
              variant="primary"
              size="custom"
              onClick={handleDemo}
              className="w-full py-3.5"
            >
              Try the demo account
            </InteractiveButton>
            <GoogleButton
              onClick={() => {
                void handleSignIn();
              }}
              loading={isLoading}
              aria-label="Continue with Google"
              className="w-full py-3.5"
            />
          </div>

          {error ? (
            <div className="mx-auto w-full max-w-sm rounded-full border border-rose-400/40 bg-gradient-to-r from-[#621838]/85 via-[#3a0c21]/80 to-[#1a0410]/85 px-4 py-2 text-sm text-[#ffd8e5] shadow-[0_18px_45px_rgba(107,20,56,0.45)]">
              {error}
            </div>
          ) : notice ? (
            <div className="mx-auto w-full max-w-sm rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/80 shadow-[0_18px_45px_rgba(49,24,120,0.35)]">
              {notice}
            </div>
          ) : (
            <p className="text-sm text-white/65">
              We only request your Google identity to keep progress in sync.
            </p>
          )}
        </div>
      </GlowCard>
    </div>
  );
}
