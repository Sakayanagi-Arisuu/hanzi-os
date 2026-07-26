import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement, D1RunResult } from "./d1";
import {
  LearningResetEpochConflictError,
  MAX_LEARNING_RESET_EPOCH,
  readCurrentLearningResetEpoch,
} from "./learningResetEpoch";

const databaseWithDocument = (documentJson: string | null): D1Database => {
  const statement: D1PreparedStatement = {
    bind: () => statement,
    first: async <T,>() => documentJson === null
      ? null
      : { documentJson } as T,
    all: async <T,>(): Promise<D1RunResult<T>> => ({ success: true, results: [] }),
    run: async <T,>(): Promise<D1RunResult<T>> => ({ success: true }),
  };
  return {
    prepare: () => statement,
    batch: async <T,>(): Promise<Array<D1RunResult<T>>> => [],
  };
};

describe("canonical learning reset epoch", () => {
  it("defaults to zero only for a missing document or missing legacy field", async () => {
    await expect(readCurrentLearningResetEpoch(
      databaseWithDocument(null),
      "user-a",
    )).resolves.toBe(0);
    await expect(readCurrentLearningResetEpoch(
      databaseWithDocument(JSON.stringify({ schemaVersion: 1 })),
      "user-a",
    )).resolves.toBe(0);
  });

  it("accepts exact bounded JSON integers", async () => {
    await expect(readCurrentLearningResetEpoch(
      databaseWithDocument(JSON.stringify({ reset: { epoch: MAX_LEARNING_RESET_EPOCH } })),
      "user-a",
    )).resolves.toBe(MAX_LEARNING_RESET_EPOCH);
  });

  it.each([
    "not-json",
    JSON.stringify({ reset: { epoch: "1" } }),
    JSON.stringify({ reset: { epoch: 1.5 } }),
    JSON.stringify({ reset: { epoch: -1 } }),
    JSON.stringify({ reset: { epoch: MAX_LEARNING_RESET_EPOCH + 1 } }),
  ])("rejects malformed or coercible canonical epochs", async (documentJson) => {
    await expect(readCurrentLearningResetEpoch(
      databaseWithDocument(documentJson),
      "user-a",
    )).rejects.toBeInstanceOf(LearningResetEpochConflictError);
  });
});
