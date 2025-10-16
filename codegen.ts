import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "apps/api/schema/schema.graphql",
  documents: [
    "apps/web/src/**/*.graphql",
    "packages/shared/src/graphql/**/*.graphql",
  ],
  generates: {
    "packages/shared/src/generated/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        useTypeImports: true,
        withHooks: true,
        withComponent: false,
        withHOC: false,
        exposeQueryKeys: true,
        exposeFetcher: true,
        enumsAsTypes: true,
        nonOptionalTypename: true,
        maybeValue: "T | null | undefined",
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
