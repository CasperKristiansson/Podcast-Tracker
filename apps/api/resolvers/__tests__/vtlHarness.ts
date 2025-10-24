interface StashStore {
  put: (key: string, value: unknown) => unknown;
  get: (key: string) => unknown;
}

export interface RuntimeContext {
  args: Record<string, unknown>;
  identity: { sub: string };
  stash: StashStore;
  result?: unknown;
  error?: unknown;
}

interface AppSyncUtil {
  time: {
    nowISO8601: () => string;
  };
  defaultIfNull: <T>(value: T | null | undefined, defaultValue: T) => T;
  nullValue: () => null;
  map: () => Record<string, unknown>;
  qr: <T>(value: T) => T;
  error: (message: string, type?: string) => never;
  toJson: (value: unknown) => string;
  dynamodb: {
    toDynamoDBJson: (value: unknown) => unknown;
    toMapValues: (value: Record<string, unknown>) => Record<string, unknown>;
  };
}

export interface VelocityRuntime {
  ctx: RuntimeContext;
  util: AppSyncUtil;
}

interface CreateRuntimeOptions {
  args?: Record<string, unknown>;
  identitySub?: string;
  now?: string;
}

export function createRuntime({
  args = {},
  identitySub = "user-123",
  now = "2025-01-01T00:00:00.000Z",
}: CreateRuntimeOptions = {}): VelocityRuntime {
  const stashData: Record<string, unknown> = {};
  const stash: StashStore = {
    put: (key, value) => {
      stashData[key] = value;
      return value;
    },
    get: (key) => stashData[key],
  };

  const ctx: RuntimeContext = {
    args,
    identity: { sub: identitySub },
    stash,
    result: undefined,
    error: undefined,
  };

  const util: AppSyncUtil = {
    time: {
      nowISO8601: () => now,
    },
    defaultIfNull: (value, defaultValue) => value ?? defaultValue,
    nullValue: () => null,
    map: () => ({}),
    qr: (value) => value,
    error: (message: string, type?: string) => {
      const prefix = type ? `${type}: ` : "";
      throw new Error(`${prefix}${message}`);
    },
    toJson: (value) => JSON.stringify(value),
    dynamodb: {
      toDynamoDBJson: (value: unknown): unknown => {
        if (value === null || value === undefined) {
          return { NULL: true };
        }
        if (typeof value === "string") {
          return { S: value };
        }
        if (typeof value === "number") {
          return { N: value.toString() };
        }
        if (typeof value === "boolean") {
          return { BOOL: value };
        }
        if (Array.isArray(value)) {
          return {
            L: value.map((item) => util.dynamodb.toDynamoDBJson(item)),
          };
        }
        if (typeof value === "object") {
          const mapValue: Record<string, unknown> = {};
          for (const [key, entry] of Object.entries(
            value as Record<string, unknown>
          )) {
            mapValue[key] = util.dynamodb.toDynamoDBJson(entry);
          }
          return { M: mapValue };
        }
        throw new Error(
          `Unsupported type for DynamoDB conversion: ${String(typeof value)}`
        );
      },
      toMapValues: (value: Record<string, unknown>) => {
        const parse = (entry: unknown): unknown => {
          if (entry === null || entry === undefined) {
            return null;
          }
          if (typeof entry !== "object") {
            return entry;
          }
          if (Array.isArray(entry)) {
            return entry.map(parse);
          }
          const attribute = entry as Record<string, unknown>;
          if ("S" in attribute) {
            return attribute.S as string;
          }
          if ("N" in attribute) {
            return Number(attribute.N);
          }
          if ("BOOL" in attribute) {
            return Boolean(attribute.BOOL);
          }
          if ("NULL" in attribute) {
            return null;
          }
          if ("L" in attribute) {
            const list = attribute.L as unknown[];
            return Array.isArray(list) ? list.map(parse) : [];
          }
          if ("M" in attribute) {
            const mapEntry = attribute.M as Record<string, unknown>;
            const mapped: Record<string, unknown> = {};
            for (const [mapKey, mapValue] of Object.entries(mapEntry)) {
              mapped[mapKey] = parse(mapValue);
            }
            return mapped;
          }
          return attribute;
        };

        const mapValues: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value ?? {})) {
          mapValues[key] = parse(entry);
        }
        return mapValues;
      },
    },
  };

  return { ctx, util };
}

function buildSubscribeRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  const now = util.time.nowISO8601();
  const totalEpisodes = util.defaultIfNull(
    ctx.args.totalEpisodes as number | null | undefined,
    0
  );
  const showId = String(ctx.args.showId);
  const title = String(ctx.args.title);
  const publisher = String(ctx.args.publisher);
  const image = String(ctx.args.image);

  const pk = `user#${String(ctx.identity.sub)}`;
  const sk = `sub#${showId}`;

  const subscription = {
    showId,
    title,
    publisher,
    image,
    addedAt: now,
    totalEpisodes,
    subscriptionSyncedAt: now,
  };

  util.qr(ctx.stash.put("subscription", subscription));
  util.qr(ctx.stash.put("addedAt", now));
  util.qr(ctx.stash.put("totalEpisodes", totalEpisodes));
  util.qr(ctx.stash.put("subscriptionSyncedAt", now));

  return {
    version: "2018-05-29",
    operation: "PutItem",
    key: {
      pk: util.dynamodb.toDynamoDBJson(pk),
      sk: util.dynamodb.toDynamoDBJson(sk),
    },
    attributeValues: {
      dataType: util.dynamodb.toDynamoDBJson("subscription"),
      showId: util.dynamodb.toDynamoDBJson(showId),
      title: util.dynamodb.toDynamoDBJson(title),
      publisher: util.dynamodb.toDynamoDBJson(publisher),
      image: util.dynamodb.toDynamoDBJson(image),
      totalEpisodes: util.dynamodb.toDynamoDBJson(totalEpisodes),
      subscriptionSyncedAt: util.dynamodb.toDynamoDBJson(now),
      addedAt: util.dynamodb.toDynamoDBJson(now),
    },
  };
}

function buildSubscribeResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  if (ctx.error) {
    util.error((ctx.error as Error).message ?? "Error", "MappingTemplate");
  }

  const asRecord = (value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  };

  return (
    asRecord(ctx.result) ?? asRecord(ctx.stash.get("subscription")) ?? null
  );
}

export function renderTemplate(
  templateRelativePath: string,
  runtime: VelocityRuntime
): string {
  switch (templateRelativePath) {
    case "Mutation.subscribe.request.vtl":
      return runtime.util.toJson(
        buildSubscribeRequest(runtime.ctx, runtime.util)
      );
    case "Mutation.subscribe.response.vtl":
      return runtime.util.toJson(
        buildSubscribeResponse(runtime.ctx, runtime.util)
      );
    default:
      throw new Error(`Unsupported template: ${templateRelativePath}`);
  }
}
