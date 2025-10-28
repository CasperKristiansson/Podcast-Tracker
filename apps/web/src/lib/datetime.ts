export const normalizeDateInput = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return null;
};
