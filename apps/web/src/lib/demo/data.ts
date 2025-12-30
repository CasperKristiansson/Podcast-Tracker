import type {
  DropShowMutation,
  MarkAllEpisodesCompleteMutation,
  MarkEpisodeProgressMutation,
  MarkNextEpisodeCompleteMutation,
  MyProfileQuery,
  RateShowMutation,
  SearchShowsQuery,
  ShowDetailQuery,
  SubscribeToShowMutation,
} from "@shared";

type DemoShow = {
  id: string;
  title: string;
  publisher: string;
  description: string;
  image: string;
  totalEpisodes: number;
  completedEpisodes: number;
  inProgressEpisodes: number;
  unlistenedEpisodes: number;
  ratingStars: number | null;
  ratingReview: string | null;
  categories: string[];
  explicit: boolean;
  languages: string[];
};

type ProfileShow = MyProfileQuery["myProfile"]["shows"][number];
type SpotlightShow = MyProfileQuery["myProfile"]["spotlight"][number];
type ShowDetail = ShowDetailQuery["showDetail"];
type Show = ShowDetailQuery["showDetail"]["show"];
type Episode =
  ShowDetailQuery["showDetail"]["episodes"]["items"][number];
type ProgressEntry = ShowDetailQuery["showDetail"]["progress"][number];

const EPISODE_COUNT = 8;

const demoShows: DemoShow[] = [
  {
    id: "2jyRVoDZxyNzilVdmq7U3B",
    title: "Signal Drift",
    publisher: "Field Notes Collective",
    description:
      "A patient archivist catalogs odd broadcasts pouring in from a shuttered coastal relay.",
    image: "/demo/shows/2jyRVoDZxyNzilVdmq7U3B.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 5,
    inProgressEpisodes: 1,
    unlistenedEpisodes: 2,
    ratingStars: 4,
    ratingReview: "Low-key mystery with a steady, cozy tension.",
    categories: ["Fiction", "Mystery"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "72cVljR6gfw5yiVUDMo6g3",
    title: "Afterlight Protocol",
    publisher: "Wayline Studio",
    description:
      "A tight-knit survivor crew maps a citywide blackout from a rooftop radio van.",
    image: "/demo/shows/72cVljR6gfw5yiVUDMo6g3.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 7,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 1,
    ratingStars: 5,
    ratingReview: "Big sound, bigger stakes, and a cast that clicks.",
    categories: ["Fiction", "Drama"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "4YChJfyufByaRzekQVKNGG",
    title: "Lookout Zero",
    publisher: "Pineglass Audio",
    description:
      "A lone fire watcher keeps a nightly log, until the forest answers back.",
    image: "/demo/shows/4YChJfyufByaRzekQVKNGG.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 6,
    inProgressEpisodes: 1,
    unlistenedEpisodes: 1,
    ratingStars: 4,
    ratingReview: "Atmospheric and quietly unnerving.",
    categories: ["Fiction", "Thriller"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "63EG22GCxZm6YVWlyVyG5K",
    title: "Final Harbor",
    publisher: "Beacon Foundry",
    description:
      "Journal entries from a floating settlement where the tide hides old secrets.",
    image: "/demo/shows/63EG22GCxZm6YVWlyVyG5K.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 4,
    inProgressEpisodes: 1,
    unlistenedEpisodes: 3,
    ratingStars: 3,
    ratingReview: "A slow burn with great worldbuilding.",
    categories: ["Fiction", "Sci-Fi"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "2zaOPON66InniTdoEoPai5",
    title: "Frostline Logbook",
    publisher: "Latitude Stories",
    description:
      "A logistics pilot reports from an isolated research base that won’t answer.",
    image: "/demo/shows/2zaOPON66InniTdoEoPai5.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 2,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 6,
    ratingStars: null,
    ratingReview: null,
    categories: ["Fiction", "Horror"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "2TevVBfS0JReKn1MMeNkv2",
    title: "Missing Seats",
    publisher: "Northbridge Audio",
    description:
      "A journalist retraces a vanished commuter flight with a box of voice notes.",
    image: "/demo/shows/2TevVBfS0JReKn1MMeNkv2.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 0,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 8,
    ratingStars: null,
    ratingReview: null,
    categories: ["Fiction", "Mystery"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "36M6trVzBdT6nNSavqCWfO",
    title: "Lumen Transit",
    publisher: "Q-Transit",
    description:
      "A courier rides a light-rail line that doesn’t exist on any map.",
    image: "/demo/shows/36M6trVzBdT6nNSavqCWfO.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 1,
    inProgressEpisodes: 1,
    unlistenedEpisodes: 6,
    ratingStars: null,
    ratingReview: null,
    categories: ["Fiction", "Adventure"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "2rGtDwR5mA4sycJ0YV6JHk",
    title: "Redline Signal",
    publisher: "Voyage Studio",
    description:
      "A retired dispatcher follows a ghostly signal that keeps hijacking the airwaves.",
    image: "/demo/shows/2rGtDwR5mA4sycJ0YV6JHk.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 3,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 5,
    ratingStars: 2,
    ratingReview: "Love the sound design, wish the plot moved faster.",
    categories: ["Fiction", "Thriller"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "0RRsd7061dikIOv6WbhmDS",
    title: "The Quiet Hull",
    publisher: "Night Rocket Audio",
    description:
      "An interstellar salvage crew discovers a ship humming with a living memory.",
    image: "/demo/shows/0RRsd7061dikIOv6WbhmDS.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 8,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 0,
    ratingStars: 5,
    ratingReview: "Cinematic, moody sci-fi with punchy pacing.",
    categories: ["Fiction", "Sci-Fi"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "7aTEmK0Vvwa5L4ZKBsmPyJ",
    title: "Stone River Files",
    publisher: "Grim & Mild",
    description:
      "A folklore professor unpacks a town’s myth ledger after a sudden flood.",
    image: "/demo/shows/7aTEmK0Vvwa5L4ZKBsmPyJ.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 7,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 1,
    ratingStars: 4,
    ratingReview: "Great small-town creepiness with a tender heart.",
    categories: ["Fiction", "Mystery"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "1tshi3C3cIBEj6XkyLuo6b",
    title: "Quiet City",
    publisher: "Two-Up Works",
    description:
      "A documentarian chases the last hour of a city that went silent overnight.",
    image: "/demo/shows/1tshi3C3cIBEj6XkyLuo6b.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 8,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 0,
    ratingStars: 4,
    ratingReview: "Tense, investigative storytelling with a satisfying twist.",
    categories: ["Fiction", "Mystery"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "5DoBLLrqyjhXSI0AP25M7z",
    title: "Night Grid",
    publisher: "Endeavor Audio",
    description:
      "A dispatcher keeps a power grid alive while rumors of a solar storm spread.",
    image: "/demo/shows/5DoBLLrqyjhXSI0AP25M7z.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 6,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 2,
    ratingStars: 3,
    ratingReview: "Solid setup with a few wild turns.",
    categories: ["Fiction", "Thriller"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "7mj2cxXR0KPFxcAt9Eignz",
    title: "Hollow Pines",
    publisher: "QCODE",
    description:
      "Two siblings return to their mountain town and find the forest listening back.",
    image: "/demo/shows/7mj2cxXR0KPFxcAt9Eignz.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 8,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 0,
    ratingStars: 5,
    ratingReview: "The mystery unfolds perfectly.",
    categories: ["Fiction", "Horror"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "35qAlh89ViwpeVJiRtnoiI",
    title: "Ashframe",
    publisher: "QCODE Media",
    description:
      "A photographer develops a roll of film that captures a night that never happened.",
    image: "/demo/shows/35qAlh89ViwpeVJiRtnoiI.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 6,
    inProgressEpisodes: 0,
    unlistenedEpisodes: 2,
    ratingStars: 3,
    ratingReview: "Spooky fun, but a little uneven.",
    categories: ["Fiction", "Horror"],
    explicit: false,
    languages: ["en"],
  },
  {
    id: "0iCwWITI2p0Ucaq3ISCxV2",
    title: "Sidepath",
    publisher: "QCODE",
    description:
      "A rideshare driver takes a wrong turn and enters a loop of impossible roads.",
    image: "/demo/shows/0iCwWITI2p0Ucaq3ISCxV2.jpg",
    totalEpisodes: EPISODE_COUNT,
    completedEpisodes: 7,
    inProgressEpisodes: 1,
    unlistenedEpisodes: 0,
    ratingStars: 5,
    ratingReview: "Couldn’t stop listening.",
    categories: ["Fiction", "Thriller"],
    explicit: false,
    languages: ["en"],
  },
];

const spotlightIds = new Set([
  "2jyRVoDZxyNzilVdmq7U3B",
  "72cVljR6gfw5yiVUDMo6g3",
  "4YChJfyufByaRzekQVKNGG",
  "0RRsd7061dikIOv6WbhmDS",
]);

const baseEpisodeTemplates = [
  {
    title: "Signal Check",
    description: "A routine scan reveals a whisper in the noise.",
    durationSec: 1860,
  },
  {
    title: "Static Gardens",
    description: "The crew follows a pattern hidden inside the interference.",
    durationSec: 2040,
  },
  {
    title: "Night Shift",
    description: "A midnight entry goes off script in a subtle way.",
    durationSec: 1920,
  },
  {
    title: "The Quiet Corridor",
    description: "A locked hallway opens and the map refuses to update.",
    durationSec: 2100,
  },
  {
    title: "Echo Loop",
    description: "A message repeats with a detail that wasn’t there before.",
    durationSec: 1980,
  },
  {
    title: "Horizon Line",
    description: "A new signal source appears on the far edge of the grid.",
    durationSec: 2220,
  },
  {
    title: "Lightwell",
    description: "The team follows a breadcrumb trail into the dark.",
    durationSec: 2010,
  },
  {
    title: "After Hours",
    description: "A final log closes the loop with a calm confession.",
    durationSec: 1760,
  },
];

const demoShowMap = new Map(demoShows.map((show) => [show.id, show]));

const demoProfileShows = new Map<string, ProfileShow>();
const demoShowDetails = new Map<string, Show>();
const demoEpisodes = new Map<string, Episode[]>();
const demoProgress = new Map<string, Map<string, ProgressEntry>>();

const makeIsoDate = (seed: number): string => {
  const base = new Date("2025-01-01T08:00:00.000Z").getTime();
  return new Date(base + seed * 86400000).toISOString();
};

const ensureEpisodes = (showId: string): Episode[] => {
  const existing = demoEpisodes.get(showId);
  if (existing) {
    return existing;
  }
  const show = demoShowMap.get(showId);
  if (!show) {
    return [];
  }
  const items = baseEpisodeTemplates.map((episode, index) => ({
    __typename: "Episode",
    episodeId: `${showId}-ep-${index + 1}`,
    showId,
    title: `${episode.title} · ${show.title}`,
    audioUrl: "",
    publishedAt: makeIsoDate(20 + index),
    durationSec: episode.durationSec,
    description: episode.description,
    htmlDescription: null,
    image: show.image,
    linkUrl: null,
    explicit: false,
    isExternallyHosted: false,
    isPlayable: false,
    releaseDatePrecision: "day",
    languages: show.languages,
  }));
  demoEpisodes.set(showId, items);
  return items;
};

const ensureShowDetail = (showId: string): Show | null => {
  const existing = demoShowDetails.get(showId);
  if (existing) {
    return existing;
  }
  const show = demoShowMap.get(showId);
  if (!show) {
    return null;
  }
  const detail: Show = {
    __typename: "Show",
    id: show.id,
    title: show.title,
    publisher: show.publisher,
    description: show.description,
    htmlDescription: null,
    image: show.image,
    totalEpisodes: show.totalEpisodes,
    externalUrl: null,
    categories: show.categories,
    explicit: show.explicit,
    languages: show.languages,
    availableMarkets: ["SE", "US", "GB"],
    mediaType: "audio",
    isSubscribed: demoProfileShows.has(showId),
  };
  demoShowDetails.set(showId, detail);
  return detail;
};

const ensureProfileShow = (showId: string, index = 0): ProfileShow | null => {
  const existing = demoProfileShows.get(showId);
  if (existing) {
    return existing;
  }
  const show = demoShowMap.get(showId);
  if (!show) {
    return null;
  }
  const profileShow: ProfileShow = {
    __typename: "ProfileShow",
    showId: show.id,
    title: show.title,
    publisher: show.publisher,
    image: show.image,
    addedAt: makeIsoDate(index + 2),
    totalEpisodes: show.totalEpisodes,
    completedEpisodes: show.completedEpisodes,
    inProgressEpisodes: show.inProgressEpisodes,
    unlistenedEpisodes: show.unlistenedEpisodes,
    subscriptionSyncedAt: makeIsoDate(index + 12),
    ratingStars: show.ratingStars,
    ratingReview: show.ratingReview,
    ratingUpdatedAt: show.ratingStars ? makeIsoDate(index + 7) : null,
    droppedAt: null,
  };
  demoProfileShows.set(showId, profileShow);
  return profileShow;
};

const ensureProgressMap = (showId: string): Map<string, ProgressEntry> => {
  const existing = demoProgress.get(showId);
  if (existing) {
    return existing;
  }
  const progressMap = new Map<string, ProgressEntry>();
  const episodes = ensureEpisodes(showId);
  const show = demoShowMap.get(showId);
  const initialCount = Math.min(show?.completedEpisodes ?? 0, episodes.length);
  for (let idx = 0; idx < initialCount; idx += 1) {
    const episode = episodes[idx];
    progressMap.set(episode.episodeId, {
      __typename: "Progress",
      episodeId: episode.episodeId,
      completed: true,
      updatedAt: makeIsoDate(35 + idx),
      showId,
    });
  }
  demoProgress.set(showId, progressMap);
  return progressMap;
};

demoShows.forEach((show, index) => {
  ensureProfileShow(show.id, index);
  ensureShowDetail(show.id);
  ensureEpisodes(show.id);
  ensureProgressMap(show.id);
});

const getSubscriptionPayload = (showId: string): ShowDetail["subscription"] => {
  const profileShow = demoProfileShows.get(showId);
  if (!profileShow) {
    return null;
  }
  return {
    __typename: "UserSubscription",
    showId: profileShow.showId,
    title: profileShow.title,
    publisher: profileShow.publisher,
    image: profileShow.image,
    addedAt: profileShow.addedAt,
    totalEpisodes: profileShow.totalEpisodes,
    ratingStars: profileShow.ratingStars,
    ratingReview: profileShow.ratingReview,
    ratingUpdatedAt: profileShow.ratingUpdatedAt,
    subscriptionSyncedAt: profileShow.subscriptionSyncedAt,
    droppedAt: profileShow.droppedAt,
  };
};

export const getDemoProfile = (): MyProfileQuery => {
  const shows = Array.from(demoProfileShows.values());
  const spotlight: SpotlightShow[] = shows.filter((show) =>
    spotlightIds.has(show.showId)
  );
  const stats = shows.reduce(
    (acc, show) => {
      return {
        totalShows: acc.totalShows + 1,
        episodesCompleted: acc.episodesCompleted + (show.completedEpisodes ?? 0),
        episodesInProgress:
          acc.episodesInProgress + (show.inProgressEpisodes ?? 0),
      };
    },
    {
      totalShows: 0,
      episodesCompleted: 0,
      episodesInProgress: 0,
    }
  );

  return {
    __typename: "Query",
    myProfile: {
      __typename: "UserProfile",
      stats: {
        __typename: "ProfileStats",
        totalShows: stats.totalShows,
        episodesCompleted: stats.episodesCompleted,
        episodesInProgress: stats.episodesInProgress,
      },
      spotlight,
      shows,
    },
  };
};

export const searchDemoShows = (
  term: string,
  limit?: number
): SearchShowsQuery => {
  const normalized = term.trim().toLowerCase();
  const results = Array.from(demoShowMap.values()).filter((show) => {
    if (!normalized) {
      return true;
    }
    return (
      show.title.toLowerCase().includes(normalized) ||
      show.publisher.toLowerCase().includes(normalized) ||
      show.description.toLowerCase().includes(normalized)
    );
  });

  const sliced = typeof limit === "number" ? results.slice(0, limit) : results;

  return {
    __typename: "Query",
    search: sliced.map((show) => ({
      __typename: "Show",
      id: show.id,
      title: show.title,
      publisher: show.publisher,
      description: show.description,
      htmlDescription: null,
      image: show.image,
      totalEpisodes: show.totalEpisodes,
      externalUrl: null,
      categories: show.categories,
      explicit: show.explicit,
      languages: show.languages,
      availableMarkets: ["SE", "US", "GB"],
      mediaType: "audio",
      isSubscribed: demoProfileShows.has(show.id),
    })),
  };
};

export const getDemoShowDetail = (showId: string): ShowDetailQuery => {
  const show = ensureShowDetail(showId);
  if (!show) {
    throw new Error("Demo show not found.");
  }
  const episodes = ensureEpisodes(showId);
  const progressEntries = Array.from(ensureProgressMap(showId).values());
  return {
    __typename: "Query",
    showDetail: {
      __typename: "ShowDetail",
      show,
      subscription: getSubscriptionPayload(showId),
      episodes: {
        __typename: "EpisodeConnection",
        items: episodes,
        nextToken: null,
      },
      progress: progressEntries,
    },
  };
};

export const markDemoEpisodeProgress = (
  showId: string,
  episodeId: string,
  completed: boolean
): MarkEpisodeProgressMutation => {
  const progressMap = ensureProgressMap(showId);
  const nextEntry: ProgressEntry = {
    __typename: "Progress",
    episodeId,
    completed,
    updatedAt: new Date().toISOString(),
    showId,
  };
  progressMap.set(episodeId, nextEntry);
  return {
    __typename: "Mutation",
    markProgress: nextEntry,
  };
};

export const markDemoAllEpisodes = (
  showId: string
): MarkAllEpisodesCompleteMutation => {
  const progressMap = ensureProgressMap(showId);
  const episodes = ensureEpisodes(showId);
  const updates: ProgressEntry[] = episodes.map((episode) => {
    const entry: ProgressEntry = {
      __typename: "Progress",
      episodeId: episode.episodeId,
      completed: true,
      updatedAt: new Date().toISOString(),
      showId,
    };
    progressMap.set(episode.episodeId, entry);
    return entry;
  });
  return {
    __typename: "Mutation",
    markAllEpisodesComplete: updates,
  };
};

export const markDemoNextEpisode = (
  showId: string
): MarkNextEpisodeCompleteMutation => {
  const progressMap = ensureProgressMap(showId);
  const episodes = ensureEpisodes(showId);
  const nextEpisode =
    episodes.find((episode) => !progressMap.get(episode.episodeId)?.completed) ??
    episodes[0];

  if (!nextEpisode) {
    return {
      __typename: "Mutation",
      markNextEpisodeComplete: {
        __typename: "Progress",
        episodeId: "",
        completed: false,
        updatedAt: new Date().toISOString(),
        showId,
      },
    };
  }

  const entry: ProgressEntry = {
    __typename: "Progress",
    episodeId: nextEpisode.episodeId,
    completed: true,
    updatedAt: new Date().toISOString(),
    showId,
  };
  progressMap.set(nextEpisode.episodeId, entry);

  const profileShow = demoProfileShows.get(showId);
  if (profileShow) {
    const completed = Math.min(
      profileShow.totalEpisodes,
      (profileShow.completedEpisodes ?? 0) + 1
    );
    const unlistened = Math.max(
      0,
      profileShow.totalEpisodes - completed - (profileShow.inProgressEpisodes ?? 0)
    );
    demoProfileShows.set(showId, {
      ...profileShow,
      completedEpisodes: completed,
      unlistenedEpisodes: unlistened,
    });
  }

  return {
    __typename: "Mutation",
    markNextEpisodeComplete: entry,
  };
};

export const subscribeDemoShow = (
  showId: string
): SubscribeToShowMutation => {
  const show = demoShowMap.get(showId);
  if (!show) {
    throw new Error("Demo show not found.");
  }
  if (!demoProfileShows.has(showId)) {
    const profileShow = ensureProfileShow(showId, demoProfileShows.size);
    if (profileShow) {
      demoProfileShows.set(showId, profileShow);
    }
  }
  const subscription = getSubscriptionPayload(showId);
  if (subscription && demoShowDetails.has(showId)) {
    const detail = demoShowDetails.get(showId);
    if (detail) {
      demoShowDetails.set(showId, { ...detail, isSubscribed: true });
    }
  }
  return {
    __typename: "Mutation",
    subscribe: subscription ?? {
      __typename: "UserSubscription",
      showId,
      title: show.title,
      publisher: show.publisher,
      image: show.image,
      addedAt: makeIsoDate(3),
      totalEpisodes: show.totalEpisodes,
      ratingStars: null,
      ratingReview: null,
      ratingUpdatedAt: null,
      subscriptionSyncedAt: makeIsoDate(9),
      droppedAt: null,
    },
  };
};

export const unsubscribeDemoShow = (showId: string): boolean => {
  demoProfileShows.delete(showId);
  const detail = demoShowDetails.get(showId);
  if (detail) {
    demoShowDetails.set(showId, { ...detail, isSubscribed: false });
  }
  return true;
};

export const dropDemoShow = (showId: string): DropShowMutation => {
  const profileShow = demoProfileShows.get(showId);
  if (!profileShow) {
    return {
      __typename: "Mutation",
      dropShow: null,
    };
  }
  const updated: ProfileShow = {
    ...profileShow,
    droppedAt: new Date().toISOString(),
  };
  demoProfileShows.set(showId, updated);

  return {
    __typename: "Mutation",
    dropShow: {
      __typename: "UserSubscription",
      showId: updated.showId,
      title: updated.title,
      publisher: updated.publisher,
      image: updated.image,
      addedAt: updated.addedAt,
      totalEpisodes: updated.totalEpisodes,
      ratingStars: updated.ratingStars,
      ratingReview: updated.ratingReview,
      ratingUpdatedAt: updated.ratingUpdatedAt,
      subscriptionSyncedAt: updated.subscriptionSyncedAt,
      droppedAt: updated.droppedAt,
    },
  };
};

export const rateDemoShow = (
  showId: string,
  stars: number,
  review: string | null
): RateShowMutation => {
  const profileShow = demoProfileShows.get(showId);
  if (!profileShow) {
    return {
      __typename: "Mutation",
      rateShow: null,
    };
  }
  const updated: ProfileShow = {
    ...profileShow,
    ratingStars: stars,
    ratingReview: review,
    ratingUpdatedAt: new Date().toISOString(),
  };
  demoProfileShows.set(showId, updated);

  return {
    __typename: "Mutation",
    rateShow: {
      __typename: "UserSubscription",
      showId: updated.showId,
      title: updated.title,
      publisher: updated.publisher,
      image: updated.image,
      addedAt: updated.addedAt,
      totalEpisodes: updated.totalEpisodes,
      ratingStars: updated.ratingStars,
      ratingReview: updated.ratingReview,
      ratingUpdatedAt: updated.ratingUpdatedAt,
      subscriptionSyncedAt: updated.subscriptionSyncedAt,
      droppedAt: updated.droppedAt,
    },
  };
};
