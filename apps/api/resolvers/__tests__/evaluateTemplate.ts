import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AppSyncClient,
  EvaluateMappingTemplateCommand,
  type EvaluateMappingTemplateCommandOutput,
} from "@aws-sdk/client-appsync";
import { fromIni } from "@aws-sdk/credential-providers";
import type { VelocityRuntime } from "./vtlHarness";

interface EvaluateOptions {
  fieldName?: string;
  parentTypeName?: string;
  variables?: Record<string, unknown>;
  selectionSetList?: string[];
  selectionSetGraphQL?: string;
  source?: unknown;
  prev?: unknown;
}

interface EvaluateResult {
  raw: string;
  json: unknown;
  logs: string[];
  context?: Record<string, unknown>;
  response: EvaluateMappingTemplateCommandOutput;
}

const defaultRegion =
  process.env.APPSYNC_REGION ?? process.env.AWS_REGION ?? "eu-north-1";
const defaultProfile = process.env.APPSYNC_PROFILE ?? "Personal";

let cachedClient: AppSyncClient | undefined;

function getClient(): AppSyncClient {
  if (cachedClient) {
    return cachedClient;
  }
  cachedClient = new AppSyncClient({
    region: defaultRegion,
    credentials: fromIni({ profile: defaultProfile }),
  });
  return cachedClient;
}

function stashToObject(stash: VelocityRuntime["ctx"]["stash"]): unknown {
  if (!stash) return {};
  if (
    typeof (stash as { toObject?: () => Record<string, unknown> }).toObject ===
    "function"
  ) {
    return (stash as { toObject: () => Record<string, unknown> }).toObject();
  }
  return stash;
}

export async function evaluateTemplate(
  templateRelativePath: string,
  runtime: VelocityRuntime,
  options: EvaluateOptions = {}
): Promise<EvaluateResult> {
  const relativePath = templateRelativePath.includes("/")
    ? templateRelativePath
    : path.join("apps/api/resolvers", templateRelativePath);
  const absolutePath = path.join(process.cwd(), relativePath);
  const template = readFileSync(absolutePath, "utf8");

  const contextInput = {
    arguments: runtime.ctx.args ?? {},
    identity: runtime.ctx.identity ?? null,
    stash: stashToObject(runtime.ctx.stash),
    result:
      runtime.ctx.result === undefined ? null : (runtime.ctx.result as unknown),
    error:
      runtime.ctx.error === undefined ? null : (runtime.ctx.error as unknown),
    source: options.source ?? null,
    prev: options.prev ?? null,
    info: {
      fieldName: options.fieldName ?? "",
      parentTypeName: options.parentTypeName ?? "",
      variables: options.variables ?? {},
      selectionSetList: options.selectionSetList ?? [],
      selectionSetGraphQL: options.selectionSetGraphQL ?? "",
    },
  };

  const command = new EvaluateMappingTemplateCommand({
    template,
    context: JSON.stringify(contextInput),
  });

  const response = await getClient().send(command);

  if (response.error) {
    const err = new Error(response.error.message ?? "VTL evaluation error");
    const metadata = err as unknown as Record<string, unknown>;
    const errorType = (response.error as { type?: string } | undefined)?.type;
    if (errorType) {
      metadata.type = errorType;
    }
    throw err;
  }

  const raw = response.evaluationResult ?? "";
  let json: unknown = undefined;
  if (raw.trim().length > 0) {
    try {
      json = JSON.parse(raw) as unknown;
    } catch {
      json = undefined;
    }
  }

  return {
    raw,
    json,
    logs: response.logs ?? [],
    context: undefined,
    response,
  };
}
