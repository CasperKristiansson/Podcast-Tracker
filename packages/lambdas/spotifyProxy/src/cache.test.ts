import { describe, expect, it, vi } from "vitest";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { __internal } from "./index.js";
import {
  getDynamoMock,
  mockCachedValue,
  mockPutCachedValue,
} from "../test/index.js";

const { getCachedValueOrFetch, cachePk } = __internal;

describe("getCachedValueOrFetch", () => {
  const dynamoMock = getDynamoMock();

  it("fetches and caches when no entry is present", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

    const key = "miss-key";
    const fetcher = vi.fn().mockResolvedValue({ data: "fresh" });

    mockCachedValue({
      key: { pk: cachePk(key), sk: "spotify" },
      item: null,
    });
    mockPutCachedValue();

    const result = await getCachedValueOrFetch(key, 60, fetcher);

    expect(result).toEqual({ data: "fresh" });
    expect(fetcher).toHaveBeenCalledTimes(1);

    const [getCall] = dynamoMock.commandCalls(GetCommand);
    if (!getCall) {
      throw new Error("Expected DynamoDB GetCommand to be invoked once");
    }
    const getInput = getCall.args[0].input;
    expect(getInput).toMatchObject({
      TableName: "test-table",
      Key: { pk: cachePk(key), sk: "spotify" },
    });

    const [putCall] = dynamoMock.commandCalls(PutCommand);
    if (!putCall) {
      throw new Error("Expected DynamoDB PutCommand to be invoked once");
    }
    const putInput = putCall.args[0].input;
    expect(putInput.TableName).toBe("test-table");
    expect(putInput.Item?.pk).toBe(cachePk(key));
    expect(putInput.Item?.sk).toBe("spotify");
    expect(putInput.Item?.value).toEqual({ data: "fresh" });

    const expectedExpiry = Math.floor(Date.now() / 1000) + 60;
    expect(putInput.Item?.expiresAt).toBe(expectedExpiry);
    expect(putInput.Item?.updatedAt).toBe(new Date().toISOString());

    vi.useRealTimers();
  });

  it("returns cached value when entry is still valid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:05:00Z"));

    const key = "hit-key";
    const cachedValue = { data: "cached" };
    mockCachedValue({
      key: { pk: cachePk(key), sk: "spotify" },
      item: {
        value: cachedValue,
        expiresAt: Math.floor(Date.now() / 1000) + 120,
      },
    });

    const fetcher = vi.fn();

    const result = await getCachedValueOrFetch(key, 60, fetcher);

    expect(result).toEqual(cachedValue);
    expect(fetcher).not.toHaveBeenCalled();
    expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(0);

    vi.useRealTimers();
  });

  it("refreshes cache when entry expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T01:00:00Z"));

    const key = "expired-key";
    const fetcher = vi.fn().mockResolvedValue({ data: "reloaded" });

    mockCachedValue({
      key: { pk: cachePk(key), sk: "spotify" },
      item: {
        value: { data: "stale" },
        expiresAt: Math.floor(Date.now() / 1000) - 5,
      },
    });
    mockPutCachedValue();

    const result = await getCachedValueOrFetch(key, 120, fetcher);

    expect(result).toEqual({ data: "reloaded" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(dynamoMock.commandCalls(PutCommand)).toHaveLength(1);

    vi.useRealTimers();
  });
});
