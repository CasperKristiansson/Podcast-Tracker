import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import {
  MySubscriptionsDocument,
  type MySubscriptionsQuery,
  type MySubscriptionsQueryVariables,
  type UserSubscription,
} from "@shared";

const formatDate = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export default function SubscriptionsView(): JSX.Element {
  const { data, loading, error, refetch } = useQuery<
    MySubscriptionsQuery,
    MySubscriptionsQueryVariables
  >(MySubscriptionsDocument, {
    variables: { limit: 25 },
  });

  const items = useMemo<UserSubscription[]>(() => {
    const list = data?.mySubscriptions.items ?? [];
    return list.filter(
      (item: UserSubscription | null | undefined): item is UserSubscription =>
        Boolean(item)
    );
  }, [data]);

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center">
        <div className="animate-pulse rounded-lg bg-brand-surface/60 px-4 py-2 text-sm text-brand-muted">
          Loading subscriptions…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
        Failed to load subscriptions: {error.message}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-brand-primary/30 bg-brand-surface/60 p-8 text-center">
        <h2 className="text-xl font-semibold text-brand-text">
          No subscriptions yet
        </h2>
        <p className="mt-2 text-sm text-brand-muted">
          Use the search experience (coming soon) to add the podcasts you love.
        </p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-brand-text transition hover:bg-brand-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-brand-text">
          My Subscriptions
        </h2>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="inline-flex items-center justify-center rounded-md border border-brand-primary/50 px-3 py-1.5 text-xs font-semibold text-brand-text transition hover:bg-brand-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          Refresh
        </button>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const showId = String(item.showId);
          const showPath = encodeURIComponent(showId);
          return (
            <li
              key={item.showId}
              className="rounded-xl border border-white/5 bg-brand-surface/60 p-5 shadow-lg shadow-brand-primary/10"
            >
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-brand-text">
                    {item.title}
                  </h3>
                  <p className="text-sm text-brand-muted">{item.publisher}</p>
                  <p className="text-xs text-brand-muted/70">
                    {item.totalEpisodes ?? 0} episodes tracked
                  </p>
                </div>
                <a
                  className="inline-flex w-max items-center gap-2 text-sm font-medium text-brand-primary transition hover:text-brand-accent"
                  href={`/app/show/${showPath}`}
                >
                  View episodes
                  <span aria-hidden>&rarr;</span>
                </a>
                <p className="text-xs text-brand-muted/80">
                  Subscribed {formatDate(String(item.addedAt))}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
