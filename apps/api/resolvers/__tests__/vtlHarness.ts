export interface RuntimeContext {
  args: Record<string, unknown>;
  identity: {
    sub: string;
    username?: string;
    sourceIp?: string[];
    groups?: string[];
    claims?: Record<string, unknown>;
  };
  stash: VtlMap;
  result?: unknown;
  error?: unknown;
}

interface VtlMap {
  put: (key: string, value: unknown) => unknown;
  get: (key: string) => unknown;
  remove: (key: string) => unknown;
  keys: () => string[];
  values: () => unknown[];
  clear: () => void;
  size: () => number;
  toObject: () => Record<string, unknown>;
}

interface AppSyncUtil {
  time: {
    nowISO8601: () => string;
  };
  defaultIfNull: <T>(value: T | null, defaultValue: T) => T;
  nullValue: () => null;
  isNull: (value: unknown) => boolean;
  map: () => VtlMap;
  qr: <T>(value: T) => undefined;
  error: (
    message: string,
    type?: string,
    data?: unknown,
    info?: unknown
  ) => never;
  toJson: (value: unknown) => string;
  log: {
    debug: (...args: unknown[]) => void;
  };
  dynamodb: {
    toDynamoDBJson: (value: unknown) => string;
    toDynamoDBObject: (value: unknown) => Record<string, unknown>;
    toMapValues: (value: Record<string, unknown>) => Record<string, unknown>;
    fromMapValues: (value: Record<string, unknown>) => Record<string, unknown>;
  };
  appendError: (
    message: string,
    type?: string,
    data?: unknown,
    info?: unknown
  ) => never;
}

export interface VelocityRuntime {
  ctx: RuntimeContext;
  util: AppSyncUtil;
}

interface CreateRuntimeIdentity {
  sub?: string;
  username?: string;
  sourceIp?: string[];
  groups?: string[];
  claims?: Record<string, unknown>;
}

interface CreateRuntimeOptions {
  args?: Record<string, unknown>;
  identity?: CreateRuntimeIdentity;
  identitySub?: string;
  now?: string;
}

function createVtlMap(initial?: Record<string, unknown>): VtlMap {
  const store = new Map<string, unknown>(
    Object.entries(initial ?? {}) as Iterable<[string, unknown]>
  );
  return {
    put: (key, value) => {
      store.set(key, value);
      return value;
    },
    get: (key) => store.get(key),
    remove: (key) => {
      const existing = store.get(key);
      store.delete(key);
      return existing;
    },
    keys: () => Array.from(store.keys()),
    values: () => Array.from(store.values()),
    clear: () => store.clear(),
    size: () => store.size,
    toObject: () => Object.fromEntries(store.entries()),
  };
}

function isBinaryLike(value: unknown): value is Uint8Array | Buffer {
  return (
    value instanceof Uint8Array ||
    (typeof Buffer !== "undefined" && value instanceof Buffer)
  );
}

function encodeBinary(value: Uint8Array | Buffer): string {
  if (value instanceof Uint8Array && !(value instanceof Buffer)) {
    return Buffer.from(value).toString("base64");
  }
  return (value as Buffer).toString("base64");
}

export function createRuntime({
  args = {},
  identitySub,
  identity = { sub: identitySub ?? "user-123" },
  now = "2025-01-01T00:00:00.000Z",
}: CreateRuntimeOptions = {}): VelocityRuntime {
  const identityShape = {
    sub: identity.sub ?? identitySub ?? "user-123",
    username: identity.username,
    sourceIp: identity.sourceIp ?? ["127.0.0.1"],
    groups: identity.groups ?? [],
    claims: identity.claims ?? {},
  };

  const stash = createVtlMap();

  const ctx: RuntimeContext = {
    args,
    identity: identityShape,
    stash,
    result: undefined,
    error: undefined,
  };

  const util: AppSyncUtil = {
    time: {
      nowISO8601: () => now,
    },
    defaultIfNull: (value, defaultValue) => {
      if (value === null) {
        return defaultValue;
      }
      return value;
    },
    nullValue: () => null,
    isNull: (value) => value === null,
    map: () => createVtlMap(),
    qr: <T>(value: T): undefined => {
      void value;
      return undefined;
    },
    error: (message, type, data, info) => {
      const err = new Error(message);
      const meta = err as unknown as Record<string, unknown>;
      meta.type = type ?? "MappingTemplate";
      if (data !== undefined) {
        meta.data = data;
      }
      if (info !== undefined) {
        meta.info = info;
      }
      throw err;
    },
    appendError: (message, type, data, info) => {
      const err = new Error(message);
      const meta = err as unknown as Record<string, unknown>;
      meta.type = type ?? "MappingTemplate";
      if (data !== undefined) {
        meta.data = data;
      }
      if (info !== undefined) {
        meta.info = info;
      }
      throw err;
    },
    toJson: (value) =>
      JSON.stringify(value, (_key, val) => {
        if (val instanceof Set) {
          return Array.from(val.values()) as unknown;
        }
        if (val instanceof Map) {
          return Object.fromEntries(Array.from(val.entries())) as Record<
            string,
            unknown
          >;
        }
        if (isBinaryLike(val)) {
          return encodeBinary(val);
        }
        if (
          val &&
          typeof val === "object" &&
          "toObject" in (val as Record<string, unknown>)
        ) {
          const maybeMap = val as { toObject?: () => Record<string, unknown> };
          if (typeof maybeMap.toObject === "function") {
            return maybeMap.toObject();
          }
        }
        return val as unknown;
      }),
    log: {
      debug: (...args: unknown[]) => {
        if (process.env.VTL_DEBUG === "1") {
          console.debug("[vtl]", ...args);
        }
      },
    },
    dynamodb: {
      toDynamoDBObject: (value: unknown): Record<string, unknown> => {
        if (value === null) {
          return { NULL: null };
        }
        if (isBinaryLike(value)) {
          return { B: encodeBinary(value) };
        }
        if (value instanceof Set) {
          const entries = Array.from(value.values()) as unknown[];
          if (entries.length === 0) {
            return { SS: [] };
          }
          const first = entries[0];
          if (typeof first === "string") {
            return { SS: (entries as string[]).map((entry) => String(entry)) };
          }
          if (typeof first === "number") {
            return {
              NS: (entries as number[]).map((entry) => entry.toString()),
            };
          }
          if (isBinaryLike(first)) {
            return {
              BS: (entries as (Uint8Array | Buffer)[]).map((entry) =>
                encodeBinary(entry)
              ),
            };
          }
          throw new Error("Unsupported set element type for DynamoDB");
        }
        if (Array.isArray(value)) {
          return {
            L: value.map((item) => util.dynamodb.toDynamoDBObject(item)),
          };
        }
        switch (typeof value) {
          case "string":
            return { S: value };
          case "number":
            return { N: value.toString() };
          case "boolean":
            return { BOOL: value };
          case "object": {
            const mapValue: Record<string, unknown> = {};
            for (const [key, entry] of Object.entries(
              value as Record<string, unknown>
            )) {
              mapValue[key] = util.dynamodb.toDynamoDBObject(entry);
            }
            return { M: mapValue };
          }
          default:
            throw new Error(
              `Unsupported type for DynamoDB conversion: ${String(typeof value)}`
            );
        }
      },
      toDynamoDBJson: (value: unknown) =>
        JSON.stringify(util.dynamodb.toDynamoDBObject(value)),
      toMapValues: (value: Record<string, unknown>) => {
        const mapValues: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value ?? {})) {
          mapValues[key] = util.dynamodb.toDynamoDBObject(entry);
        }
        return mapValues;
      },
      fromMapValues: (value: Record<string, unknown>) => {
        const parse = (entry: unknown): unknown => {
          if (entry === null || entry === undefined) {
            return null;
          }
          if (Array.isArray(entry)) {
            return entry.map(parse);
          }
          if (typeof entry !== "object") {
            return entry;
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
          if ("B" in attribute) {
            const base64 = attribute.B as string;
            return Buffer.from(base64, "base64");
          }
          if ("SS" in attribute) {
            return new Set(attribute.SS as string[]);
          }
          if ("NS" in attribute) {
            const values = attribute.NS as string[];
            return new Set(values.map((item) => Number(item)));
          }
          if ("BS" in attribute) {
            const buffers = (attribute.BS as string[]).map((value) =>
              Buffer.from(value, "base64")
            );
            return new Set(buffers);
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
    if (ctx.error instanceof Error) {
      const errMeta = ctx.error as Error & {
        type?: string;
        data?: unknown;
        info?: unknown;
      };
      util.error(
        errMeta.message ?? "Error",
        errMeta.type,
        errMeta.data,
        errMeta.info
      );
      return;
    }
    const errorRecord = asRecord(ctx.error) ?? {};
    const messageValue = errorRecord.message;
    const message = typeof messageValue === "string" ? messageValue : "Error";
    const type =
      typeof errorRecord.type === "string" ? errorRecord.type : undefined;
    const data = errorRecord.data;
    const info =
      errorRecord.errorInfo !== undefined
        ? errorRecord.errorInfo
        : errorRecord.info;
    util.error(message, type, data, info);
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function toAttribute(
  util: AppSyncUtil,
  value: unknown
): Record<string, unknown> {
  return JSON.parse(util.dynamodb.toDynamoDBJson(value)) as Record<
    string,
    unknown
  >;
}

function buildSubscribeRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  const now = util.time.nowISO8601();
  const totalEpisodesInput = ctx.args.totalEpisodes as
    | number
    | null
    | undefined;
  const totalEpisodes =
    totalEpisodesInput === null || totalEpisodesInput === undefined
      ? 0
      : Number(totalEpisodesInput);
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
      pk: toAttribute(util, pk),
      sk: toAttribute(util, sk),
    },
    attributeValues: {
      dataType: util.dynamodb.toDynamoDBObject("subscription"),
      showId: util.dynamodb.toDynamoDBObject(showId),
      title: util.dynamodb.toDynamoDBObject(title),
      publisher: util.dynamodb.toDynamoDBObject(publisher),
      image: util.dynamodb.toDynamoDBObject(image),
      totalEpisodes: util.dynamodb.toDynamoDBObject(totalEpisodes),
      subscriptionSyncedAt: util.dynamodb.toDynamoDBObject(now),
      addedAt: util.dynamodb.toDynamoDBObject(now),
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
      completed: attributes.completed,
      updatedAt: attributes.updatedAt,
      ...(attributes.showId ? { showId: attributes.showId } : {}),
    })
  );

  return {
    version: "2018-05-29",
    operation: "PutItem",
    key: {
      pk: toAttribute(util, pk),
      sk: toAttribute(util, sk),
    },
    attributeValues,
  };
}

function buildMarkProgressResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  ensureNoError(ctx, util);
  if (ctx.result) {
    return ctx.result;
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
  let removeExpression = "";
  const expressionValues: Record<string, unknown> = {
    ":stars": toAttribute(util, ctx.args.stars),
    ":updated": toAttribute(util, now),
  };

  if (
    Object.prototype.hasOwnProperty.call(ctx.args, "review") &&
    !util.isNull(ctx.args.review)
  ) {
    expression += ", ratingReview = :review";
    expressionValues[":review"] = toAttribute(util, String(ctx.args.review));
  } else {
    removeExpression = " REMOVE ratingReview";
  }

  return {
    version: "2018-05-29",
    operation: "UpdateItem",
    key: {
      pk: toAttribute(util, pk),
      sk: toAttribute(util, sk),
    },
    update: {
      expression: `${expression}${removeExpression}`,
      expressionValues,
    },
    conditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
  };
}

function buildRateShowResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  ensureNoError(ctx, util);
  return ctx.result ?? null;
}

function buildDropShowRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  const now = util.time.nowISO8601();
  const pk = `user#${String(ctx.identity.sub)}`;
  const sk = `sub#${String(ctx.args.showId)}`;

  return {
    version: "2018-05-29",
    operation: "UpdateItem",
    key: {
      pk: toAttribute(util, pk),
      sk: toAttribute(util, sk),
    },
    update: {
      expression: "SET #droppedAt = :droppedAt",
      expressionNames: {
        "#droppedAt": "droppedAt",
      },
      expressionValues: {
        ":droppedAt": toAttribute(util, now),
      },
    },
    condition: {
      expression: "attribute_exists(pk) AND attribute_exists(sk)",
    },
  };
}

function buildDropShowResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  ensureNoError(ctx, util);
  return ctx.result ?? null;
}

function buildUnsubscribeRequest(ctx: RuntimeContext, util: AppSyncUtil) {
  return {
    version: "2018-05-29",
    operation: "DeleteItem",
    key: {
      pk: toAttribute(util, `user#${String(ctx.identity.sub)}`),
      sk: toAttribute(util, `sub#${String(ctx.args.showId)}`),
    },
  };
}

function buildUnsubscribeResponse(ctx: RuntimeContext, util: AppSyncUtil) {
  ensureNoError(ctx, util);
  return Boolean(ctx.result);
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
  "Mutation.dropShow.request.vtl": (ctx, util) =>
    buildDropShowRequest(ctx, util),
  "Mutation.dropShow.response.vtl": (ctx, util) =>
    buildDropShowResponse(ctx, util),
  "Mutation.unsubscribe.request.vtl": (ctx, util) =>
    buildUnsubscribeRequest(ctx, util),
  "Mutation.unsubscribe.response.vtl": (ctx, util) =>
    buildUnsubscribeResponse(ctx, util),
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
