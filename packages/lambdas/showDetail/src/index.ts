import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

interface AppSyncEvent {
  identity?: { sub?: string | null } | null;
  arguments: {
    showId?: string | null;
    episodeLimit?: number | null;
    episodeCursor?: string | null;
    progressEpisodeIds?: string[] | null;
  };
}

interface ShowDetailResponse {
  show: ShowSummary;
  subscription: SubscriptionRecord | null;
  episodes: EpisodesResult;
  progress: ProgressRecord[];
}

interface ShowSummary {
  id: string;
  title: string | null;
  publisher: string | null;
  description: string | null;
  htmlDescription: string | null;
  image: string | null;
  totalEpisodes: number | null;
  externalUrl: string | null;
  categories: string[];
  explicit: boolean | null;
  languages: string[];
  availableMarkets: string[];
  mediaType: string | null;
  isSubscribed: boolean;
}

interface EpisodesResult {
  items: EpisodeRecord[];
  nextToken: string | null;
}

interface EpisodeRecord {
  episodeId: string;
  showId: string | null;
  title: string | null;
  audioUrl: string | null;
  publishedAt: string | null;
  durationSec: number | null;
  description: string | null;
  htmlDescription: string | null;
  image: string | null;
  linkUrl: string | null;
  explicit: boolean | null;
  isExternallyHosted: boolean | null;
  isPlayable: boolean | null;
  releaseDatePrecision: string | null;
  languages: string[];
}

interface SubscriptionRecord {
  showId: string;
  title: string;
  publisher: string;
  image: string;
  addedAt: string;
  totalEpisodes: number;
  subscriptionSyncedAt: string | null;
  ratingStars: number | null;
  ratingReview: string | null;
  ratingUpdatedAt: string | null;
}

interface ProgressRecord {
  episodeId: string;
  positionSec: number;
  completed: boolean;
  updatedAt: string;
  showId: string | null;
}

const tableName = requiredEnv("TABLE_NAME");
const spotifyProxyFunctionName = requiredEnv("SPOTIFY_PROXY_FUNCTION_NAME");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const lambdaClient = new LambdaClient({});

export const handler = async (
  event: AppSyncEvent
): Promise<ShowDetailResponse> => {
  const userSub = event.identity?.sub?.trim();
  if (!userSub) {
    throw new Error("Unauthorized");
  }

  const showId = event.arguments.showId?.trim();
  if (!showId) {
    throw new Error("showId is required");
  }

  const episodeLimit = normalizeLimit(event.arguments.episodeLimit);
  const episodeCursor = normalizeCursor(event.arguments.episodeCursor);
  const requestedProgressIds = normalizeEpisodeIds(
    event.arguments.progressEpisodeIds
  );

  const [show, episodes, subscription] = await Promise.all([
    fetchShow(showId),
    episodeLimit === 0 && !episodeCursor
      ? emptyEpisodes()
      : fetchEpisodes(showId, episodeLimit, episodeCursor),
    loadSubscription(userSub, showId),
  ]);

  const episodeIds = new Set<string>();
  for (const item of episodes.items ?? []) {
    if (item?.episodeId) {
      episodeIds.add(item.episodeId);
    }
  }
  for (const id of requestedProgressIds) {
    episodeIds.add(id);
  }

  const progress = episodeIds.size
    ? await loadProgress(userSub, Array.from(episodeIds))
    : [];

  return {
    show: {
      ...show,
      isSubscribed: Boolean(subscription),
    },
    subscription,
    episodes,
    progress,
  };
};

async function fetchShow(showId: string): Promise<ShowSummary> {
  const payload = {
    info: { fieldName: "show" },
    arguments: { showId },
  };

  const response = await invokeSpotifyProxy(payload);
  if (!response || typeof response !== "object") {
    throw new Error("Invalid show response from Spotify proxy");
  }

  const show = response as Record<string, unknown>;
  return {
    id: String(show.id ?? showId),
    title: nullableString(show.title),
    publisher: nullableString(show.publisher),
    description: nullableString(show.description),
    htmlDescription: nullableString(show.htmlDescription),
    image: nullableString(show.image),
    totalEpisodes: nullableNumber(show.totalEpisodes),
    externalUrl: nullableString(show.externalUrl),
    categories: Array.isArray(show.categories)
      ? (show.categories as unknown[])
          .map((value) => nullableString(value))
          .filter(isNonEmptyString)
      : [],
    explicit: nullableBoolean(show.explicit),
    languages: Array.isArray(show.languages)
      ? (show.languages as unknown[])
          .map((value) => nullableString(value))
          .filter(isNonEmptyString)
      : [],
    availableMarkets: Array.isArray(show.availableMarkets)
      ? (show.availableMarkets as unknown[])
          .map((value) => nullableString(value))
          .filter(isNonEmptyString)
      : [],
    mediaType: nullableString(show.mediaType),
    isSubscribed: Boolean(show.isSubscribed),
  };
}

async function fetchEpisodes(
  showId: string,
  limit: number,
  cursor: string | null
): Promise<EpisodesResult> {
  const payload = {
    info: { fieldName: "episodes" },
    arguments: {
      showId,
      limit,
      cursor: cursor ?? undefined,
    },
  };

  const response = await invokeSpotifyProxy(payload);
  if (
    !response ||
    typeof response !== "object" ||
    !("items" in response)
  ) {
    throw new Error("Invalid episodes response from Spotify proxy");
  }

  const record = response as { items?: unknown[]; nextToken?: unknown };
  const items = Array.isArray(record.items) ? record.items : [];

  return {
    items: items
      .map((item) => mapEpisode(item))
      .filter(
        (episode): episode is EpisodeRecord =>
          Boolean(episode?.episodeId?.length)
      ),
    nextToken: nullableString(record.nextToken),
  };
}

async function loadSubscription(
  userSub: string,
  showId: string
): Promise<SubscriptionRecord | null> {
  const response = await dynamo.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: `user#${userSub}`,
        sk: `sub#${showId}`,
      },
    })
  );

  const item = response.Item;
  if (!item) {
    return null;
  }

  const showIdValue = nullableString(item.showId);
  if (!showIdValue) {
    return null;
  }

  return {
    showId: showIdValue,
    title: nullableString(item.title) ?? "",
    publisher: nullableString(item.publisher) ?? "",
    image: nullableString(item.image) ?? "",
    addedAt:
      nullableString(item.addedAt) ?? new Date().toISOString(),
    totalEpisodes: Math.max(0, Math.trunc(Number(item.totalEpisodes ?? 0))),
    subscriptionSyncedAt: nullableString(item.subscriptionSyncedAt),
    ratingStars: nullableNumber(item.ratingStars),
    ratingReview: nullableString(item.ratingReview),
    ratingUpdatedAt: nullableString(item.ratingUpdatedAt),
  };
}

async function loadProgress(
  userSub: string,
  episodeIds: string[]
): Promise<ProgressRecord[]> {
  if (episodeIds.length === 0) {
    return [];
  }

  const keys = episodeIds.map((episodeId) => ({
    pk: `user#${userSub}`,
    sk: `ep#${episodeId}`,
  }));

  const uniqueKeys = dedupeKeys(keys);
  const progressItems: ProgressRecord[] = [];

  for (let i = 0; i < uniqueKeys.length; i += 100) {
    const batch = uniqueKeys.slice(i, i + 100);

    const response = await dynamo.send(
      new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: batch,
          },
        },
      })
    );

    const items = response.Responses?.[tableName] ?? [];
    for (const item of items) {
      const record = mapProgress(item);
      if (record) {
        progressItems.push(record);
      }
    }
  }

  const seen = new Set<string>();
  const deduped: ProgressRecord[] = [];
  for (const record of progressItems) {
    if (seen.has(record.episodeId)) {
      continue;
    }
    seen.add(record.episodeId);
    deduped.push(record);
  }

  return deduped;
}

async function invokeSpotifyProxy(payload: unknown): Promise<unknown> {
  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: spotifyProxyFunctionName,
      Payload: Buffer.from(JSON.stringify(payload)),
    })
  );

  if (!response.Payload) {
    throw new Error("Spotify proxy invocation returned empty payload");
  }

  const decoded = new TextDecoder().decode(response.Payload);
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("Spotify proxy payload could not be parsed");
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    "errorMessage" in parsed &&
    typeof (parsed as { errorMessage: unknown }).errorMessage === "string"
  ) {
    throw new Error(
      `Spotify proxy error: ${(parsed as { errorMessage: string }).errorMessage}`
    );
  }

  return parsed;
}

function mapEpisode(item: unknown): EpisodeRecord | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const episodeId = nullableString(
    record.episodeId ?? record.id ?? record.SK ?? null
  );
  if (!episodeId) {
    return null;
  }

  const languages =
    Array.isArray(record.languages)
      ? record.languages
          .map((value) => nullableString(value))
          .filter(isNonEmptyString)
      : [];

  return {
    episodeId,
    showId: nullableString(record.showId),
    title: nullableString(record.title),
    audioUrl: nullableString(record.audioUrl),
    publishedAt: nullableString(record.publishedAt),
    durationSec: nullableNumber(record.durationSec),
    description: nullableString(record.description),
    htmlDescription: nullableString(record.htmlDescription),
    image: nullableString(record.image),
    linkUrl: nullableString(record.linkUrl),
    explicit: nullableBoolean(record.explicit),
    isExternallyHosted: nullableBoolean(record.isExternallyHosted),
    isPlayable: nullableBoolean(record.isPlayable),
    releaseDatePrecision: nullableString(record.releaseDatePrecision),
    languages,
  };
}

function mapProgress(item: Record<string, unknown>): ProgressRecord | null {
  const episodeId = nullableString(item.episodeId);
  const updatedAt = nullableString(item.updatedAt);
  if (!episodeId || !updatedAt) {
    return null;
  }

  const position = nullableNumber(item.positionSec);
  return {
    episodeId,
    positionSec: Number.isFinite(position) ? Number(position) : 0,
    completed: Boolean(item.completed),
    updatedAt,
    showId: nullableString(item.showId),
  };
}

function dedupeKeys(
  keys: Array<{ pk: string; sk: string }>
): Array<{ pk: string; sk: string }> {
  const seen = new Set<string>();
  const result: Array<{ pk: string; sk: string }> = [];
  for (const key of keys) {
    const composite = `${key.pk}|${key.sk}`;
    if (seen.has(composite)) {
      continue;
    }
    seen.add(composite);
    result.push(key);
  }
  return result;
}

function normalizeLimit(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 25;
  }
  if (value <= 0) {
    return 0;
  }
  return Math.min(50, Math.trunc(value));
}

function normalizeCursor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEpisodeIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(ids));
}

function emptyEpisodes(): EpisodesResult {
  return {
    items: [],
    nextToken: null,
  };
}

function nullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function nullableBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }
  return null;
}

function isNonEmptyString(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

export const __internal = {
  normalizeLimit,
  normalizeCursor,
  normalizeEpisodeIds,
  mapEpisode,
  mapProgress,
  requiredEnv,
};
