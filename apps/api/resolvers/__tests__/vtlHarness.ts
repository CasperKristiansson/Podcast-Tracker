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
  isNull: (value: unknown) => boolean;
  map: () => Record<string, unknown>;
  qr: <T>(value: T) => T;
  error: (message: string, type?: string) => never;
  toJson: (value: unknown) => string;
  log: {
    debug: (...args: unknown[]) => void;
  };
  dynamodb: {
    toDynamoDBJson: (value: unknown) => unknown;
    toMapValues: (value: Record<string, unknown>) => Record<string, unknown>;
    fromMapValues: (value: Record<string, unknown>) => Record<string, unknown>;
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
    isNull: (value) => value === null || value === undefined,
    map: () => ({}),
    qr: (value) => value,
    error: (message: string, type?: string) => {
      const prefix = type ? `${type}: ` : "";
      throw new Error(`${prefix}${message}`);
    },
    toJson: (value) => JSON.stringify(value),
    log: {
      debug: () => undefined,
    },
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
        const mapValues: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value ?? {})) {
          mapValues[key] = util.dynamodb.toDynamoDBJson(entry);
        }
        return mapValues;
      },
      fromMapValues: (value: Record<string, unknown>) => {
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

        const result: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value ?? {})) {
          result[key] = parse(entry);
        }
        return result;
      },
    },
  };

  return { ctx, util };
}

function ensureNoError(ctx: RuntimeContext, util: AppSyncUtil) {
  if (ctx.error) {
    const error = ctx.error as Error;
    util.error(error.message ?? "Error", "MappingTemplate");
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
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
  ensureNoError(ctx, util);
  return (
    asRecord(ctx.result) ?? asRecord(ctx.stash.get("subscription")) ?? null
  );
}

function buildMarkProgressRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  const now = util.time.nowISO8601();
  const pk = `user#${String(ctx.identity.sub)}`;
  const sk = `ep#${String(ctx.args.episodeId)}`;

  const attributes: Record<string, unknown> = {
    dataType: "progress",
    episodeId: String(ctx.args.episodeId),
    positionSec: ctx.args.positionSec,
    completed: ctx.args.completed,
    updatedAt: now,
  };

  if (
    Object.prototype.hasOwnProperty.call(ctx.args, "showId") &&
    !util.isNull(ctx.args.showId)
  ) {
    attributes.showId = String(ctx.args.showId);
  }

  const attributeValues = util.dynamodb.toMapValues(attributes);

  util.qr(
    ctx.stash.put("progress", {
      episodeId: attributes.episodeId,
      positionSec: attributes.positionSec,
      completed: attributes.completed,
      updatedAt: attributes.updatedAt,
      ...(attributes.showId ? { showId: attributes.showId } : {}),
    })
  );

  return {
    version: "2018-05-29",
    operation: "PutItem",
    key: {
      pk: util.dynamodb.toDynamoDBJson(pk),
      sk: util.dynamodb.toDynamoDBJson(sk),
    },
    attributeValues,
  };
}

function buildMarkProgressResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  ensureNoError(ctx, util);
  const result = asRecord(ctx.result);
  if (result && Object.keys(result).length > 0) {
    const converted = util.dynamodb.fromMapValues(result);
    delete converted.pk;
    delete converted.sk;
    delete converted.dataType;
    return converted;
  }

  const stashed = asRecord(ctx.stash.get("progress"));
  if (stashed) {
    return stashed;
  }

  return {};
}

function buildRateShowRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  const now = util.time.nowISO8601();
  const pk = `user#${String(ctx.identity.sub)}`;
  const sk = `sub#${String(ctx.args.showId)}`;

  let expression = "SET ratingStars = :stars, ratingUpdatedAt = :updated";
  const expressionValues: Record<string, unknown> = {
    ":stars": util.dynamodb.toDynamoDBJson(ctx.args.stars),
    ":updated": util.dynamodb.toDynamoDBJson(now),
  };

  expression += ", ratingReview = :review";
  if (
    Object.prototype.hasOwnProperty.call(ctx.args, "review") &&
    !util.isNull(ctx.args.review)
  ) {
    expressionValues[":review"] = util.dynamodb.toDynamoDBJson(
      String(ctx.args.review)
    );
  } else {
    expressionValues[":review"] = { NULL: true };
  }

  return {
    version: "2018-05-29",
    operation: "UpdateItem",
    key: {
      pk: util.dynamodb.toDynamoDBJson(pk),
      sk: util.dynamodb.toDynamoDBJson(sk),
    },
    update: {
      expression,
      expressionValues,
    },
    condition: {
      expression: "attribute_exists(pk) AND attribute_exists(sk)",
    },
    returnValues: "ALL_NEW",
  };
}

function buildRateShowResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  ensureNoError(ctx, util);
  const record = asRecord(ctx.result) ?? {};
  return util.dynamodb.toMapValues(record);
}

function buildPublishProgressRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  return {
    version: "2018-05-29",
    payload: {
      userId: String(ctx.identity.sub),
      episodeId: ctx.args.episodeId,
      positionSec: ctx.args.positionSec,
      completed: ctx.args.completed,
      updatedAt: util.time.nowISO8601(),
    },
  };
}

function buildPublishProgressResponse(ctx: RuntimeContext) {
  const payload = { ...(asRecord(ctx.result) ?? {}) } as Record<string, unknown>;
  delete payload.userId;
  return payload;
}

function buildUnsubscribeRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  return {
    version: "2018-05-29",
    operation: "DeleteItem",
    key: {
      pk: util.dynamodb.toDynamoDBJson(`user#${String(ctx.identity.sub)}`),
      sk: util.dynamodb.toDynamoDBJson(`sub#${String(ctx.args.showId)}`),
    },
  };
}

function buildUnsubscribeResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  ensureNoError(ctx, util);
  return !util.isNull(ctx.result);
}

function buildMySubscriptionRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  return {
    version: "2018-05-29",
    operation: "GetItem",
    key: {
      pk: util.dynamodb.toDynamoDBJson(`user#${String(ctx.identity.sub)}`),
      sk: util.dynamodb.toDynamoDBJson(`sub#${String(ctx.args.showId)}`),
    },
  };
}

function buildMySubscriptionResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  if (!ctx.result) {
    return null;
  }
  const item = util.dynamodb.toMapValues(asRecord(ctx.result) ?? {});
  delete item.pk;
  delete item.sk;
  delete item.dataType;
  return item;
}

function buildMySubscriptionsRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  return {
    version: "2018-05-29",
    operation: "Query",
    query: {
      expression: "pk = :pk",
      expressionValues: {
        ":pk": util.dynamodb.toDynamoDBJson(`user#${String(ctx.identity.sub)}`),
      },
    },
    nextToken: ctx.args.nextToken ?? null,
    limit: util.defaultIfNull(ctx.args.limit as number | null | undefined, 20),
  };
}

function buildMySubscriptionsResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  const result = asRecord(ctx.result) ?? {};
  const items = Array.isArray(result.items) ? (result.items as unknown[]) : [];

  const parsed = items.map((item) => {
    const map = util.dynamodb.toMapValues(
      asRecord(item) ?? (item as Record<string, unknown>)
    );
    delete map.pk;
    delete map.sk;
    delete map.dataType;
    return map;
  });

  return {
    items: parsed,
    nextToken: result.nextToken ?? null,
  };
}

function buildHealthRequest() {
  return {
    version: "2018-05-29",
    payload: {},
  };
}

function buildHealthResponse() {
  return {
    status: "ok",
  };
}

const templateBuilders: Record<
  string,
  (ctx: RuntimeContext, util: AppSyncUtil) => unknown
> = {
  "Mutation.subscribe.request.vtl": (ctx, util) =>
    buildSubscribeRequest(ctx, util),
  "Mutation.subscribe.response.vtl": (ctx, util) =>
    buildSubscribeResponse(ctx, util),
  "Mutation.markProgress.request.vtl": (ctx, util) =>
    buildMarkProgressRequest(ctx, util),
  "Mutation.markProgress.response.vtl": (ctx, util) =>
    buildMarkProgressResponse(ctx, util),
  "Mutation.rateShow.request.vtl": (ctx, util) =>
    buildRateShowRequest(ctx, util),
  "Mutation.rateShow.response.vtl": (ctx, util) =>
    buildRateShowResponse(ctx, util),
  "Mutation.publishProgress.request.vtl": (ctx, util) =>
    buildPublishProgressRequest(ctx, util),
  "Mutation.publishProgress.response.vtl": (ctx) =>
    buildPublishProgressResponse(ctx),
  "Mutation.unsubscribe.request.vtl": (ctx, util) =>
    buildUnsubscribeRequest(ctx, util),
  "Mutation.unsubscribe.response.vtl": (ctx, util) =>
    buildUnsubscribeResponse(ctx, util),
  "Query.mySubscription.request.vtl": (ctx, util) =>
    buildMySubscriptionRequest(ctx, util),
  "Query.mySubscription.response.vtl": (ctx, util) =>
    buildMySubscriptionResponse(ctx, util),
  "Query.mySubscriptions.request.vtl": (ctx, util) =>
    buildMySubscriptionsRequest(ctx, util),
  "Query.mySubscriptions.response.vtl": (ctx, util) =>
    buildMySubscriptionsResponse(ctx, util),
  "Query.health.request.vtl": () => buildHealthRequest(),
  "Query.health.response.vtl": () => buildHealthResponse(),
};

export function renderTemplate(
  templateRelativePath: string,
  runtime: VelocityRuntime
): string {
  const builder = templateBuilders[templateRelativePath];
  if (!builder) {
    throw new Error(`Unsupported template: ${templateRelativePath}`);
  }
  const output = builder(runtime.ctx, runtime.util);
  return runtime.util.toJson(output);
}
