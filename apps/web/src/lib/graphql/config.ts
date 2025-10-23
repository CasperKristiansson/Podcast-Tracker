const ensure = (value: unknown, key: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required GraphQL config key: ${key}`);
  }
  if (!value) {
    throw new Error(`Missing required GraphQL config key: ${key}`);
  }
  return value;
};

const { PUBLIC_APPSYNC_URL } = import.meta.env;

export const appsyncUrl = ensure(PUBLIC_APPSYNC_URL, "PUBLIC_APPSYNC_URL");
