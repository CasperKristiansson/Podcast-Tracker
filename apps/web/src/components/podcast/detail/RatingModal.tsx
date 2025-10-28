import { createPortal } from "react-dom";
import { StarRating, InteractiveButton } from "@ui";

interface RatingDraft {
  stars: number;
  review: string;
}

interface RatingModalProps {
  isOpen: boolean;
  ratingDraft: RatingDraft;
  onStarsChange: (stars: number) => void;
  onReviewChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onClear: () => void;
  canClear: boolean;
  loading: boolean;
  showTitle: string | null;
}

export function RatingModal({
  isOpen,
  ratingDraft,
  onStarsChange,
  onReviewChange,
  onClose,
  onSave,
  onClear,
  canClear,
  loading,
  showTitle,
}: RatingModalProps): JSX.Element | null {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onMouseDown={(event) => {
          event.stopPropagation();
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rating-dialog-title"
        className="relative z-10 w-full max-w-lg rounded-[32px] border border-white/12 bg-[#14072f]/95 p-6 shadow-[0_40px_140px_rgba(10,4,32,0.6)]"
        onMouseDown={(event) => event.stopPropagation()}
        onMouseUp={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2
            id="rating-dialog-title"
            className="text-lg font-semibold text-white"
          >
            Rate this podcast
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/70 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Close rating modal"
          >
            &times;
          </button>
        </div>
        <div className="mt-6 space-y-5">
          <div className="flex flex-col items-center gap-4 text-center text-white/80">
            <StarRating
              value={ratingDraft.stars}
              onChange={onStarsChange}
              size="lg"
              className="justify-center"
            />
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">
              {showTitle ?? "This show"}
            </p>
          </div>
          <textarea
            value={ratingDraft.review}
            onChange={(event) => onReviewChange(event.target.value)}
            rows={4}
            placeholder="Optional note about the show"
            className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#8f73ff]"
          />
          <div className="flex flex-wrap gap-3">
            <InteractiveButton
              onClick={onSave}
              isLoading={loading}
              loadingLabel="Saving…"
            >
              Save rating
            </InteractiveButton>
            {canClear ? (
              <InteractiveButton
                variant="outline"
                onClick={onClear}
                isLoading={loading}
                loadingLabel="Clearing…"
              >
                Clear rating
              </InteractiveButton>
            ) : null}
            <InteractiveButton
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </InteractiveButton>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
