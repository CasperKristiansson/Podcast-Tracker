import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  type QueryCommandInput,
  type QueryCommandOutput,
} from "@aws-sdk/lib-dynamodb";

interface AppSyncEvent {
  identity?: { sub?: string } | null;
}

interface SubscriptionRecord {
  showId: string;
  title: string;
  publisher: string;
  image: string;
  addedAt: string;
  totalEpisodes: number;
  subscriptionSyncedAt?: string | null;
  ratingStars?: number | null;
  ratingReview?: string | null;
  ratingUpdatedAt?: string | null;
}

interface ProgressRecord {
  showId?: string | null;
  completed?: boolean | null;
}

interface ProfileShow {
  showId: string;
  title: string;
  publisher: string;
  image: string;
  addedAt: string;
  totalEpisodes: number;
  completedEpisodes: number;
  inProgressEpisodes: number;
  unlistenedEpisodes: number;
  subscriptionSyncedAt?: string | null;
  ratingStars?: number | null;
  ratingReview?: string | null;
  ratingUpdatedAt?: string | null;
}

interface ProfileStats {
  totalShows: number;
  episodesCompleted: number;
  episodesInProgress: number;
}

interface ProfilePayload {
  stats: ProfileStats;
  spotlight: ProfileShow[];
  shows: ProfileShow[];
}

const tableName = requiredEnv("TABLE_NAME");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

export const handler = async (event: AppSyncEvent): Promise<ProfilePayload> => {
  const userSub = event.identity?.sub;
  if (!userSub) {
    throw new Error("Unauthorized");
  }

  const userPk = `user#${userSub}`;
  const subscriptions = await loadSubscriptions(userPk);
  const progresses = await loadProgress(userPk);

  const { shows, stats } = buildProfile(subscriptions, progresses);

  const spotlight = shows
    .filter((show) => show.unlistenedEpisodes > 0)
    .sort((a, b) => {
      const aCompleted =
        typeof a.completedEpisodes === "number" &&
        Number.isFinite(a.completedEpisodes)
          ? a.completedEpisodes
          : 0;
      const bCompleted =
        typeof b.completedEpisodes === "number" &&
        Number.isFinite(b.completedEpisodes)
          ? b.completedEpisodes
          : 0;
      const aInProgress = aCompleted > 0;
      const bInProgress = bCompleted > 0;
      if (aInProgress !== bInProgress) {
        return aInProgress ? -1 : 1;
      }
      const unlistenedDelta = b.unlistenedEpisodes - a.unlistenedEpisodes;
      if (unlistenedDelta !== 0) {
        return unlistenedDelta;
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, 4);

  return {
    stats,
    spotlight,
    shows,
  };
};

async function loadSubscriptions(
  userPk: string
): Promise<SubscriptionRecord[]> {
  const items: SubscriptionRecord[] = [];
  let exclusiveStartKey: QueryCommandInput["ExclusiveStartKey"];

  do {
    const response = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :prefix)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
          "#title": "title",
          "#publisher": "publisher",
          "#image": "image",
          "#addedAt": "addedAt",
          "#totalEpisodes": "totalEpisodes",
          "#syncedAt": "subscriptionSyncedAt",
          "#showId": "showId",
          "#ratingStars": "ratingStars",
          "#ratingReview": "ratingReview",
          "#ratingUpdatedAt": "ratingUpdatedAt",
        },
        ExpressionAttributeValues: {
          ":pk": userPk,
          ":prefix": "sub#",
        },
        ProjectionExpression:
          "#showId, #title, #publisher, #image, #addedAt, #totalEpisodes, #syncedAt, #ratingStars, #ratingReview, #ratingUpdatedAt",
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    collectSubscriptionRecords(response, items);
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

async function loadProgress(userPk: string): Promise<ProgressRecord[]> {
  const items: ProgressRecord[] = [];
  let exclusiveStartKey: QueryCommandInput["ExclusiveStartKey"];

  do {
    const response = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :prefix)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
          "#showId": "showId",
          "#completed": "completed",
        },
        ExpressionAttributeValues: {
          ":pk": userPk,
          ":prefix": "ep#",
        },
        ProjectionExpression: "#showId, #completed",
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    collectProgressRecords(response, items);
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

function collectSubscriptionRecords(
  response: QueryCommandOutput,
  target: SubscriptionRecord[]
): void {
  for (const item of response.Items ?? []) {
    const record = toSubscriptionRecord(item);
    if (record) {
      target.push(record);
    }
  }
}

function collectProgressRecords(
  response: QueryCommandOutput,
  target: ProgressRecord[]
): void {
  for (const item of response.Items ?? []) {
    target.push({
      showId: typeof item.showId === "string" ? item.showId : null,
      completed: typeof item.completed === "boolean" ? item.completed : null,
    });
  }
}

function toSubscriptionRecord(
  item: Record<string, unknown>
): SubscriptionRecord | null {
  const showId = typeof item.showId === "string" ? item.showId : null;
  const title = typeof item.title === "string" ? item.title : "";
  const publisher = typeof item.publisher === "string" ? item.publisher : "";
  const image = typeof item.image === "string" ? item.image : "";
  const addedAt =
    typeof item.addedAt === "string" ? item.addedAt : new Date().toISOString();
  const totalEpisodes =
    typeof item.totalEpisodes === "number" &&
    Number.isFinite(item.totalEpisodes)
      ? Math.max(0, Math.trunc(item.totalEpisodes))
      : 0;
  const subscriptionSyncedAt =
    typeof item.subscriptionSyncedAt === "string"
      ? item.subscriptionSyncedAt
      : null;
  const ratingStars =
    typeof item.ratingStars === "number" && Number.isFinite(item.ratingStars)
      ? Math.trunc(item.ratingStars)
      : null;
  const ratingReview =
    typeof item.ratingReview === "string" ? item.ratingReview : null;
  const ratingUpdatedAt =
    typeof item.ratingUpdatedAt === "string" ? item.ratingUpdatedAt : null;

  if (!showId) {
    return null;
  }

  return {
    showId,
    title,
    publisher,
    image,
    addedAt,
    totalEpisodes,
    subscriptionSyncedAt,
    ratingStars,
    ratingReview,
    ratingUpdatedAt,
  };
}

function buildProfile(
  subscriptions: SubscriptionRecord[],
  progresses: ProgressRecord[]
): { shows: ProfileShow[]; stats: ProfileStats } {
  const stats: ProfileStats = {
    totalShows: subscriptions.length,
    episodesCompleted: 0,
    episodesInProgress: 0,
  };

  const progressMap = new Map<
    string,
    { completed: number; inProgress: number }
  >();
  const subscribedShows = new Set(
    subscriptions.map((subscription) => subscription.showId)
  );

  for (const item of progresses) {
    if (!item.showId || !subscribedShows.has(item.showId)) {
      continue;
    }
    const bucket = progressMap.get(item.showId) ?? {
      completed: 0,
      inProgress: 0,
    };
    if (item.completed) {
      bucket.completed += 1;
      stats.episodesCompleted += 1;
    } else if (item.completed === false) {
      bucket.inProgress += 1;
      stats.episodesInProgress += 1;
    }
    progressMap.set(item.showId, bucket);
  }

  const shows: ProfileShow[] = subscriptions
    .map((subscription) => {
      const progress = progressMap.get(subscription.showId) ?? {
        completed: 0,
        inProgress: 0,
      };
      const unlistened = Math.max(
        subscription.totalEpisodes - progress.completed,
        0
      );
      return {
        showId: subscription.showId,
        title: subscription.title,
        publisher: subscription.publisher,
        image: subscription.image,
        addedAt: subscription.addedAt,
        totalEpisodes: subscription.totalEpisodes,
        completedEpisodes: progress.completed,
        inProgressEpisodes: progress.inProgress,
        unlistenedEpisodes: unlistened,
        subscriptionSyncedAt: subscription.subscriptionSyncedAt ?? null,
        ratingStars: subscription.ratingStars ?? null,
        ratingReview: subscription.ratingReview ?? null,
        ratingUpdatedAt: subscription.ratingUpdatedAt ?? null,
      };
    })
    .sort((a, b) => {
      if (a.unlistenedEpisodes !== b.unlistenedEpisodes) {
        return b.unlistenedEpisodes - a.unlistenedEpisodes;
      }
      if (a.completedEpisodes !== b.completedEpisodes) {
        return b.completedEpisodes - a.completedEpisodes;
      }
      return a.title.localeCompare(b.title);
    });

  return { shows, stats };
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

export const __internal = {
  loadSubscriptions,
  loadProgress,
  collectSubscriptionRecords,
  collectProgressRecords,
  toSubscriptionRecord,
  buildProfile,
  requiredEnv,
};
