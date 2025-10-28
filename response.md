Your harness is close, but it is **not AppSync-accurate in several key places**. Biggest risks: you don’t execute real VTL, `$util.qr` is wrong, DynamoDB response handling is off, and several `$util.dynamodb` details are missing.

## Findings (highest impact first)

1. **You don’t evaluate VTL at all.** The harness re-implements each template in TS. That won’t catch real VTL bugs (typos, whitespace, string/JSON quoting, `$ctx/$util` nuances). AWS now exposes **`EvaluateMappingTemplate`**; Amplify’s simulator also runs VTL locally. Use one of them in tests. ([Amazon Web Services, Inc.][1])

2. **DynamoDB response typing is mishandled.** AppSync **auto-converts DynamoDB typed values to JSON primitives in `$ctx.result`** for VTL. Your `fromMapValues` expects DynamoDB AttributeValue shapes and reads `result.Attributes`, which is not what VTL resolvers see. For `UpdateItem`, AppSync puts the updated item **directly in `$ctx.result`**, already converted. Remove the extra decoding. ([AWS Documentation][2])

3. **`$util.qr` semantics are wrong.** In VTL, `$util.qr()` **suppresses** the return value. Your `qr` returns the value. This can change control flow in templates that rely on quiet returns. Make `qr` return `undefined` (or an inert token) and ensure its argument is still evaluated. ([AWS Documentation][3])

4. **`$util.dynamodb.toDynamoDBJson` name vs. behavior.** In VTL, `toDynamoDBJson` returns a **JSON string**; your function returns an **object**. Because you later call `util.toJson` on the whole request, returning an object is fine for your builder, but it’s not spec-accurate and can conceal quoting bugs. Either (a) rename to `toDynamoDBObject` and add a real `toDynamoDBJson` that stringifies, or (b) document the divergence. ([AWS Documentation][4])

5. **NULL encoding mismatch.** VTL helper returns `{ "NULL": null }`. Your converter emits `{ "NULL": true }`. Fix the shape. ([AWS Documentation][4])

6. **Sets and binary unsupported.** AppSync helpers cover **SS/NS/BS** and **B**. Your `toDynamoDBJson`/`fromMapValues` ignore them. Add SS/NS/BS encode/decode and base64 strings for B/BS. ([AWS Documentation][4])

7. **`$util.map()` is underspecified.** In VTL you often do `#set($m = {})` and use `.put()/.get()` or `$util.map` helpers. Your `util.map()` returns a plain `{}` with no methods. Provide a map with `.put/.get/.remove` and optionally `$util.map` helpers (keep/omit keys). ([AWS Documentation][5])

8. **`$util.error` signature incomplete.** VTL supports `(message, type?, data?, info?)`. You only take `(message, type?)` and drop `data/errorInfo`. Also, `ensureNoError` assumes `ctx.error` is an `Error`. In AppSync it’s a map with `message`, `type`, and sometimes `data`. Preserve `type`, forward `data`. Consider `$util.appendError` tests too. ([AWS Documentation][6])

9. **`defaultIfNull` / `isNull` semantics.** VTL’s `defaultIfNull` checks **null**, not undefined; `isNull` is null-only. You treat `undefined` as null, which is convenient in TS but not spec-accurate. Minor, but call it out in docs or mirror VTL. ([AWS Documentation][3])

10. **`Mutation.rateShow` update expression.** When `review` is absent/null you **SET** it to DynamoDB NULL. AWS examples **REMOVE** attributes when null to actually delete them. Prefer `REMOVE ratingReview` to avoid storing `NULL`. ([AWS Documentation][7])

11. **`returnValues` for UpdateItem.** AppSync **doesn’t accept** `returnValues` in VTL requests; it behaves like `ALL_NEW` by default. Your field is ignored; rely on `$ctx.result`. ([Stack Overflow][8])

12. **`Query.mySubscriptions.response` drops pagination.** `$ctx.result` includes `items` and may include `nextToken`. You return only items. Surface `nextToken` to test pagination paths. ([AWS Documentation][9])

13. **Identity shape is minimal.** `$ctx.identity` varies by auth mode (Cognito/JWT/IAM/API key). You only expose `sub`. Add optional `username`, `claims`, `sourceIp`, `groups` to catch auth-driven template logic. ([AWS Documentation][10])

## Suggested fixes or enhancements

Implement these in the harness:

- **Add real VTL evaluation to tests.**
  Use `EvaluateMappingTemplate` in a thin test helper, or run `amplify-appsync-simulator` in CI. Keep your TS builders as “expected object” producers, but always compare to **actual VTL evaluation output**. ([Amazon Web Services, Inc.][1])

- **Correct `$util.qr`.**

  ```ts
  qr: <T>(_: T) => undefined as unknown as T;
  ```

  Evaluate the argument for side effects, return `undefined`. ([AWS Documentation][3])

- **Fix NULL.**

  ```ts
  if (value === null || value === undefined) return { NULL: null };
  ```

  And in `fromMapValues`, map `{NULL: any}` to `null`. ([AWS Documentation][4])

- **Support SS/NS/BS and B.**
  Encode JS `Set<string|number|Buffer>` or tagged arrays to `{SS|NS|BS}`. Decode in `fromMapValues`. ([AWS Documentation][4])

- **Provide a map with methods.**

  ```ts
  map: () => {
    const m = new Map<string, unknown>();
    return {
      put: (k: string, v: unknown) => (m.set(k, v), v),
      get: (k: string) => m.get(k),
      toObject: () => Object.fromEntries(m.entries()),
      remove: (k: string) => m.delete(k),
    };
  },
  ```

  Optionally add `$util.map` helpers (retain/remove keys). ([AWS Documentation][5])

- **Expose spec-like `$util.error` and `$util.appendError`.**

  ```ts
  error: (msg: string, type?: string, data?: unknown, info?: unknown) => {
    const e = new Error(msg) as any;
    e.type = type;
    e.data = data;
    e.errorInfo = info;
    throw e;
  };
  ```

  Update `ensureNoError` to read `{ message, type, data }` from `ctx.error`. ([AWS Documentation][6])

- **Document the `toDynamoDBJson` divergence or split it.**
  Option A: rename to `toDynamoDBObject`.
  Option B: add a true `toDynamoDBJson(v)` that returns `JSON.stringify(toDynamoDBObject(v))` and keep using the object form in builders. ([AWS Documentation][4])

- **Change `rateShow` when review is null.**
  Build `SET` for stars/timestamp, and **`REMOVE ratingReview`** on null. ([AWS Documentation][7])

- **Return pagination token.**

  ```ts
  const { items = [], nextToken } = (ctx.result as any) ?? {};
  return { items: items.map(...), nextToken };
  ```

  ([AWS Documentation][9])

- **Identity enrichment.**
  Allow injection of `identity` variants in `createRuntime` to test IAM vs JWT branches. ([AWS Documentation][10])

- **Add guardrails.**
  Reject `NaN/Infinity`, but allow **empty strings** for non-key attributes (DynamoDB supports since 2020). ([Amazon Web Services, Inc.][11])

## Tests to add

- **Golden VTL vs harness parity** for each template using `EvaluateMappingTemplate`. ([Amazon Web Services, Inc.][1])
- **`$util.qr` does not leak values** into output. ([AWS Documentation][3])
- **UpdateItem**: null review → `REMOVE` path; non-null → `SET` path. ([AWS Documentation][7])
- **DynamoDB types**: SS/NS/BS/B, nested M/L, empty strings in non-keys. ([AWS Documentation][4])
- **Error propagation**: `ctx.error` → `$util.error` with `type` and `data`; also `$util.appendError`. ([AWS Documentation][6])
- **Pagination**: `nextToken` round-trip for queries. ([AWS Documentation][9])

## References

- `$util.qr`, `$util.*` helpers. ([AWS Documentation][3])
- `$util.dynamodb` helpers and shapes; `toMapValues`, sets, null. ([AWS Documentation][4])
- **Response auto-conversion** (typed → JSON primitives). ([AWS Documentation][2])
- **UpdateItem** behavior and example patterns. ([AWS Documentation][7])
- **DynamoDB `returnValues` unsupported in AppSync VTL**; default like `ALL_NEW`. ([Stack Overflow][8])
- **Testing VTL**: `EvaluateMappingTemplate`, Amplify simulator. ([Amazon Web Services, Inc.][1])
- **`$ctx` identity reference**. ([AWS Documentation][10])
- **Empty strings support in DynamoDB** (non-key attrs). ([Amazon Web Services, Inc.][11])

Bottom line: keep your TS builders if you like, but **add real VTL evaluation** to the loop, fix `$util` semantics (`qr`, `error`, null, sets), and stop post-processing DynamoDB responses that AppSync already converts. This brings your tests in line with production.

[1]: https://aws.amazon.com/blogs/mobile/introducing-template-evaluation-and-unit-testing-for-aws-appsync-resolvers/?utm_source=chatgpt.com "Introducing template evaluation and unit testing for ..."
[2]: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-resolver-mapping-template-reference-dynamodb-typed-values-responses.html "Type system (response mapping) - AWS AppSync GraphQL"
[3]: https://docs.aws.amazon.com/appsync/latest/devguide/utility-helpers-in-util.html?utm_source=chatgpt.com "Utility helpers in $util - AWS AppSync GraphQL"
[4]: https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb.html "DynamoDB helpers in $util.dynamodb - AWS AppSync GraphQL"
[5]: https://docs.aws.amazon.com/appsync/latest/devguide/utility-helpers-in-map.html?utm_source=chatgpt.com "Map helpers in $util.map - AWS AppSync GraphQL"
[6]: https://docs.aws.amazon.com/appsync/latest/devguide/built-in-util-js.html?utm_source=chatgpt.com "Built-in utilities - AWS AppSync GraphQL"
[7]: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-resolver-mapping-template-reference-dynamodb-updateitem.html "UpdateItem - AWS AppSync GraphQL"
[8]: https://stackoverflow.com/questions/55688537/dynamodb-returnvalues-updated-old-in-appsync?utm_source=chatgpt.com "DynamoDB ReturnValues UPDATED_OLD in AppSync"
[9]: https://docs.aws.amazon.com/appsync/latest/devguide/configuring-resolvers.html?utm_source=chatgpt.com "Creating basic queries (VTL) - AWS AppSync GraphQL"
[10]: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html?utm_source=chatgpt.com "AWS AppSync resolver mapping template context reference"
[11]: https://aws.amazon.com/about-aws/whats-new/2020/05/amazon-dynamodb-now-supports-empty-values-for-non-key-string-and-binary-attributes-in-dynamodb-tables/?utm_source=chatgpt.com "Amazon DynamoDB now supports empty values for non- ..."

Use AWS’s **`EvaluateMappingTemplate`** API in tests. It executes your VTL with a supplied `$ctx` and returns the rendered output and logs. No data source call is made.

### What the “thin test helper” does

1. Load the VTL file as a string.
2. Build a JSON `$ctx` object for the case you’re testing.
3. Call `EvaluateMappingTemplate` with `{ template, context: JSON.stringify(ctx) }`.
4. Parse `evaluationResult` and assert on it.
5. For response templates, set `ctx.result` to a mocked data-source payload first.

### Minimal Jest helper (TypeScript, AWS SDK v3)

```ts
// test/vtl.ts
import {
  AppSyncClient,
  EvaluateMappingTemplateCommand,
} from "@aws-sdk/client-appsync";
import { readFileSync } from "node:fs";
import path from "node:path";

const client = new AppSyncClient({});

export async function evalVtl(
  relPath: string,
  ctx: Record<string, unknown>
): Promise<{ json: any; logs: string[]; raw: string }> {
  const template = readFileSync(path.join(process.cwd(), relPath), "utf8");
  const { evaluationResult, logs, error } = await client.send(
    new EvaluateMappingTemplateCommand({
      template,
      context: JSON.stringify(ctx),
    })
  );
  if (error) throw new Error(error.message ?? "VTL evaluation error");
  const raw = evaluationResult ?? "";
  let json: any = undefined;
  try {
    json = JSON.parse(raw);
  } catch {
    /* template may return non-JSON */
  }
  return { json, logs: logs ?? [], raw };
}
```

### Example usage

```ts
// Request template
const ctxReq = {
  arguments: { showId: "abc", title: "t", publisher: "p", image: "i" },
  identity: { sub: "user-123" },
  stash: {},
  source: null,
  result: null,
  info: { fieldName: "subscribe", parentTypeName: "Mutation" },
};
const out = await evalVtl(
  "apps/api/resolvers/Mutation.subscribe.request.vtl",
  ctxReq
);
expect(out.json.operation).toBe("PutItem");

// Response template (mock DS result already converted by AppSync)
const ctxRes = {
  ...ctxReq,
  result: {
    Attributes: {
      /* or direct item, per DS */
    },
  },
};
const outRes = await evalVtl(
  "apps/api/resolvers/Mutation.subscribe.response.vtl",
  ctxRes
);
expect(outRes.json.showId).toBe("abc");
```

### Notes

- You pass **the exact `$ctx` shape** your template expects (`arguments`, `identity`, `stash`, `source`, `result`, `info`, `request`, etc.). Start minimal and add fields as your VTL touches them. ([AWS Documentation][1])
- The API returns `evaluationResult` as a **string** and optional `logs` plus `error`. Parse when you expect JSON. ([AWS Documentation][2])
- This is the supported way to **unit test VTL without hitting a data source**. It mirrors the console’s template tester. ([Amazon Web Services, Inc.][3])

This helper keeps your current TS harness for expectations, but uses **real VTL execution** as the source of truth.

[1]: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference.html?utm_source=chatgpt.com "AWS AppSync resolver mapping template context reference"
[2]: https://docs.aws.amazon.com/appsync/latest/APIReference/API_EvaluateMappingTemplate.html?utm_source=chatgpt.com "EvaluateMappingTemplate - AWS AppSync"
[3]: https://aws.amazon.com/blogs/mobile/introducing-template-evaluation-and-unit-testing-for-aws-appsync-resolvers/?utm_source=chatgpt.com "Introducing template evaluation and unit testing for ..."
