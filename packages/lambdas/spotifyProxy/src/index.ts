import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { createHash } from "node:crypto";

interface AppSyncEvent {
  info: { fieldName: string };
  arguments: Record<string, unknown>;
}

interface CachedItem<T> {
  value: T;
}

const tableName = requiredEnv("TABLE_NAME");
const clientIdParam = requiredEnv("SPOTIFY_CLIENT_ID_PARAM");
const clientSecretParam = requiredEnv("SPOTIFY_CLIENT_SECRET_PARAM");
const defaultMarket = process.env.SPOTIFY_MARKET ?? "US";

const ssm = new SSMClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const parameterCache = new Map<string, string>();
let cachedToken: { token: string; expiresAt: number } | null = null;

const CACHE_TTLS = {
  searchShows: 300,
  getShow: 3600,
  getEpisodes: 600,
} as const;

const SPOTIFY_BASE = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const MAX_RETRIES = 3;

export const handler = async (event: AppSyncEvent) => {
  const field = event.info.fieldName;

  switch (field) {
    case "search":
    case "searchShows":
    case "searchSpotify": {
      const args = event.arguments as {
        term?: string;
        limit?: number;
        offset?: number;
      };
      const term = args.term?.trim();
      if (!term) {
        throw new Error("term is required");
      }

      return getCachedValueOrFetch(
        createCacheKey("search", args),
        CACHE_TTLS.searchShows,
        () => searchShows(term, args.limit, args.offset)
      );
    }
    case "show":
    case "getShow": {
      const args = event.arguments as { showId?: string };
      const showId = args.showId?.trim();
      if (!showId) {
        throw new Error("showId is required");
      }

      return getCachedValueOrFetch(
        createCacheKey("show", args),
        CACHE_TTLS.getShow,
        () => getShow(showId)
      );
    }
    case "getEpisodes":
    case "getShowEpisodes": {
      const args = event.arguments as {
        showId?: string;
        limit?: number;
        cursor?: string;
      };
      const showId = args.showId?.trim();
      if (!showId) {
        throw new Error("showId is required");
      }
      return getCachedValueOrFetch(
        createCacheKey("episodes", args),
        CACHE_TTLS.getEpisodes,
        () => getEpisodes(showId, args.limit, args.cursor)
      );
    }
    default:
      throw new Error(`Unsupported field ${field}`);
  }
};

async function searchShows(term: string, limit = 20, offset = 0) {
  const params = new URLSearchParams({
    q: term,
    type: "show",
    market: defaultMarket,
    limit: limit.toString(),
    offset: offset.toString(),
  }).toString();

  const data = await spotifyFetch<{
    shows: { items: SpotifyShow[]; next?: string };
  }>(`/search?${params}`);
  const shows = data.shows?.items ?? [];

  return {
    items: shows.map(mapShow),
  };
}

async function getShow(showId: string) {
  const show = await spotifyFetch<SpotifyShow>(
    `/shows/${encodeURIComponent(showId)}?market=${defaultMarket}`
  );
  return mapShow(show);
}

async function getEpisodes(showId: string, limit = 20, cursor?: string) {
  const params = new URLSearchParams({
    market: defaultMarket,
    limit: Math.min(limit, 50).toString(),
  });
  if (cursor) {
    params.set("offset", cursor);
  }

  const data = await spotifyFetch<SpotifyEpisodesResponse>(
    `/shows/${encodeURIComponent(showId)}/episodes?${params.toString()}`
  );

  return {
    items: (data.items ?? []).map(mapEpisode),
    nextCursor: data.next
      ? new URL(data.next).searchParams.get("offset")
      : null,
  };
}

async function getCachedValueOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getCachedValue<T>(key);
  if (cached) {
    return cached;
  }

  const value = await fetcher();
  await setCachedValue(key, value, ttlSeconds);
  return value;
}

async function getCachedValue<T>(key: string): Promise<T | null> {
  const result = await dynamo.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: cachePk(key), sk: "spotify" },
    })
  );

  const item = result.Item as
    | (CachedItem<T> & { expiresAt?: number })
    | undefined;
  if (!item || !item.value) {
    return null;
  }

  if (item.expiresAt && item.expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return item.value;
}

async function setCachedValue<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: cachePk(key),
        sk: "spotify",
        value,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
        updatedAt: new Date().toISOString(),
      },
    })
  );
}

async function spotifyFetch<T>(pathAndQuery: string, attempt = 0): Promise<T> {
  const token = await getSpotifyToken();
  const response = await fetchWithRetry(
    `${SPOTIFY_BASE}${pathAndQuery}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    attempt
  );

  const data = (await response.json()) as T;
  return data;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempt = 0
): Promise<Response> {
  const response = await fetch(url, init);

  if (response.status === 401 && attempt < MAX_RETRIES) {
    cachedToken = null;
    return fetchWithRetry(url, init, attempt + 1);
  }

  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfter =
      Number(response.headers.get("retry-after")) || Math.pow(2, attempt + 1);
    await delay(retryAfter * 1000);
    return fetchWithRetry(url, init, attempt + 1);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Spotify request failed (${response.status}): ${body}`);
  }

  return response;
}

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const [clientId, clientSecret] = await Promise.all([
    getParameter(clientIdParam),
    getParameter(clientSecretParam),
  ]);

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const response = await fetchWithRetry(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  if (!payload.access_token) {
    throw new Error("Missing access token in Spotify response");
  }

  cachedToken = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(payload.expires_in - 60, 60) * 1000,
  };

  return cachedToken.token;
}

async function getParameter(name: string): Promise<string> {
  const cached = parameterCache.get(name);
  if (cached) {
    return cached;
  }

  const result = await ssm.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    })
  );

  const value = result.Parameter?.Value;
  if (!value) {
    throw new Error(`Parameter ${name} not found`);
  }

  parameterCache.set(name, value);
  return value;
}

function cachePk(key: string): string {
  return `cache#${key}`;
}

function createCacheKey(field: string, args: Record<string, unknown>): string {
  const hash = createHash("sha256").update(JSON.stringify(args)).digest("hex");
  return `${field}:${hash}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapShow(show: SpotifyShow) {
  return {
    id: show.id,
    title: show.name,
    publisher: show.publisher,
    description: show.description,
    htmlDescription: show.html_description ?? null,
    image: show.images?.[0]?.url ?? null,
    totalEpisodes: show.total_episodes ?? 0,
    externalUrl: show.external_urls?.spotify ?? null,
    categories: show.genres ?? [],
    explicit: show.explicit ?? null,
    languages: show.languages ?? [],
    availableMarkets: show.available_markets ?? [],
    mediaType: show.media_type ?? null,
  };
}

function mapEpisode(episode: SpotifyEpisode) {
  const derivedShowId = episode.show?.id ?? episode.id.split(":")[0];

  return {
    id: episode.id,
    showId: derivedShowId ?? /* c8 ignore next */ null,
    title: episode.name,
    description: episode.description,
    htmlDescription: episode.html_description ?? null,
    audioUrl:
      episode.audio_preview_url ?? episode.external_urls?.spotify ?? null,
    image: episode.images?.[0]?.url ?? null,
    linkUrl: episode.external_urls?.spotify ?? null,
    publishedAt: episode.release_date,
    durationSec: Math.round((episode.duration_ms ?? 0) / 1000),
    explicit: episode.explicit ?? null,
    isExternallyHosted: episode.is_externally_hosted ?? null,
    isPlayable: episode.is_playable ?? null,
    releaseDatePrecision: episode.release_date_precision ?? null,
    languages:
      episode.languages ?? (episode.language ? [episode.language] : []),
  };
}

interface SpotifyImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  description: string;
  html_description?: string;
  images?: SpotifyImage[];
  total_episodes?: number;
  external_urls?: Record<string, string>;
  genres?: string[];
  explicit?: boolean;
  languages?: string[];
  available_markets?: string[];
  media_type?: string;
}

interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  html_description?: string;
  audio_preview_url?: string | null;
  external_urls?: { spotify?: string };
  release_date: string;
  duration_ms?: number;
  show?: { id: string };
  images?: SpotifyImage[];
  explicit?: boolean;
  is_externally_hosted?: boolean;
  is_playable?: boolean;
  release_date_precision?: string;
  languages?: string[];
  language?: string;
}

interface SpotifyEpisodesResponse {
  items: SpotifyEpisode[];
  next?: string | null;
}

export const __internal = {
  getCachedValueOrFetch,
  getCachedValue,
  setCachedValue,
  cachePk,
  createCacheKey,
  searchShows,
  getShow,
  getEpisodes,
  getSpotifyToken,
  getParameter,
  fetchWithRetry,
  delay,
  mapShow,
  mapEpisode,
  resetCaches: () => {
    cachedToken = null;
    parameterCache.clear();
  },
  setCachedToken: (token: { token: string; expiresAt: number } | null) => {
    cachedToken = token;
  },
  getCachedToken: () => cachedToken,
  requiredEnv,
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}
