import { useEffect, useRef, useState } from "react";
import { AuroraBackground, InteractiveButton } from "@ui";
import {
  beginLogin,
  completeLogin,
  PENDING_APPROVAL_MESSAGE,
} from "../../lib/auth/flow";
import { enableDemoMode } from "../../lib/demo/mode";
import {
  clearPromptRetryStage,
  getPromptRetryStage,
  setPromptRetryStage,
  type PromptRetryStage,
} from "../../lib/auth/storage";

type Status = "pending" | "success" | "error" | "pending-approval";

const RETRY_SEQUENCE: PromptRetryStage[] = ["login", "consent"];

const getNextStage = (
  current: PromptRetryStage | null
): PromptRetryStage | null => {
  const index = current ? RETRY_SEQUENCE.indexOf(current) : -1;
  const nextIndex = index + 1;
  if (nextIndex < 0 || nextIndex >= RETRY_SEQUENCE.length) {
    return null;
  }
  const stage = RETRY_SEQUENCE[nextIndex];
  return stage ?? null;
};

const getAutoRetryMessage = (stage: PromptRetryStage): string => {
  return stage === "consent"
    ? "Refreshing Google permissions…"
    : "Reconnecting your Google account…";
};

const getManualRetryMessage = (stage: PromptRetryStage): string => {
  return stage === "consent"
    ? "Refreshing Google permissions…"
    : "Redirecting to Google sign-in…";
};

export default function AuthCallback(): JSX.Element {
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState<string>("Completing sign-in…");
  const promptRetryInitialized = useRef(false);
  const promptRetryStageRef = useRef<PromptRetryStage | null>(null);

  const updateRetryStage = (stage: PromptRetryStage | null) => {
    promptRetryStageRef.current = stage;
    try {
      if (stage) {
        setPromptRetryStage(stage);
      } else {
        clearPromptRetryStage();
      }
    } catch {
      if (stage) {
        promptRetryStageRef.current = null;
      }
    }
  };

  if (!promptRetryInitialized.current) {
    try {
      promptRetryStageRef.current = getPromptRetryStage();
    } catch {
      promptRetryStageRef.current = null;
    }
    promptRetryInitialized.current = true;
  }

  useEffect(() => {
    let cancelled = false;

    completeLogin()
      .then((result) => {
        if (cancelled) {
          return;
        }

        if (result.status === "success") {
          updateRetryStage(null);
          setStatus("success");
          setMessage("Signed in successfully. Redirecting…");
          window.setTimeout(() => {
            window.location.replace("/profile");
          }, 1200);
          return;
        }

        if (result.status === "pending-approval") {
          updateRetryStage(null);
          setStatus("pending-approval");
          setMessage(result.message || PENDING_APPROVAL_MESSAGE);
          return;
        }

        const immutableEmailError = result.message.includes(
          "Attribute cannot be updated"
        );

        if (immutableEmailError) {
          const nextStage = getNextStage(promptRetryStageRef.current);
          if (nextStage) {
            updateRetryStage(nextStage);
            setStatus("pending");
            setMessage(getAutoRetryMessage(nextStage));
            beginLogin({ prompt: nextStage }).catch((err) => {
              if (cancelled) {
                return;
              }
              updateRetryStage(null);
              setStatus("error");
              const fallbackMessage =
                err instanceof Error
                  ? err.message
                  : "Unable to restart Google sign-in.";
              setMessage(fallbackMessage);
            });
            return;
          }
          updateRetryStage(null);
          setStatus("error");
          setMessage(
            `${result.message} Please clear your browser cookies or contact support if the issue keeps happening.`
          );
          return;
        }

        updateRetryStage(null);
        setStatus("error");
        setMessage(result.message);
      })
      .catch((error) => {
        if (!cancelled) {
          updateRetryStage(null);
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

  const isPendingApproval = status === "pending-approval";
  const badgeText = isPendingApproval
    ? "Approval needed"
    : status === "error"
      ? "Re-auth required"
      : status === "success"
        ? "Signed in"
        : "Authenticating";
  const headingText = isPendingApproval
    ? "Awaiting approval"
    : status === "success"
      ? "All set!"
      : status === "error"
        ? "We hit a snag"
        : "Authenticating…";
  const badgeClasses = isPendingApproval
    ? "border-[#ffd8a8]/50 bg-[#4a2a0b]/60 text-[#ffe7c6]"
    : status === "error"
      ? "border-[#ffb6d1]/50 bg-[#57162d]/60 text-[#ffdbe8]"
      : status === "success"
        ? "border-[#74ffe7]/45 bg-[#0c3e4f]/60 text-[#cafff7]"
        : "border-[#d2c2ff]/55 bg-[#281764]/60 text-[#f4ebff]";
  const messageClasses = isPendingApproval
    ? "text-[#ffe6c7]"
    : status === "error"
      ? "text-[#ffd7e5]"
      : status === "success"
        ? "text-[#d4fff7]"
        : "text-white/75";
  const hintText = isPendingApproval
    ? "You can keep using demo mode while you wait for approval."
    : status === "success"
      ? "Redirecting you to your profile."
      : status === "pending"
        ? "Hang tight while we verify your Google session."
        : "";

  return (
    <div className="relative isolate mx-auto w-full max-w-xl overflow-hidden rounded-[36px] border border-white/12 bg-[radial-gradient(circle_at_top,_rgba(120,86,255,0.3),_rgba(19,11,66,0.84)_60%,_rgba(6,3,23,0.92))] px-8 py-12 text-center shadow-[0_50px_130px_rgba(18,7,60,0.55)] backdrop-blur-2xl sm:px-12">
      {status === "pending" ? (
        <style>
          {`@keyframes callback-glide { 0% { transform: translateX(-100%); } 100% { transform: translateX(140%); } }`}
        </style>
      ) : null}
      <AuroraBackground className="opacity-35 saturate-200 mix-blend-screen" />
      <div className="pointer-events-none absolute -top-44 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#efe3ff]/20 blur-[180px]" />
      <div className="pointer-events-none absolute -bottom-40 left-[-15%] h-[26rem] w-[26rem] rounded-full bg-[#6a4dff]/18 blur-[160px]" />
      <div className="pointer-events-none absolute -right-32 top-16 h-[24rem] w-[24rem] rounded-full bg-[#58e8ff]/14 blur-[150px]" />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <span
          className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.45em] ${badgeClasses}`}
        >
          {badgeText}
        </span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          {headingText}
        </h1>
        <p className={`text-sm leading-relaxed ${messageClasses}`}>{message}</p>
        {hintText ? <p className="text-xs text-white/55">{hintText}</p> : null}
        {status === "pending" ? (
          <div className="relative h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
            <span
              className="absolute inset-y-0 -left-1/2 w-1/2 rounded-full bg-gradient-to-r from-[#cbb4ff] via-[#8a6dff] to-transparent"
              style={{ animation: "callback-glide 1.6s ease-in-out infinite" }}
            />
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex w-full max-w-xs flex-col items-center gap-3 text-sm text-white/70">
            <InteractiveButton
              className="w-full justify-center"
              onClick={() => {
                setStatus("pending");
                const nextStage = getNextStage(promptRetryStageRef.current);
                const targetStage =
                  nextStage ?? promptRetryStageRef.current ?? "login";
                setMessage(getManualRetryMessage(targetStage));
                updateRetryStage(targetStage);
                beginLogin({ prompt: targetStage }).catch((err) => {
                  setStatus("error");
                  updateRetryStage(null);
                  const description =
                    err instanceof Error
                      ? err.message
                      : "Unable to restart Google sign-in.";
                  setMessage(description);
                });
              }}
            >
              Try again
            </InteractiveButton>
            <span className="text-xs text-white/55">
              If the issue persists, clear your cookies and restart the sign-in
              flow.
            </span>
          </div>
        ) : null}

        {status === "pending-approval" ? (
          <div className="flex w-full max-w-xs flex-col items-center gap-3 text-sm text-white/70">
            <InteractiveButton
              className="w-full justify-center"
              onClick={() => {
                window.location.assign("/login");
              }}
            >
              Return to login
            </InteractiveButton>
            <InteractiveButton
              variant="outline"
              className="w-full justify-center"
              onClick={() => {
                enableDemoMode();
                window.location.assign("/profile");
              }}
            >
              Try demo mode
            </InteractiveButton>
            <span className="text-xs text-white/55">
              We will notify you once access is approved.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
