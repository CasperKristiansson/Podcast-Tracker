import { createPortal } from "react-dom";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import {
  SearchShowsDocument,
  type SearchShowsQuery,
  type SearchShowsQueryVariables,
  SubscribeToShowDocument,
  type SubscribeToShowMutation,
  type SubscribeToShowMutationVariables,
  UnsubscribeFromShowDocument,
  type UnsubscribeFromShowMutation,
  type UnsubscribeFromShowMutationVariables,
  MyProfileDocument,
  type MyProfileQuery,
} from "@shared";
import { InteractiveButton, SearchInput } from "@ui";

export interface PodcastSearchBarProps {
  limit?: number;
  className?: string;
}

const DEBOUNCE_MS = 300;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const normalizeDateInput = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
};

const pickDescription = (
  show: SearchShowsQuery["search"][number]
): {
  value: string;
  isHtml: boolean;
} => {
  if (isNonEmptyString(show.htmlDescription)) {
    return { value: show.htmlDescription, isHtml: true };
  }

  if (isNonEmptyString(show.description)) {
    return { value: show.description, isHtml: false };
  }

  return { value: "", isHtml: false };
};

export default function PodcastSearchBar({
  limit = 10,
  className,
}: PodcastSearchBarProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const statusRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const toastId = useId();

  const [runSearch, { data, loading, error }] = useLazyQuery<
    SearchShowsQuery,
    SearchShowsQueryVariables
  >(SearchShowsDocument, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const [subscribeToShow] = useMutation<
    SubscribeToShowMutation,
    SubscribeToShowMutationVariables
  >(SubscribeToShowDocument);

  const [unsubscribeFromShow] = useMutation<
    UnsubscribeFromShowMutation,
    UnsubscribeFromShowMutationVariables
  >(UnsubscribeFromShowDocument);

  const shows = useMemo(() => data?.search ?? [], [data]);
  const showSkeleton = loading && shows.length === 0;

  const [pendingState, setPendingState] = useState<{
    showId: string;
    action: "add" | "remove";
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (debouncedQuery.length < 2) {
      return;
    }

    if (!debouncedQuery) {
      return;
    }

    runSearch({
      variables: { term: debouncedQuery, limit },
    }).catch(() => undefined);
  }, [debouncedQuery, limit, runSearch, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        closePalette();
      }
    };

    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePalette();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setActiveIndex(0);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (activeIndex >= shows.length) {
      setActiveIndex(shows.length > 0 ? shows.length - 1 : 0);
    }
  }, [activeIndex, shows.length, isOpen]);

  const openPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent) => {
      const isMac = navigator.platform.includes("Mac");
      const metaPressed = isMac ? event.metaKey : event.ctrlKey;
      if (metaPressed && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, [openPalette]);

  useEffect(() => {
    const handleExternalOpen = () => {
      openPalette();
    };
    window.addEventListener(
      "open-podcast-search",
      handleExternalOpen as EventListener
    );
    return () =>
      window.removeEventListener(
        "open-podcast-search",
        handleExternalOpen as EventListener
      );
  }, [openPalette]);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
    triggerRef.current?.focus();
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        shows.length === 0 ? prev : Math.min(prev + 1, shows.length - 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        shows.length === 0 ? prev : Math.max(prev - 1, 0)
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      if (shows.length > 0) {
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      if (shows.length > 0) {
        setActiveIndex(shows.length - 1);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const show = shows[activeIndex];
      if (show) {
        navigateToShow(show.id);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    }
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  const navigateToShow = (showId: string) => {
    closePalette();
    if (typeof window !== "undefined") {
      const encoded = encodeURIComponent(showId);
      window.location.href = `/show?id=${encoded}`;
    }
  };

  const handleSubscribe = async (
    show: SearchShowsQuery["search"][number]
  ): Promise<void> => {
    try {
      setPendingState({ showId: show.id, action: "add" });
      await subscribeToShow({
        variables: {
          showId: show.id,
          title: show.title ?? "",
          publisher: show.publisher ?? "",
          image: show.image ?? "",
          totalEpisodes:
            typeof show.totalEpisodes === "number" ? show.totalEpisodes : 0,
        },
        update: (cache, { data: subscribeData }) => {
          const newSubscription = subscribeData?.subscribe;
          if (!newSubscription) {
            return;
          }

          cache.updateQuery<MyProfileQuery>(
            {
              query: MyProfileDocument,
              variables: {},
            },
            (existingProfile) => {
              const profile = existingProfile?.myProfile;
              if (!profile) {
                return existingProfile;
              }

              const showsList = profile.shows ?? [];
              if (
                showsList.some(
                  (profileShow) =>
                    profileShow?.showId === newSubscription.showId
                )
              ) {
                return existingProfile;
              }

              const addedAt =
                normalizeDateInput(newSubscription.addedAt) ??
                new Date().toISOString();
              const profileShow = {
                __typename: "ProfileShow" as const,
                showId: newSubscription.showId,
                title: newSubscription.title,
                publisher: newSubscription.publisher,
                image: newSubscription.image ?? "",
                addedAt,
                totalEpisodes: newSubscription.totalEpisodes ?? 0,
                completedEpisodes: 0,
                inProgressEpisodes: 0,
                unlistenedEpisodes: newSubscription.totalEpisodes ?? 0,
                subscriptionSyncedAt: null,
              } satisfies MyProfileQuery["myProfile"]["shows"][number];

              const currentStats =
                profile.stats ??
                ({
                  __typename: "ProfileStats" as const,
                  totalShows: 0,
                  episodesCompleted: 0,
                  episodesInProgress: 0,
                } satisfies MyProfileQuery["myProfile"]["stats"]);

              const updatedStats = {
                __typename: currentStats.__typename ?? "ProfileStats",
                totalShows: (currentStats.totalShows ?? 0) + 1,
                episodesCompleted: currentStats.episodesCompleted ?? 0,
                episodesInProgress: currentStats.episodesInProgress ?? 0,
              } satisfies MyProfileQuery["myProfile"]["stats"];

              return {
                __typename: existingProfile?.__typename ?? "Query",
                myProfile: {
                  __typename: profile.__typename ?? "UserProfile",
                  stats: updatedStats,
                  spotlight: profile.spotlight ?? [],
                  shows: [profileShow, ...showsList],
                },
              } satisfies MyProfileQuery;
            }
          );

          const cacheId = cache.identify({
            __typename: "Show",
            id: show.id,
          });
          if (cacheId) {
            cache.modify({
              id: cacheId,
              fields: {
                isSubscribed: () => true,
              },
            });
          }
        },
      });
      setToast(`Added "${show.title ?? "podcast"}" to your library.`);
      window.setTimeout(() => setToast(null), 2200);
    } catch (subscribeError) {
      console.error("Failed to subscribe", subscribeError);
      setToast("We couldn’t add that show. Try again in a moment.");
      window.setTimeout(() => setToast(null), 2500);
    } finally {
      setPendingState(null);
    }
  };

  const handleUnsubscribe = async (
    show: SearchShowsQuery["search"][number]
  ): Promise<void> => {
    try {
      setPendingState({ showId: show.id, action: "remove" });
      await unsubscribeFromShow({
        variables: {
          showId: show.id,
        },
        update: (cache) => {
          cache.updateQuery<MyProfileQuery>(
            {
              query: MyProfileDocument,
              variables: {},
            },
            (existingProfile) => {
              const profile = existingProfile?.myProfile;
              if (!profile) {
                return existingProfile;
              }

              const showsList = profile.shows ?? [];
              const spotlightList = profile.spotlight ?? [];
              const showExists = showsList.some(
                (profileShow) => profileShow?.showId === show.id
              );

              if (!showExists) {
                return existingProfile;
              }

              const currentStats =
                profile.stats ??
                ({
                  __typename: "ProfileStats" as const,
                  totalShows: 0,
                  episodesCompleted: 0,
                  episodesInProgress: 0,
                } satisfies MyProfileQuery["myProfile"]["stats"]);

              const updatedStats = {
                __typename: currentStats.__typename ?? "ProfileStats",
                totalShows: Math.max(0, (currentStats.totalShows ?? 0) - 1),
                episodesCompleted: currentStats.episodesCompleted ?? 0,
                episodesInProgress: currentStats.episodesInProgress ?? 0,
              } satisfies MyProfileQuery["myProfile"]["stats"];

              return {
                __typename: existingProfile?.__typename ?? "Query",
                myProfile: {
                  __typename: profile.__typename ?? "UserProfile",
                  stats: updatedStats,
                  spotlight: spotlightList.filter(
                    (profileShow) => profileShow?.showId !== show.id
                  ),
                  shows: showsList.filter(
                    (profileShow) => profileShow?.showId !== show.id
                  ),
                },
              } satisfies MyProfileQuery;
            }
          );

          const cacheId = cache.identify({
            __typename: "Show",
            id: show.id,
          });
          if (cacheId) {
            cache.modify({
              id: cacheId,
              fields: {
                isSubscribed: () => false,
              },
            });
          }
        },
      });
      setToast(`Removed "${show.title ?? "podcast"}" from your library.`);
      window.setTimeout(() => setToast(null), 2200);
    } catch (unsubscribeError) {
      console.error("Failed to unsubscribe", unsubscribeError);
      setToast("We couldn’t remove that show. Try again in a moment.");
      window.setTimeout(() => setToast(null), 2500);
    } finally {
      setPendingState(null);
    }
  };

  const hasQuery = debouncedQuery.length >= 2;
  const shouldShowResults = isOpen && hasQuery;

  useEffect(() => {
    if (!statusRef.current) {
      return;
    }
    if (loading) {
      statusRef.current.textContent = "Searching podcasts…";
      return;
    }
    if (error) {
      statusRef.current.textContent = "Search failed.";
      return;
    }
    if (!hasQuery) {
      statusRef.current.textContent = "Type at least two characters to search.";
      return;
    }
    statusRef.current.textContent = shows.length
      ? "Search results ready."
      : "No podcasts matched your search.";
  }, [loading, error, hasQuery, shows.length]);

  const trapFocus = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) {
      return;
    }
    const current = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (current === first || !current) {
        event.preventDefault();
        last.focus();
      }
    } else if (current === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  const overlay =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[70]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="podcast-search-title"
            onKeyDown={trapFocus}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => closePalette()}
            />
            <div
              className="relative flex w-full justify-center px-4"
              style={{
                paddingTop: `calc(env(safe-area-inset-top, 0px) + 3.5rem)`,
              }}
            >
              <div
                ref={dialogRef}
                className="w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/20 bg-gradient-to-br from-[#1c0f3e]/95 via-[#150930]/95 to-[#0c041d]/95 shadow-[0_60px_180px_rgba(18,7,60,0.65)] backdrop-blur-3xl"
              >
                <div className="flex items-center justify-between gap-4 px-6 pt-6">
                  <h2
                    id="podcast-search-title"
                    className="text-sm font-semibold uppercase tracking-[0.45em] text-white/70"
                  >
                    Search podcasts
                  </h2>
                  <button
                    type="button"
                    onClick={closePalette}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]"
                    aria-label="Close podcast search"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                    >
                      <path
                        fill="currentColor"
                        d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 0 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4Z"
                      />
                    </svg>
                  </button>
                </div>

                <form
                  role="search"
                  className="flex flex-col gap-4 px-6 pb-6 pt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const show = shows[activeIndex];
                    if (show) {
                      navigateToShow(show.id);
                    }
                  }}
                >
                  <SearchInput
                    ref={inputRef}
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onFocus={() => setIsOpen(true)}
                    onClear={handleClear}
                    allowClear
                    isLoading={loading}
                    placeholder="Search podcasts by title, publisher, or topic…"
                    autoComplete="off"
                    spellCheck="false"
                    aria-autocomplete="list"
                    aria-controls={listboxId}
                    aria-expanded={shouldShowResults}
                    aria-activedescendant={
                      shows[activeIndex]
                        ? `${listboxId}-option-${activeIndex}`
                        : undefined
                    }
                    aria-label="Search podcasts"
                    className="w-full max-w-none"
                  />

                  <div
                    ref={statusRef}
                    role="status"
                    aria-live="polite"
                    className="text-xs text-white/55"
                  />

                  {hasQuery && (loading || error || shows.length > 0) ? (
                    <div className="rounded-2xl border border-white/12 bg-[#1d0d3b]/85 p-2 shadow-[0_30px_90px_rgba(12,4,40,0.45)]">
                      {error ? (
                        <ErrorState error={error} />
                      ) : showSkeleton ? (
                        <SearchResultsSkeleton />
                      ) : shows.length === 0 ? (
                        <EmptyState />
                      ) : (
                        <ResultList
                          ref={listRef}
                          id={listboxId}
                          shows={shows}
                          activeIndex={activeIndex}
                          onSelect={navigateToShow}
                          onHover={setActiveIndex}
                          onSubscribe={handleSubscribe}
                          onUnsubscribe={handleUnsubscribe}
                          pendingState={pendingState}
                        />
                      )}
                    </div>
                  ) : !hasQuery ? (
                    <EmptyPrompt />
                  ) : null}
                </form>
              </div>
            </div>
            {toast ? (
              <div
                id={toastId}
                role="status"
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 bottom-10 flex justify-center px-4"
              >
                <div className="rounded-full border border-white/15 bg-white/15 px-4 py-2 text-xs text-white shadow-[0_20px_50px_rgba(12,4,40,0.55)] backdrop-blur">
                  {toast}
                </div>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPalette}
        className={[
          "inline-flex h-10 items-center justify-start gap-3 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white/70 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27a6.471 6.471 0 0 0 1.57-4.23A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0A4.5 4.5 0 1 1 14 9.5 4.505 4.505 0 0 1 9.5 14Z"
          />
        </svg>
        <span className="text-white/70">Search podcasts…</span>
        <span className="ml-auto hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.35em] text-white/60 sm:inline-flex">
          ⌘K
        </span>
      </button>
      {overlay}
    </>
  );
}

interface ResultListProps {
  id: string;
  shows: SearchShowsQuery["search"];
  activeIndex: number;
  onSelect: (showId: string) => void;
  onHover: (index: number) => void;
  onSubscribe: (show: SearchShowsQuery["search"][number]) => Promise<void>;
  onUnsubscribe: (show: SearchShowsQuery["search"][number]) => Promise<void>;
  pendingState: { showId: string; action: "add" | "remove" } | null;
}

const ResultList = forwardRef<HTMLUListElement, ResultListProps>(
  (
    {
      id,
      shows,
      activeIndex,
      onSelect,
      onHover,
      onSubscribe,
      onUnsubscribe,
      pendingState,
    },
    ref
  ) => (
    <ul
      ref={ref}
      id={id}
      role="listbox"
      className="flex max-h-[min(70vh,720px)] flex-col gap-2 overflow-y-auto overscroll-contain px-1 py-1"
    >
      {shows.map((show, index) => {
        const optionId = `${id}-option-${index}`;
        const isActive = index === activeIndex;
        const description = pickDescription(show);
        const isSubscribed = Boolean(show.isSubscribed);
        const isPending = pendingState?.showId === show.id;
        const isRemoving = isPending && pendingState?.action === "remove";
        const isAdding = isPending && pendingState?.action === "add";
        const cardClassNames = [
          "flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/25 hover:bg-white/10 cursor-pointer focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f73ff]",
          isActive ? "border-white/25 bg-white/10" : "",
          isSubscribed ? "border-[#8f73ff]/70 bg-[#221048]/90" : "",
        ]
          .filter(Boolean)
          .join(" ");
        const handleSelect = () => {
          onSelect(show.id);
        };

        return (
          <li
            key={show.id}
            id={optionId}
            role="option"
            aria-selected={isActive}
            className={cardClassNames}
            onMouseEnter={() => onHover(index)}
            onClick={handleSelect}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelect();
              }
            }}
            tabIndex={-1}
          >
            <div className="flex flex-1 min-w-0 items-center gap-4 text-left">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] shadow-[0_18px_40px_rgba(41,23,90,0.35)]">
                {show.image ? (
                  <img
                    src={show.image}
                    alt={show.title ?? "Podcast artwork"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Pod
                  </span>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-white">
                  {show.title ?? "Untitled show"}
                </p>
                <p className="truncate text-[11px] uppercase tracking-[0.3em] text-white/50">
                  {show.publisher}
                </p>
                {description.value ? (
                  description.isHtml ? (
                    <div
                      className="prose prose-invert prose-xs line-clamp-2 text-white/50 prose-p:my-0"
                      dangerouslySetInnerHTML={{ __html: description.value }}
                    />
                  ) : (
                    <p className="line-clamp-2 text-xs leading-snug text-white/50">
                      {description.value}
                    </p>
                  )
                ) : null}
                <MetadataRow show={show} />
              </div>
            </div>
            {isSubscribed ? (
              <InteractiveButton
                variant="outline"
                onClick={(event) => {
                  event.stopPropagation();
                  void onUnsubscribe(show);
                }}
                isLoading={isRemoving}
                className="ml-auto flex-shrink-0 transition-transform duration-200 hover:scale-[1.04] focus-visible:scale-[1.04]"
              >
                Remove
              </InteractiveButton>
            ) : (
              <InteractiveButton
                variant="secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  void onSubscribe(show);
                }}
                isLoading={isAdding}
                className="ml-auto flex-shrink-0 transition-transform duration-200 hover:scale-[1.04] focus-visible:scale-[1.04]"
              >
                Add
              </InteractiveButton>
            )}
          </li>
        );
      })}
    </ul>
  )
);

const SearchResultsSkeleton = (): JSX.Element => (
  <ul className="flex max-h-[min(70vh,720px)] flex-col gap-2 overflow-y-auto overscroll-contain px-1 py-1">
    {Array.from({ length: 4 }).map((_, index) => (
      <li
        key={`search-skeleton-${index}`}
        className="flex animate-pulse items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
      >
        <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/10" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-3/5 rounded-full bg-white/15" />
          <div className="h-3 w-2/5 rounded-full bg-white/12" />
          <div className="h-3 w-full rounded-full bg-white/10" />
          <div className="h-3 w-1/2 rounded-full bg-white/8" />
        </div>
        <div className="h-9 w-24 shrink-0 rounded-full bg-white/12" />
      </li>
    ))}
  </ul>
);

function MetadataRow({
  show,
}: {
  show: SearchShowsQuery["search"][number];
}): JSX.Element | null {
  const languages = show.languages?.filter(isNonEmptyString) ?? [];
  const categories = show.categories?.filter(isNonEmptyString) ?? [];
  const totalEpisodes = show.totalEpisodes ?? 0;
  const hasMeta =
    totalEpisodes > 0 ||
    Boolean(show.explicit) ||
    languages.length > 0 ||
    categories.length > 0;

  if (!hasMeta) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-white/40">
      {totalEpisodes > 0 ? <span>{totalEpisodes} eps</span> : null}
      {show.explicit ? <span className="text-[#ff9fb0]">Explicit</span> : null}
      {languages.length ? <span>{languages.join(" · ")}</span> : null}
      {categories.length ? <span>{categories[0]}</span> : null}
    </div>
  );
}

const EmptyPrompt = (): JSX.Element => (
  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/60">
    Start typing to find a podcast.
  </div>
);

const EmptyState = (): JSX.Element => (
  <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/60">
    No podcasts matched that search. Try another title or publisher.
  </div>
);

interface ErrorStateProps {
  error: { message: string };
}

const ErrorState = ({ error }: ErrorStateProps): JSX.Element => (
  <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-6 text-sm text-red-100">
    Failed to search podcasts: {error.message}
  </div>
);
