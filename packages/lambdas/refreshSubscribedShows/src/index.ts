import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { createHash } from "node:crypto";
import type { NativeAttributeValue } from "@aws-sdk/util-dynamodb";

interface SchedulerEvent {
  readonly time?: string;
  readonly id?: string;
  readonly "detail-type"?: string;
}

interface SubscriptionItem {
  pk: string;
  sk: string;
  showId: string;
  title?: string;
  publisher?: string;
  image?: string;
}

interface SpotifyEpisodesResponse {
  items?: SpotifyEpisode[];
  next?: string | null;
}

interface SpotifyEpisode {
  id: string;
  name: string;
  description?: string;
  audio_preview_url?: string | null;
  external_urls?: { spotify?: string };
  release_date: string;
  duration_ms?: number;
}

const tableName = requiredEnv("TABLE_NAME");
const clientIdParam = requiredEnv("SPOTIFY_CLIENT_ID_PARAM");
const clientSecretParam = requiredEnv("SPOTIFY_CLIENT_SECRET_PARAM");
const defaultMarket = process.env.SPOTIFY_MARKET ?? "US";
const maxPages = Number.parseInt(
  process.env.SPOTIFY_REFRESH_MAX_PAGES ?? "2",
  10
);
const pageSize = 50;

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const ssm = new SSMClient({});

const parameterCache = new Map<string, string>();
let cachedToken: { token: string; expiresAt: number } | null = null;

const MAX_RETRIES = 3;

export const handler = async (event: SchedulerEvent = {}) => {
  const start = Date.now();
  console.log("Refresh job invoked", { id: event.id, time: event.time });

  const subscriptions = await loadSubscriptions();
  if (subscriptions.length === 0) {
    console.log("No subscriptions found; exiting early");
    return {
      showsProcessed: 0,
      episodesUpserted: 0,
      durationMs: Date.now() - start,
    };
  }

  const shows = collateShows(subscriptions);
  let totalEpisodesUpserted = 0;

  for (const [showId, subscription] of shows) {
    const existingEpisodeIds = await listEpisodeIds(showId);
    const episodes = await fetchRecentEpisodes(showId);
    const newEpisodes = episodes.filter(
      (episode) => !existingEpisodeIds.has(episode.id)
    );

    if (newEpisodes.length === 0) {
      console.log("No new episodes for show", { showId });
      await upsertShowMetadata(subscription, episodes);
      continue;
    }

    await upsertEpisodes(showId, newEpisodes);
    await upsertShowMetadata(subscription, episodes);

    totalEpisodesUpserted += newEpisodes.length;
    console.log("Upserted episodes for show", {
      showId,
      count: newEpisodes.length,
    });
  }

  const durationMs = Date.now() - start;
  console.log("Refresh job complete", {
    showsProcessed: shows.size,
    episodesUpserted: totalEpisodesUpserted,
    durationMs,
  });

  return {
    showsProcessed: shows.size,
    episodesUpserted: totalEpisodesUpserted,
    durationMs,
  };
};

async function loadSubscriptions(): Promise<SubscriptionItem[]> {
  const subscriptions: SubscriptionItem[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "#dataType = :subscription",
        ExpressionAttributeNames: {
          "#dataType": "dataType",
        },
        ExpressionAttributeValues: {
          ":subscription": "subscription",
        },
        ProjectionExpression: "pk, sk, showId, title, publisher, image",
        ExclusiveStartKey,
      })
    );

    if (result.Items) {
      for (const item of result.Items) {
        if (typeof item.showId === "string") {
          subscriptions.push({
            pk: String(item.pk),
            sk: String(item.sk),
            showId: item.showId,
            title: typeof item.title === "string" ? item.title : undefined,
            publisher:
              typeof item.publisher === "string" ? item.publisher : undefined,
            image: typeof item.image === "string" ? item.image : undefined,
          });
        }
      }
    }

    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return subscriptions;
}

function collateShows(
  subscriptions: SubscriptionItem[]
): Map<string, SubscriptionItem> {
  const shows = new Map<string, SubscriptionItem>();
  for (const subscription of subscriptions) {
    if (!shows.has(subscription.showId)) {
      shows.set(subscription.showId, subscription);
    }
  }
  return shows;
}

async function listEpisodeIds(showId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let ExclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: {
          ":pk": `show#${showId}`,
          ":sk": "ep#",
        },
        ProjectionExpression: "episodeId",
        ExclusiveStartKey,
      })
    );

    if (result.Items) {
      for (const item of result.Items) {
        if (typeof item.episodeId === "string") {
          ids.add(item.episodeId);
        }
      }
    }

    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return ids;
}

async function fetchRecentEpisodes(showId: string): Promise<SpotifyEpisode[]> {
  const collected: SpotifyEpisode[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const params = new URLSearchParams({
      market: defaultMarket,
      limit: String(pageSize),
      offset: String(offset),
    });

    const data = await spotifyFetch<SpotifyEpisodesResponse>(
      `/shows/${encodeURIComponent(showId)}/episodes?${params.toString()}`
    );

    if (data.items?.length) {
      collected.push(...data.items);
    }

    if (!data.next || !data.items?.length) {
      break;
    }
  }

  return collected;
}

type DynamoItem = Record<string, NativeAttributeValue>;

async function upsertEpisodes(
  showId: string,
  episodes: SpotifyEpisode[]
): Promise<void> {
  if (episodes.length === 0) {
    return;
  }

  const items = episodes.map((episode) => mapEpisode(showId, episode));
  await batchWrite(items);
}

async function upsertShowMetadata(
  subscription: SubscriptionItem,
  episodes: SpotifyEpisode[]
): Promise<void> {
  const latestEpisode = episodes[0];
  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `show#${subscription.showId}`,
        sk: "meta",
        dataType: "show",
        showId: subscription.showId,
        title: subscription.title ?? "",
        publisher: subscription.publisher ?? "",
        image: subscription.image ?? null,
        lastRefreshedAt: new Date().toISOString(),
        lastEpisodePublishedAt: latestEpisode?.release_date ?? null,
        infoHash: createInfoHash(subscription),
      },
    })
  );
}

function mapEpisode(showId: string, episode: SpotifyEpisode): DynamoItem {
  return {
    pk: `show#${showId}`,
    sk: `ep#${episode.id}`,
    dataType: "episode",
    showId,
    episodeId: episode.id,
    title: episode.name,
    description: episode.description ?? null,
    audioUrl: resolveAudioUrl(episode),
    publishedAt: episode.release_date,
    durationSec: Math.round((episode.duration_ms ?? 0) / 1000),
    updatedAt: new Date().toISOString(),
  };
}

function resolveAudioUrl(episode: SpotifyEpisode): string {
  return episode.audio_preview_url ?? episode.external_urls?.spotify ?? "";
}

async function batchWrite(items: DynamoItem[]): Promise<void> {
  const queue = [...items];

  while (queue.length > 0) {
    const chunk = queue.splice(0, 25);
    let attempt = 0;
    let pending = chunk;

    do {
      const response = await dynamo.send(
        new BatchWriteCommand({
          RequestItems: {
            [tableName]: pending.map((item) => ({
              PutRequest: { Item: item },
            })),
          },
        })
      );

      const unprocessed = response.UnprocessedItems?.[tableName] ?? [];
      if (unprocessed.length === 0) {
        break;
      }

      attempt += 1;
      const delayMs = Math.min(50 * 2 ** attempt, 2000);
      await delay(delayMs);
      pending = unprocessed
        .map((request) => request.PutRequest?.Item)
        .filter((item): item is DynamoItem => item !== undefined);
    } while (pending.length > 0);
  }
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

  return (await response.json()) as T;
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

function createInfoHash(subscription: SubscriptionItem): string {
  const payload = JSON.stringify({
    title: subscription.title ?? null,
    publisher: subscription.publisher ?? null,
    image: subscription.image ?? null,
  });

  return createHash("sha256").update(payload).digest("hex");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SPOTIFY_BASE = "https://api.spotify.com/v1";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}
