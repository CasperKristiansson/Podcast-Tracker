import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  DeleteCommand,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

interface AppSyncEvent {
  identity?: { sub?: string | null } | null;
  info?: { fieldName?: string | null } | null;
  arguments: {
    showId?: string | null;
    limit?: number | null;
  };
}

interface Episode {
  episodeId: string;
  durationSec?: number | null;
}

interface EpisodePage {
  items: Episode[];
  nextToken: string | null;
}

interface ProgressRecord {
  episodeId: string;
  completed: boolean;
}

interface ProgressResponse {
  episodeId: string;
  completed: boolean;
  updatedAt: string;
  showId: string;
}

const tableName = requiredEnv("TABLE_NAME");
const spotifyProxyFunctionName = requiredEnv("SPOTIFY_PROXY_FUNCTION_NAME");

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const lambdaClient = new LambdaClient({});

export const handler = async (
  event: AppSyncEvent
): Promise<ProgressResponse | ProgressResponse[] | boolean> => {
  const userSub = event.identity?.sub?.trim();
  if (!userSub) {
    throw new Error("Unauthorized");
  }

  const showId = event.arguments.showId?.trim();
  if (!showId) {
    throw new Error("showId is required");
  }

  const fieldName = event.info?.fieldName ?? "markNextEpisodeComplete";

  switch (fieldName) {
    case "unsubscribe":
      await handleUnsubscribe(userSub, showId);
      return true;
    case "markAllEpisodesComplete":
      return handleMarkAllEpisodesComplete(userSub, showId);
    case "markNextEpisodeComplete": {
      const limitArgument = event.arguments.limit;
      const limit =
        typeof limitArgument === "number" && Number.isFinite(limitArgument)
          ? Math.max(1, Math.trunc(limitArgument))
          : 25;
      return handleMarkNextEpisodeComplete(userSub, showId, limit);
    }
    default:
      throw new Error(`Unsupported field ${fieldName}`);
  }
};

async function handleMarkNextEpisodeComplete(
  userSub: string,
  showId: string,
  limit: number
): Promise<ProgressResponse> {
  const episodes = await fetchEpisodes(showId, limit);
  if (episodes.length === 0) {
    throw new Error("No episodes available for this show.");
  }

  const completedEpisodes = await loadCompletedEpisodes(userSub, showId);
  const completedSet = new Set(completedEpisodes.map((item) => item.episodeId));

  const nextEpisode = episodes.find(
    (episode) => !completedSet.has(episode.episodeId)
  );

  if (!nextEpisode) {
    throw new Error("You are already up to date on the latest episodes.");
  }

  const nowIso = new Date().toISOString();

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `user#${userSub}`,
        sk: `ep#${nextEpisode.episodeId}`,
        dataType: "progress",
        episodeId: nextEpisode.episodeId,
        completed: true,
        updatedAt: nowIso,
        showId,
      },
    })
  );

  return {
    episodeId: nextEpisode.episodeId,
    completed: true,
    updatedAt: nowIso,
    showId,
  };
}

async function handleMarkAllEpisodesComplete(
  userSub: string,
  showId: string
): Promise<ProgressResponse[]> {
  const episodes = await fetchAllEpisodes(showId);
  if (episodes.length === 0) {
    throw new Error("No episodes available for this show.");
  }

  const completedEpisodes = await loadCompletedEpisodes(userSub, showId);
  const completedSet = new Set(completedEpisodes.map((item) => item.episodeId));

  const updates: ProgressResponse[] = [];
  const writeRequests: {
    PutRequest: {
      Item: {
        pk: string;
        sk: string;
        dataType: string;
        episodeId: string;
        completed: boolean;
        updatedAt: string;
        showId: string;
      };
    };
  }[] = [];

  for (const episode of episodes) {
    if (completedSet.has(episode.episodeId)) {
      continue;
    }

    const updatedAt = new Date().toISOString();

    updates.push({
      episodeId: episode.episodeId,
      completed: true,
      updatedAt,
      showId,
    });

    writeRequests.push({
      PutRequest: {
        Item: {
          pk: `user#${userSub}`,
          sk: `ep#${episode.episodeId}`,
          dataType: "progress",
          episodeId: episode.episodeId,
          completed: true,
          updatedAt,
          showId,
        },
      },
    });
  }

  if (writeRequests.length === 0) {
    return [];
  }

  let index = 0;
  while (index < writeRequests.length) {
    const batch = writeRequests.slice(index, index + 25);
    index += 25;

    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch,
        },
      })
    );
  }

  return updates;
}

async function handleUnsubscribe(
  userSub: string,
  showId: string
): Promise<void> {
  const userPk = `user#${userSub}`;

  await dynamo.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        pk: userPk,
        sk: `sub#${showId}`,
      },
    })
  );

  const progressKeys = await loadProgressKeys(userSub, showId);
  if (progressKeys.length === 0) {
    return;
  }

  let index = 0;
  while (index < progressKeys.length) {
    const batch = progressKeys.slice(index, index + 25);
    index += 25;

    await dynamo.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((sk) => ({
            DeleteRequest: {
              Key: {
                pk: userPk,
                sk,
              },
            },
          })),
        },
      })
    );
  }
}

async function fetchEpisodes(
  showId: string,
  limit: number
): Promise<Episode[]> {
  const page = await fetchEpisodesPage(showId, limit);
  return page.items;
}

async function fetchAllEpisodes(showId: string): Promise<Episode[]> {
  const episodes: Episode[] = [];
  const seenEpisodeIds = new Set<string>();
  const seenTokens = new Set<string>();
  let cursor: string | null = null;
  let pageCount = 0;
  const MAX_PAGES = 200;

  while (pageCount < MAX_PAGES) {
    pageCount += 1;
    const { items, nextToken } = await fetchEpisodesPage(
      showId,
      50,
      cursor ?? undefined
    );

    for (const episode of items) {
      if (seenEpisodeIds.has(episode.episodeId)) {
        continue;
      }
      seenEpisodeIds.add(episode.episodeId);
      episodes.push(episode);
    }

    if (!nextToken || seenTokens.has(nextToken)) {
      break;
    }

    seenTokens.add(nextToken);
    cursor = nextToken;
  }

  return episodes;
}

async function fetchEpisodesPage(
  showId: string,
  limit: number,
  cursor?: string
): Promise<EpisodePage> {
  const args: Record<string, unknown> = { showId, limit };
  if (typeof cursor === "string" && cursor.length > 0) {
    args.cursor = cursor;
  }

  const payload = JSON.stringify({
    info: { fieldName: "episodes" },
    arguments: args,
  });

  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: spotifyProxyFunctionName,
      Payload: Buffer.from(payload),
    })
  );

  if (!response.Payload) {
    throw new Error("Failed to load episodes from Spotify.");
  }

  const decoded = new TextDecoder().decode(response.Payload);
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("Unable to parse episodes payload.");
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "errorMessage" in parsed &&
    typeof (parsed as Record<string, unknown>).errorMessage === "string"
  ) {
    throw new Error(
      `Failed to load episodes: ${(parsed as { errorMessage: string }).errorMessage}`
    );
  }

  const items = (parsed as { items?: Episode[] | null } | null)?.items ?? [];
  const mappedItems = items
    .filter((episode): episode is Episode => Boolean(episode?.episodeId))
    .map((episode) => ({
      episodeId: episode.episodeId,
      durationSec: episode.durationSec ?? null,
    }));

  const nextTokenRaw = (parsed as { nextToken?: unknown } | null)?.nextToken;
  const nextToken =
    typeof nextTokenRaw === "string" && nextTokenRaw.length > 0
      ? nextTokenRaw
      : null;

  return {
    items: mappedItems,
    nextToken,
  };
}

async function loadCompletedEpisodes(
  userSub: string,
  showId: string
): Promise<ProgressRecord[]> {
  const items: ProgressRecord[] = [];
  let exclusiveStartKey: QueryCommandInput["ExclusiveStartKey"];

  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression:
          "#pk = :pk AND begins_with(#sk, :progressPrefix)",
        FilterExpression: "#showId = :showId AND #completed = :completed",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
          "#showId": "showId",
          "#completed": "completed",
          "#episodeId": "episodeId",
        },
        ExpressionAttributeValues: {
          ":pk": `user#${userSub}`,
          ":progressPrefix": "ep#",
          ":showId": showId,
          ":completed": true,
        },
        ProjectionExpression: "#episodeId",
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    for (const item of result.Items ?? []) {
      const episodeId =
        typeof item.episodeId === "string" ? item.episodeId : null;
      if (episodeId) {
        items.push({ episodeId, completed: true });
      }
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

async function loadProgressKeys(
  userSub: string,
  showId: string
): Promise<string[]> {
  const items: string[] = [];
  let exclusiveStartKey: QueryCommandInput["ExclusiveStartKey"];

  do {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression:
          "#pk = :pk AND begins_with(#sk, :progressPrefix)",
        FilterExpression: "#showId = :showId",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
          "#showId": "showId",
        },
        ExpressionAttributeValues: {
          ":pk": `user#${userSub}`,
          ":progressPrefix": "ep#",
          ":showId": showId,
        },
        ProjectionExpression: "#sk",
        ExclusiveStartKey: exclusiveStartKey,
      })
    );

    for (const item of result.Items ?? []) {
      const sk = typeof item.sk === "string" ? item.sk : null;
      if (sk) {
        items.push(sk);
      }
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
