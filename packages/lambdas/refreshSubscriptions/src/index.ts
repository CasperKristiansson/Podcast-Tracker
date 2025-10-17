import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  type ScanCommandInput,
  type ScanCommandOutput,
  type UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { __internal as spotifyInternal } from "../../spotifyProxy/src/index.js";

interface SubscriptionRecord {
  pk: string;
  sk: string;
  showId: string;
}

interface RefreshSummary {
  subscriptionsProcessed: number;
  uniqueShowsProcessed: number;
  updatesApplied: number;
  skippedUpdates: number;
  syncedAt: string | null;
}

interface UpdateOutcome {
  applied: number;
  skipped: number;
}

type ShowSummary = Awaited<ReturnType<typeof spotifyInternal.getShow>>;

const tableName = requiredEnv("TABLE_NAME");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const SUBSCRIPTION_PREFIX = "sub#";

export const handler = async (): Promise<RefreshSummary> => {
  const subscriptions = await loadAllSubscriptions();

  if (subscriptions.length === 0) {
    return {
      subscriptionsProcessed: 0,
      uniqueShowsProcessed: 0,
      updatesApplied: 0,
      skippedUpdates: 0,
      syncedAt: null,
    };
  }

  const grouped = groupByShowId(subscriptions);
  const syncedAt = new Date().toISOString();

  let updatesApplied = 0;
  let skippedUpdates = 0;

  for (const [showId, records] of grouped) {
    const show = await spotifyInternal.getShow(showId);
    const totalEpisodes = normalizeTotalEpisodes(show.totalEpisodes);
    const outcome = await updateSubscriptionsForShow(
      records,
      show,
      totalEpisodes,
      syncedAt
    );
    updatesApplied += outcome.applied;
    skippedUpdates += outcome.skipped;
  }

  return {
    subscriptionsProcessed: subscriptions.length,
    uniqueShowsProcessed: grouped.size,
    updatesApplied,
    skippedUpdates,
    syncedAt,
  };
};

async function loadAllSubscriptions(): Promise<SubscriptionRecord[]> {
  const records: SubscriptionRecord[] = [];
  let exclusiveStartKey: ScanCommandInput["ExclusiveStartKey"];

  do {
    const response = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: exclusiveStartKey,
        ProjectionExpression: "#pk, #sk, showId",
        FilterExpression:
          "dataType = :subscription AND begins_with(#sk, :prefix)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":subscription": "subscription",
          ":prefix": SUBSCRIPTION_PREFIX,
        },
      })
    );

    collectSubscriptionRecords(response, records);
    exclusiveStartKey = response.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return records;
}

function collectSubscriptionRecords(
  response: ScanCommandOutput,
  records: SubscriptionRecord[]
): void {
  for (const item of response.Items ?? []) {
    const record = toSubscriptionRecord(item);
    if (record) {
      records.push(record);
    }
  }
}

function toSubscriptionRecord(
  item: Record<string, unknown>
): SubscriptionRecord | null {
  const { pk, sk, showId } = item;
  if (
    typeof pk !== "string" ||
    typeof sk !== "string" ||
    typeof showId !== "string"
  ) {
    return null;
  }
  return { pk, sk, showId };
}

function groupByShowId(
  records: SubscriptionRecord[]
): Map<string, SubscriptionRecord[]> {
  const grouped = new Map<string, SubscriptionRecord[]>();
  for (const record of records) {
    const list = grouped.get(record.showId);
    if (list) {
      list.push(record);
    } else {
      grouped.set(record.showId, [record]);
    }
  }
  return grouped;
}

async function updateSubscriptionsForShow(
  subscriptions: SubscriptionRecord[],
  show: ShowSummary,
  totalEpisodes: number,
  syncedAt: string
): Promise<UpdateOutcome> {
  let applied = 0;
  let skipped = 0;

  const updateExpression =
    "SET #title = :title, #publisher = :publisher, #image = :image, #totalEpisodes = :totalEpisodes, #syncedAt = :syncedAt";
  const attributeNames = {
    "#title": "title",
    "#publisher": "publisher",
    "#image": "image",
    "#totalEpisodes": "totalEpisodes",
    "#syncedAt": "subscriptionSyncedAt",
  };

  for (const subscription of subscriptions) {
    const titleValue =
      typeof show.title === "string" && show.title.trim().length > 0
        ? show.title
        : show.id;
    const publisherValue =
      typeof show.publisher === "string" && show.publisher.trim().length > 0
        ? show.publisher
        : "";
    const imageValue =
      typeof show.image === "string" && show.image.length > 0 ? show.image : "";

    const params: UpdateCommandInput = {
      TableName: tableName,
      Key: {
        pk: subscription.pk,
        sk: subscription.sk,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: attributeNames,
      ExpressionAttributeValues: {
        ":title": titleValue,
        ":publisher": publisherValue,
        ":image": imageValue,
        ":totalEpisodes": totalEpisodes,
        ":syncedAt": syncedAt,
      },
      ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
    };

    try {
      await dynamo.send(new UpdateCommand(params));
      applied += 1;
    } catch (error) {
      if (
        (error as { name?: string }).name === "ConditionalCheckFailedException"
      ) {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return { applied, skipped };
}

function normalizeTotalEpisodes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  return 0;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

export const __internal = {
  loadAllSubscriptions,
  collectSubscriptionRecords,
  toSubscriptionRecord,
  groupByShowId,
  updateSubscriptionsForShow,
  normalizeTotalEpisodes,
  requiredEnv,
};
