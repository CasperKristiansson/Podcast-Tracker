import { useEffect, useMemo, useRef, useState } from "react";
import type { ShowDetailQuery } from "@shared";
import { GlowCard, InteractiveButton, StarRating } from "@ui";
import { formatNumber, formatRelative } from "../../../lib/format";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

interface HeroSectionProps {
  show: ShowDetailQuery["showDetail"]["show"];
  subscription: ShowDetailQuery["showDetail"]["subscription"] | null;
  isSubscribed: boolean;
  isMutatingSubscription: boolean;
  onSubscribeToggle: () => void;
  onOpenRatingModal: () => void;
  onMarkAllEpisodes: () => void;
  markAllLoading: boolean;
  canRateShow: boolean;
  ratingDisplayValue: number;
  subscriptionAddedAt: string | null;
  ratingUpdatedAt: string | null;
  watchedCount: number;
}

export function HeroSection({
  show,
  subscription,
  isSubscribed,
  isMutatingSubscription,
  onSubscribeToggle,
  onOpenRatingModal,
  onMarkAllEpisodes,
  markAllLoading,
  canRateShow,
  ratingDisplayValue,
  subscriptionAddedAt,
  ratingUpdatedAt,
  watchedCount,
}: HeroSectionProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const showLanguages = useMemo(
    () => show.languages?.filter(isNonEmptyString) ?? [],
    [show.languages]
  );

  const menuActions = [
    canRateShow
      ? {
          label: ratingDisplayValue > 0 ? "Edit rating" : "Add rating",
          onSelect: onOpenRatingModal,
          destructive: false,
          disabled: false,
          icon: "★",
        }
      : {
          label: "Add to my shows to rate",
          onSelect: () => undefined,
          destructive: false,
          disabled: true,
          icon: "★",
        },
    show.externalUrl
      ? {
          label: "Listen on Spotify",
          onSelect: () => {
            setMenuOpen(false);
            window.open(show.externalUrl ?? "#", "_blank", "noreferrer");
          },
          destructive: false,
          disabled: false,
          icon: "↗",
        }
      : null,
    isSubscribed
      ? {
          label: markAllLoading
            ? "Marking episodes…"
            : "Mark all episodes as watched",
          onSelect: onMarkAllEpisodes,
          destructive: false,
          disabled: markAllLoading,
          icon: markAllLoading ? "…" : "✓",
        }
      : null,
  ].filter(Boolean) as Array<{
    label: string;
    onSelect: () => void;
    destructive: boolean;
    disabled: boolean;
    icon: string;
  }>;

  return (
    <GlowCard className="relative overflow-hidden w-full max-w-none px-6 py-10 sm:px-10 sm:py-12 bg-[radial-gradient(circle_at_top,_rgba(138,94,255,0.23),_transparent_70%)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden />
      {show.image ? (
        <div
          className="pointer-events-none absolute -right-36 -top-40 hidden h-[22rem] w-[22rem] rotate-12 transform-gpu rounded-full bg-cover bg-center opacity-35 blur-[120px] sm:block"
          style={{
            backgroundImage: `url(${show.image})`,
          }}
          aria-hidden
        />
      ) : null}
      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="relative mx-auto w-44 shrink-0 sm:w-56 lg:mx-0 lg:w-64">
          <div
            className="pointer-events-none absolute -inset-6 rounded-[36px] bg-gradient-to-br from-white/40 via-transparent to-white/10 opacity-80 blur-3xl"
            aria-hidden
          />
          {show.image ? (
            <div
              className="pointer-events-none absolute -top-10 -right-16 hidden h-32 w-32 rotate-12 overflow-hidden rounded-[28px] border border-white/10 opacity-50 sm:block"
              aria-hidden
            >
              <img
                src={show.image}
                alt=""
                className="h-full w-full object-cover opacity-75"
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[#12072d]/80 shadow-[0_45px_120px_rgba(31,16,78,0.55)]">
            {show.image ? (
              <img
                src={show.image}
                alt={show.title ?? "Podcast artwork"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-white/5 text-sm text-white/40">
                No artwork
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-black/30" />
          </div>
        </div>

        <div className="flex-1 space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <span className="inline-flex items-center gap-2 self-start lg:self-center rounded-full border border-white/15 bg-white/10 px-4 py-1 text-[11px] uppercase tracking-[0.4em] text-white/65">
                {show.publisher}
                <span className="hidden h-1 w-1 rounded-full bg-white/50 sm:inline" />
                <span className="text-white/45">
                  {show.mediaType ?? "Podcast"}
                </span>
              </span>

              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                {!isSubscribed ? (
                  <InteractiveButton
                    onClick={onSubscribeToggle}
                    variant="primary"
                    isLoading={isMutatingSubscription}
                    loadingLabel="Adding…"
                    className="w-full rounded-full sm:w-auto transition-colors duration-200 hover:bg-[#7f4bff]/20 hover:text-white"
                  >
                    Add to my shows
                  </InteractiveButton>
                ) : null}
                <div className="relative w-full sm:w-auto">
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="inline-flex w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white whitespace-nowrap transition hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
                  >
                    <span>More actions</span>
                    <svg
                      aria-hidden
                      viewBox="0 0 12 12"
                      className={`h-3 w-3 text-white/70 transition-transform duration-200 ${
                        menuOpen ? "rotate-180" : "rotate-0"
                      }`}
                      focusable="false"
                    >
                      <path
                        d="M2 4.25L6 8l4-3.75"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {menuOpen ? (
                    <div
                      ref={menuRef}
                      role="menu"
                      aria-label="Additional actions"
                      className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-white/12 bg-[#14072f]/95 p-2 text-sm text-white shadow-[0_26px_90px_rgba(10,4,32,0.6)] backdrop-blur"
                    >
                      {menuActions.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuOpen(false);
                            window.setTimeout(() => {
                              item.onSelect();
                            }, 0);
                          }}
                          disabled={item.disabled}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff] ${
                            item.disabled
                              ? "cursor-not-allowed text-white/45"
                              : item.destructive
                              ? "text-red-200 hover:bg-red-500/20"
                              : "hover:bg-white/10"
                          }`}
                        >
                          <span>{item.label}</span>
                          <span aria-hidden>{item.icon}</span>
                        </button>
                      ))}
                      {isSubscribed ? (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuOpen(false);
                            window.setTimeout(() => {
                              onSubscribeToggle();
                            }, 0);
                          }}
                          className="mt-1 flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-red-200 transition hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                        >
                          <span>Remove show</span>
                          <span aria-hidden>✕</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-white/65">
              <p>{show.description}</p>
              <div className="flex flex-wrap gap-3 text-xs text-white/50">
                {subscriptionAddedAt ? (
                  <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 uppercase tracking-[0.3em]">
                    Added {formatRelative(subscriptionAddedAt)}
                  </span>
                ) : null}
                <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 uppercase tracking-[0.3em]">
                  {formatNumber(show.totalEpisodes ?? 0)} episodes
                </span>
                <span className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 uppercase tracking-[0.3em]">
                  {formatNumber(watchedCount)} watched
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-white/60">
              {showLanguages.map((language) => (
                <span
                  key={language}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1 uppercase tracking-[0.3em]"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <StarRating
                value={ratingDisplayValue}
                readOnly
                size="lg"
                className="justify-start"
              />
              {ratingUpdatedAt && ratingDisplayValue > 0 ? (
                <span className="text-xs uppercase tracking-[0.35em] text-white/50">
                  Updated {formatRelative(ratingUpdatedAt)}
                </span>
              ) : null}
            </div>
            {subscription?.ratingReview ? (
              <p className="rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm text-white/80">
                “{subscription.ratingReview}”
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </GlowCard>
  );
}
