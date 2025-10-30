import { useEffect } from "react";
import SubscriptionsApp from "../graphql/SubscriptionsApp";

const decodeSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function AppShell(): JSX.Element {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const { pathname, search } = window.location;
    const params = new URLSearchParams(search);

    const legacyShowId = params.get("showId");
    if (legacyShowId) {
      params.delete("showId");
      params.set("id", legacyShowId);
      const query = params.toString();
      const nextUrl = query.length > 0 ? `/show?${query}` : "/show";
      window.location.replace(nextUrl);
      return;
    }

    if (pathname.startsWith("/app/show/")) {
      const [, , , rawShowId] = pathname.split("/");
      if (!rawShowId) {
        return;
      }
      const showId = decodeSegment(rawShowId);
      if (!showId) {
        return;
      }
      const nextParams = new URLSearchParams(search);
      nextParams.set("id", showId);
      const query = nextParams.toString();
      const nextUrl = query.length > 0 ? `/show?${query}` : "/show";
      window.location.replace(nextUrl);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.title = "Subscriptions · Podcast Tracker";
  }, []);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 md:py-24">
      <div className="space-y-3 text-center md:text-left">
        <p className="text-xs uppercase tracking-[0.4em] text-brand-muted">
          Dashboard
        </p>
        <h1 className="text-3xl font-semibold text-brand-text">
          Your Subscriptions
        </h1>
        <p className="text-sm text-brand-muted">
          Data loads directly from AppSync using your Cognito session.
          Subscriptions update in near real-time when refresh jobs run.
        </p>
      </div>

      <SubscriptionsApp />
    </section>
  );
}
