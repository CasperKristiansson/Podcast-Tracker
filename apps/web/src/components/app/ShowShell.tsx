import { useEffect, useState } from "react";
import PodcastDetailApp from "../podcast/PodcastDetailApp";

const decodeSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const extractShowId = (
  location: Location
): { id: string | null; canonicalUrl: string | null } => {
  const params = new URLSearchParams(location.search);
  const queryId = params.get("id");
  if (queryId) {
    const canonical =
      location.pathname === "/show" ? null : `/show?${params.toString()}`;
    return { id: queryId, canonicalUrl: canonical };
  }

  if (location.pathname.startsWith("/show/")) {
    const [, , rawShowId] = location.pathname.split("/");
    if (!rawShowId) {
      return { id: null, canonicalUrl: null };
    }
    const decoded = decodeSegment(rawShowId);
    if (!decoded) {
      return { id: null, canonicalUrl: null };
    }
    const nextParams = new URLSearchParams(location.search);
    nextParams.set("id", decoded);
    return {
      id: decoded,
      canonicalUrl: `/show?${nextParams.toString()}`,
    };
  }

  return { id: null, canonicalUrl: null };
};

export default function ShowShell(): JSX.Element {
  const [showId, setShowId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const { id, canonicalUrl } = extractShowId(window.location);
    if (canonicalUrl) {
      window.history.replaceState(null, "", canonicalUrl);
    }
    return id;
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleNavigation = () => {
      const { id, canonicalUrl } = extractShowId(window.location);
      if (canonicalUrl) {
        window.history.replaceState(null, "", canonicalUrl);
      }
      setShowId(id);
    };

    handleNavigation();
    window.addEventListener("popstate", handleNavigation);
    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.title = "Podcast · Podcast Tracker";
  }, []);

  if (!showId) {
    return (
      <div className="px-6 py-20 text-center text-sm text-brand-muted">
        No podcast selected. Please return to{" "}
        <a
          href="/app"
          className="font-semibold text-brand-primary underline-offset-4 hover:underline"
        >
          your subscriptions
        </a>{" "}
        and choose a show.
      </div>
    );
  }

  return (
    <section className="min-h-screen">
      <PodcastDetailApp showId={showId} />
    </section>
  );
}
