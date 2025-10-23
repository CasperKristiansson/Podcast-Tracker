import { useEffect, useRef, useState } from "react";
import { beginLogin, completeLogin } from "../../lib/auth/flow";
import {
  clearPromptRetryStage,
  getPromptRetryStage,
  setPromptRetryStage,
  type PromptRetryStage,
} from "../../lib/auth/storage";

type Status = "pending" | "success" | "error";

const RETRY_SEQUENCE: PromptRetryStage[] = ["login", "consent"];

const getNextStage = (
  current: PromptRetryStage | null
): PromptRetryStage | null => {
  const index = current ? RETRY_SEQUENCE.indexOf(current) : -1;
  const nextIndex = index + 1;
  return nextIndex < RETRY_SEQUENCE.length ? RETRY_SEQUENCE[nextIndex] : null;
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
            window.location.replace("/app/profile");
          }, 1200);
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
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 font-semibold text-brand-text transition hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
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
