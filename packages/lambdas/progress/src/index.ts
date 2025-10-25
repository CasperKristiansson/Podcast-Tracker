import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  type QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

interface AppSyncEvent {
  identity?: { sub?: string | null } | null;
  arguments: {
    showId?: string | null;
    limit?: number | null;
  };
}

interface Episode {
  episodeId: string;
  durationSec?: number | null;
}

interface ProgressRecord {
  episodeId: string;
  completed: boolean;
}

interface ProgressResponse {
  episodeId: string;
  positionSec: number;
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
): Promise<ProgressResponse> => {
  const userSub = event.identity?.sub?.trim();
  if (!userSub) {
    throw new Error("Unauthorized");
  }

  const showId = event.arguments.showId?.trim();
  if (!showId) {
    throw new Error("showId is required");
  }

  const limitArgument = event.arguments.limit;
  const limit =
    typeof limitArgument === "number" && Number.isFinite(limitArgument)
      ? Math.max(1, Math.trunc(limitArgument))
      : 25;

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

  const positionSec = normaliseDuration(nextEpisode.durationSec);
  const nowIso = new Date().toISOString();

  await dynamo.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `user#${userSub}`,
        sk: `ep#${nextEpisode.episodeId}`,
        dataType: "progress",
        episodeId: nextEpisode.episodeId,
        positionSec,
        completed: true,
        updatedAt: nowIso,
        showId,
      },
    })
  );

  return {
    episodeId: nextEpisode.episodeId,
    positionSec,
    completed: true,
    updatedAt: nowIso,
    showId,
  };
};

async function fetchEpisodes(showId: string, limit: number): Promise<Episode[]> {
  const payload = JSON.stringify({
    info: { fieldName: "episodes" },
    arguments: { showId, limit },
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
  } catch (error) {
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
  return items
    .filter((episode): episode is Episode => Boolean(episode?.episodeId))
    .map((episode) => ({
      episodeId: episode.episodeId,
      durationSec: episode.durationSec ?? null,
    }));
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

function normaliseDuration(durationSec: number | null | undefined): number {
  if (
    typeof durationSec === "number" &&
    Number.isFinite(durationSec) &&
    durationSec >= 0
  ) {
    return Math.round(durationSec);
  }
  return 0;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
