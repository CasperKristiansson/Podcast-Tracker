import { useEffect, useMemo, useState } from "react";
import PodcastDetailApp from "../podcast/PodcastDetailApp";
import SubscriptionsApp from "../graphql/SubscriptionsApp";
import ProfileApp from "../profile/ProfileApp";

type RouteView =
  | { type: "subscriptions" }
  | { type: "profile" }
  | { type: "show"; showId: string }
  | { type: "episode"; showId: string; episodeId: string }
  | { type: "unknown" };

const decodeSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parseView = (pathname: string): RouteView => {
  const trimmed = pathname.replace(/^\/+|\/+$/g, "");
  if (!trimmed) {
    return { type: "subscriptions" };
  }

  const segments = trimmed.split("/").map(decodeSegment);

  if (segments[0] !== "app") {
    return { type: "subscriptions" };
  }

  if (segments.length === 1) {
    return { type: "subscriptions" };
  }

  if (segments[1] === "profile") {
    return { type: "profile" };
  }

  if (segments[1] === "show" && segments[2]) {
    const showId = segments[2];
    if (segments[3] === "episode" && segments[4]) {
      return { type: "episode", showId, episodeId: segments[4] };
    }
    return { type: "show", showId };
  }

  return { type: "unknown" };
};

export default function AppShell(): JSX.Element {
  const [pathname, setPathname] = useState(() => {
    if (typeof window === "undefined") {
      return "/";
    }
    return window.location.pathname || "/";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handlePopState = () => {
      setPathname(window.location.pathname || "/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const view = useMemo<RouteView>(() => parseView(pathname), [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    switch (view.type) {
      case "subscriptions":
        document.title = "Subscriptions · Podcast Tracker";
        break;
      case "profile":
        document.title = "Profile · Podcast Tracker";
        break;
      case "show":
        document.title = "Podcast · Podcast Tracker";
        break;
      default:
        document.title = "Podcast Tracker";
        break;
    }
  }, [view]);

  if (view.type === "subscriptions") {
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

  if (view.type === "profile") {
    return (
      <section className="relative flex min-h-screen w-full flex-col">
        <ProfileApp />
      </section>
    );
  }

  if (view.type === "show") {
    return (
      <section className="min-h-screen">
        <PodcastDetailApp showId={view.showId} />
      </section>
    );
  }

  return (
    <div className="px-6 py-16 text-center text-sm text-brand-muted">
      Unknown route. Please return to your subscriptions.
    </div>
  );
}
