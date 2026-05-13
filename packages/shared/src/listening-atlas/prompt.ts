export const LISTENING_ATLAS_FILE_NAME = "listening-atlas-prompt.md";

export interface ListeningAtlasPromptShow {
  title?: string | null;
  publisher?: string | null;
  ratingStars?: number | null;
  ratingReview?: string | null;
  droppedAt?: unknown;
}

export function buildListeningAtlasPrompt(
  shows: ListeningAtlasPromptShow[]
): string {
  const seedShows = shows
    .filter((show) => !show.droppedAt)
    .map((show) => ({
      podcast_name: show.title ?? "",
      publisher: show.publisher ?? "",
      stats: {
        user_rating_stars:
          typeof show.ratingStars === "number" ? show.ratingStars : null,
        user_review:
          typeof show.ratingReview === "string" ? show.ratingReview : "",
      },
    }));
  const seedJson = JSON.stringify(seedShows, null, 2);

  return `
You have web access. Your job: find new **scripted audio drama** podcasts available **on Spotify** only. No talk shows, interviews, news, education, true-crime documentary, recap, comedy chat, RPG actual-play, or non-fiction. Scripted fiction only.

GOAL
Return {{MAX_RESULTS}} high-quality Spotify audio dramas I have not logged below, ranked by fit to my tastes inferred from my seed list and reviews.

REGION
Assume availability in {{COUNTRY}}. If uncertain, prefer global availability.

INPUT — SEED PODCASTS I’VE HEARD
Paste JSON between the tags. Keep names exactly as shown on Spotify. “publisher” is the studio/network behind the show. “stats.user_rating_stars” and “stats.user_review” are my own ratings and notes.

<SEED_SHOWS_JSON>
${seedJson}
</SEED_SHOWS_JSON>

RESEARCH RULES
1) Search and cite only Spotify show pages. If a candidate lacks a valid Spotify show URL, exclude it.
2) Verify it is scripted fiction. Look for Spotify category tags, descriptions, cast, season labeling, and production notes that indicate drama/fiction. If uncertain, exclude.
3) Diversity: include a spread across subgenres when possible (mystery, thriller, sci-fi, horror, fantasy, noir).
4) Freshness: prefer series with recent releases or complete, acclaimed mini-series.
5) No duplicates of seed shows. No regional dead ends if {{COUNTRY}} cannot access.

RANKING
Compute:
- match_score [0–100]: textual similarity between seed reviews and candidate themes, tone, pacing, sound design.
- novelty_score [0–100]: how different it is from the largest clusters in my seed set while still aligned.
Final rank = round(0.7*match_score + 0.3*novelty_score).

OUTPUT FORMAT — JSON ONLY
Return a single JSON object with this shape:

{
  "summary": {
    "seed_count": <int>,
    "key_themes": ["<theme>", "..."],         // inferred from my reviews
    "method_note": "Spotify-only, scripted fiction verified"
  },
  "recommendations": [
    {
      "title": "<Spotify show title>",
      "publisher": "<studio/network>",
      "spotify_url": "https://open.spotify.com/show/....",
      "is_audio_drama": true,
      "status": "<ongoing|completed|miniseries>",
      "years": "YYYY–YYYY or YYYY–present",
      "typical_episode_length_min": <int|null>,
      "subgenres": ["mystery","thriller"],
      "why_it_matches": "One sentence that references my seed reviews directly.",
      "similar_to_seeds": ["<seed match 1>", "<seed match 2>"],
      "content_notes": ["violence","language"],     // if applicable
      "last_release_date": "YYYY-MM-DD",
      "match_score": <0-100>,
      "novelty_score": <0-100>,
      "rank": <1-based int>
    }
  ],
  "excluded_candidates": [
    {
      "title": "<name>",
      "reason": "<not on Spotify|not scripted fiction|region-locked|duplicate>"
    }
  ]
}

CONSTRAINTS
- Output must be valid JSON. No commentary before or after.
- Every recommendation must include a working Spotify show URL.
- If fewer than {{MAX_RESULTS}} valid scripted audio dramas are found, return the maximum valid number and explain shortage in summary.method_note.

VARIABLES TO SET BEFORE RUN
- {{MAX_RESULTS}} = 10
- {{COUNTRY}} = "Sweden"
`;
}
