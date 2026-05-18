export const LISTENING_ATLAS_FILE_NAME = "listening-atlas-prompt.md";

export interface ListeningAtlasPromptShow {
  title?: string | null;
  publisher?: string | null;
  ratingStars?: number | null;
  ratingReview?: string | null;
  droppedAt?: unknown;
}

function cleanPromptText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function formatSeedShows(shows: ListeningAtlasPromptShow[]): string {
  const seedShows = shows.filter((show) => !show.droppedAt);

  if (seedShows.length === 0) {
    return "No listened shows were exported.";
  }

  return seedShows
    .map((show, index) => {
      const title = cleanPromptText(show.title) || "Untitled show";
      const publisher = cleanPromptText(show.publisher);
      const review = cleanPromptText(show.ratingReview);
      const rating =
        typeof show.ratingStars === "number"
          ? `${show.ratingStars}/5 stars`
          : "Not rated";

      return [
        `${index + 1}. ${title}`,
        `   Publisher: ${publisher || "Unknown"}`,
        `   My rating: ${rating}`,
        `   My notes: ${review || "No written notes"}`,
      ].join("\n");
    })
    .join("\n\n");
}

export function buildListeningAtlasPrompt(
  shows: ListeningAtlasPromptShow[]
): string {
  const seedList = formatSeedShows(shows);

  return `
You have web access. Your job: find new **scripted audio drama** podcasts available **on Spotify** only. No talk shows, interviews, news, education, true-crime documentary, recap, comedy chat, RPG actual-play, or non-fiction. Scripted fiction only.

GOAL
Find the single next audio drama that is most likely to be perfect for me. Infer my taste from the listening profile below, especially my written notes and high/low ratings.

REGION
Assume availability in {{COUNTRY}}. If uncertain, prefer global availability.

LISTENING PROFILE
These are shows I have already logged. The title is the Spotify show title when available, the publisher is the studio/network, and the rating/notes are my own.

${seedList}

RESEARCH RULES
1) Search and cite only Spotify show pages. If a candidate lacks a valid Spotify show URL, exclude it.
2) Verify it is scripted fiction. Look for Spotify category tags, descriptions, cast, season labeling, and production notes that indicate drama/fiction. If uncertain, exclude.
3) Freshness: prefer series with recent releases or complete, acclaimed mini-series, but fit matters more than recency.
4) Do not recommend anything already in my listening profile.
5) No duplicates of seed shows. No regional dead ends if {{COUNTRY}} cannot access.

RANKING
Research broadly, then decide. Do not mechanically optimize a score table. Prefer the show that best combines taste match, quality, availability, and enough novelty that it is not just a duplicate of what I already know.

OUTPUT
Write in natural prose, not JSON. Start with the one show I should listen to next, including its Spotify show URL. Then explain why it is the right pick for me, grounded in patterns from my listening profile. Mention any useful caveats only if they affect whether I should start it now.

CONSTRAINTS
- Do not output JSON.
- Do not include a long candidate list unless it is needed to explain a close call.
- The final recommendation must include a working Spotify show URL.

VARIABLES TO SET BEFORE RUN
- {{COUNTRY}} = "Sweden"
`;
}
