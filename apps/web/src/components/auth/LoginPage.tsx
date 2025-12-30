import { useState } from "react";
import {
  AuroraBackground,
  GlowCard,
  GoogleButton,
  InteractiveButton,
} from "@ui";
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
      <AuroraBackground className="opacity-45 saturate-200 mix-blend-screen" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-48 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[#ded1ff]/22 blur-[190px]" />
        <div className="absolute -bottom-40 left-[-18%] h-[28rem] w-[28rem] rounded-full bg-[#6f4cff]/18 blur-[160px]" />
        <div className="absolute -right-36 top-14 h-[24rem] w-[24rem] rounded-full bg-[#5ce5ff]/16 blur-[150px]" />
      </div>

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

          <div className="space-y-3">
            <InteractiveButton variant="outline" size="md" onClick={handleDemo}>
              Try the demo account
            </InteractiveButton>
            <GoogleButton
              onClick={() => {
                void handleSignIn();
              }}
              loading={isLoading}
              aria-label="Continue with Google"
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
