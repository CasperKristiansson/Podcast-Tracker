import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import {
  SearchShowsDocument,
  type SearchShowsQuery,
  type SearchShowsQueryVariables,
  SubscribeToShowDocument,
  type SubscribeToShowMutation,
  type SubscribeToShowMutationVariables,
} from "@shared";
import { GlowCard, InteractiveButton, SearchInput } from "@ui";

interface PodcastSearchBarProps {
  limit?: number;
}

const DEBOUNCE_MS = 250;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

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
  limit = 6,
}: PodcastSearchBarProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [runSearch, { data, loading, error, called }] = useLazyQuery<
    SearchShowsQuery,
    SearchShowsQueryVariables
  >(SearchShowsDocument, {
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-and-network",
  });

  const [subscribeToShow, { loading: subscribing }] = useMutation<
    SubscribeToShowMutation,
    SubscribeToShowMutationVariables
  >(SubscribeToShowDocument);

  const shows = useMemo(() => data?.search ?? [], [data]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      return;
    }
    void runSearch({
      variables: { term: debouncedQuery, limit },
    });
  }, [debouncedQuery, limit, runSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSubscribe = async (
    show: SearchShowsQuery["search"][number]
  ): Promise<void> => {
    try {
      await subscribeToShow({
        variables: {
          showId: show.id,
          title: show.title ?? "",
          publisher: show.publisher ?? "",
          image: show.image ?? "",
        },
      });
    } catch (subscribeError) {
      console.error("Failed to subscribe", subscribeError);
    }
  };

  const shouldShowPanel =
    isOpen &&
    (loading || (debouncedQuery.length >= 2 && (shows.length > 0 || called)));

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Find podcasts
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Explore the catalog
          </h2>
        </div>
        <SearchInput
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onClear={handleClear}
          allowClear
          isLoading={loading}
          placeholder="Search podcasts by title, publisher, or topic…"
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {shouldShowPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+1rem)] z-20">
          <GlowCard className="px-5 py-5">
            {error ? (
              <ErrorState error={error} />
            ) : shows.length === 0 && debouncedQuery.length >= 2 && !loading ? (
              <EmptyState />
            ) : (
              <ResultList
                shows={shows}
                onSelect={() => {
                  setIsOpen(false);
                }}
                onSubscribe={handleSubscribe}
                isSubscribing={subscribing}
              />
            )}
          </GlowCard>
        </div>
      ) : null}
    </div>
  );
}

interface ResultListProps {
  shows: SearchShowsQuery["search"];
  onSelect: () => void;
  onSubscribe: (show: SearchShowsQuery["search"][number]) => Promise<void>;
  isSubscribing: boolean;
}

const ResultList = ({
  shows,
  onSelect,
  onSubscribe,
  isSubscribing,
}: ResultListProps): JSX.Element => (
  <ul className="space-y-4">
    {shows.map((show) => (
      <li
        key={show.id}
        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.06]"
      >
        <a
          href={`/app/show/${show.id}`}
          onClick={() => onSelect()}
          className="flex flex-1 items-center gap-4"
        >
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
            <p className="truncate text-xs uppercase tracking-[0.3em] text-white/50">
              {show.publisher}
            </p>
            <ShowDescription show={show} />
            <MetadataRow show={show} />
          </div>
        </a>
        <InteractiveButton
          variant="secondary"
          onClick={() => {
            void onSubscribe(show);
          }}
          isLoading={isSubscribing}
          loadingLabel="Adding…"
        >
          Add
        </InteractiveButton>
      </li>
    ))}
  </ul>
);

const ShowDescription = ({
  show,
}: {
  show: SearchShowsQuery["search"][number];
}): JSX.Element | null => {
  const { value, isHtml } = pickDescription(show);

  if (!isNonEmptyString(value)) {
    return null;
  }

  if (isHtml) {
    return (
      <div
        className="prose prose-invert prose-xs line-clamp-2 text-white/50 prose-p:my-0"
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <p className="line-clamp-2 text-xs leading-snug text-white/50">{value}</p>
  );
};

const MetadataRow = ({
  show,
}: {
  show: SearchShowsQuery["search"][number];
}): JSX.Element | null => {
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
      {show.explicit ? <span className="text-red-200">Explicit</span> : null}
      {languages.length ? <span>{languages.join(" · ")}</span> : null}
      {categories.length ? <span>{categories[0]}</span> : null}
    </div>
  );
};

const EmptyState = (): JSX.Element => (
  <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/60">
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
