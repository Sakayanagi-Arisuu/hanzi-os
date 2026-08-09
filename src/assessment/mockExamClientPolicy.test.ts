import { describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/contentIdentity";
import { parseRecordAssessmentAttemptCommand } from "./assessmentAttemptProtocol";
import { parseOpenAssessmentSessionCommand } from "./assessmentSessionProtocol";
import { parseSubmitAssessmentSessionCommand } from "./assessmentSubmissionProtocol";
import {
  clearCompletedMockExamCommandKeys,
  clearMockExamOpenCommand,
  isSupportedMockExamRoute,
  mockExamAttemptCommandStorageKey,
  mockExamOpenCommandStorageKey,
  mockExamSubmitCommandStorageKey,
  readOrCreateStableMockExamCommand,
  shouldAutoSubmitMockExam,
} from "./mockExamClientPolicy";

const storageFixture = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

const parsedOpen = (value: unknown) => {
  const parsed = parseOpenAssessmentSessionCommand(value);
  return parsed.ok ? parsed.command : null;
};

const parsedAttempt = (value: unknown) => {
  const parsed = parseRecordAssessmentAttemptCommand(value);
  return parsed.ok ? parsed.command : null;
};

const parsedSubmit = (value: unknown) => {
  const parsed = parseSubmitAssessmentSessionCommand(value);
  return parsed.ok ? parsed.command : null;
};

describe("Mock Exam client session policy", () => {
  it("rejects unknown runner routes before requesting a session", () => {
    expect(isSupportedMockExamRoute("hsk1", "a")).toBe(true);
    expect(isSupportedMockExamRoute("hsk4", "b")).toBe(true);
    expect(isSupportedMockExamRoute("hsk5", "a")).toBe(false);
    expect(isSupportedMockExamRoute("hsk1", "c")).toBe(false);
  });

  it("clears stale open and submit receipts only after completion", () => {
    const removeItem = vi.fn();
    const storage = { removeItem };

    clearMockExamOpenCommand(storage, "hsk2", "b");
    expect(removeItem).toHaveBeenLastCalledWith("hanzi.mock.open.hsk2.b");

    clearCompletedMockExamCommandKeys(
      storage,
      "hsk2",
      "b",
      "session-42",
    );
    expect(removeItem).toHaveBeenCalledWith(
      mockExamOpenCommandStorageKey("hsk2", "b"),
    );
    expect(removeItem).toHaveBeenCalledWith(
      mockExamSubmitCommandStorageKey("session-42"),
    );
  });

  it("auto-submits once per session and waits for an explicit retry after failure", () => {
    const ready = {
      sessionId: "session-a",
      remainingMs: 0,
      resultReady: false,
      busy: false,
      attemptedSessionId: null,
      retryRequired: false,
    };
    expect(shouldAutoSubmitMockExam(ready)).toBe(true);
    expect(shouldAutoSubmitMockExam({
      ...ready,
      attemptedSessionId: "session-a",
    })).toBe(false);
    expect(shouldAutoSubmitMockExam({
      ...ready,
      retryRequired: true,
    })).toBe(false);
    expect(shouldAutoSubmitMockExam({
      ...ready,
      sessionId: "session-b",
      attemptedSessionId: "session-a",
    })).toBe(true);
  });

  it("reuses the byte-equivalent open command after a lost response", async () => {
    const storage = storageFixture();
    const command = {
      protocolVersion: 1 as const,
      idempotencyKey: "mock-open-hsk2-a:stable",
      installationId: "installation-a",
      deviceId: "device-a",
      deviceSequence: 41,
      resetEpoch: 2,
      contentVersion: CONTENT_VERSION,
      enrollmentId: "enrollment-a",
    };
    const create = vi.fn().mockResolvedValue(command);
    const key = mockExamOpenCommandStorageKey("hsk2", "a");

    const first = await readOrCreateStableMockExamCommand(
      storage,
      key,
      create,
      parsedOpen,
    );
    const retry = await readOrCreateStableMockExamCommand(
      storage,
      key,
      create,
      parsedOpen,
    );

    expect(retry).toEqual(first);
    expect(JSON.stringify(retry)).toBe(JSON.stringify(first));
    expect(retry.deviceSequence).toBe(41);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reuses the exact answer, timestamp and duration for an attempt retry", async () => {
    const storage = storageFixture();
    const command = {
      protocolVersion: 1 as const,
      idempotencyKey: "mock-attempt-session-a-3:stable",
      installationId: "installation-a",
      deviceId: "device-a",
      deviceSequence: 42,
      resetEpoch: 2,
      contentVersion: CONTENT_VERSION,
      sessionId: "session-a",
      formHash: `sha256:${"a".repeat(64)}` as const,
      itemId: "item-a",
      itemVersion: "item-a-v1",
      occurredAt: "2026-08-10T00:00:00.000Z",
      response: {
        kind: "selection" as const,
        answer: "答案 A",
        durationMs: 12_345,
      },
    };
    const create = vi.fn().mockResolvedValue(command);
    const key = mockExamAttemptCommandStorageKey("session-a", 3);

    const first = await readOrCreateStableMockExamCommand(
      storage,
      key,
      create,
      parsedAttempt,
    );
    const retry = await readOrCreateStableMockExamCommand(
      storage,
      key,
      create,
      parsedAttempt,
    );

    expect(retry).toEqual(first);
    expect(JSON.stringify(retry)).toBe(JSON.stringify(first));
    expect(retry).toMatchObject({
      deviceSequence: 42,
      occurredAt: "2026-08-10T00:00:00.000Z",
      response: { answer: "答案 A", durationMs: 12_345 },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("keeps timeout submission retries exact until terminal cleanup", async () => {
    const storage = storageFixture();
    const command = {
      protocolVersion: 1 as const,
      idempotencyKey: "mock-submit-hsk4-b:stable",
      installationId: "installation-a",
      deviceId: "device-a",
      deviceSequence: 43,
      resetEpoch: 2,
      contentVersion: CONTENT_VERSION,
      sessionId: "session-timeout",
      formHash: `sha256:${"b".repeat(64)}` as const,
    };
    const create = vi.fn().mockResolvedValue(command);
    const key = mockExamSubmitCommandStorageKey("session-timeout");

    const first = await readOrCreateStableMockExamCommand(
      storage,
      key,
      create,
      parsedSubmit,
    );
    const retry = await readOrCreateStableMockExamCommand(
      storage,
      key,
      create,
      parsedSubmit,
    );

    expect(retry).toEqual(first);
    expect(JSON.stringify(retry)).toBe(JSON.stringify(first));
    expect(retry.deviceSequence).toBe(43);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("does not replay a completed exam command into the next attempt", async () => {
    const storage = storageFixture();
    const key = mockExamOpenCommandStorageKey("hsk1", "b");
    const firstCommand = {
      protocolVersion: 1 as const,
      idempotencyKey: "mock-open-first:stable",
      installationId: "installation-a",
      deviceId: "device-a",
      deviceSequence: 50,
      resetEpoch: 2,
      contentVersion: CONTENT_VERSION,
      enrollmentId: "enrollment-a",
    };
    const secondCommand = {
      ...firstCommand,
      idempotencyKey: "mock-open-second:stable",
      deviceSequence: 60,
    };
    const create = vi.fn()
      .mockResolvedValueOnce(firstCommand)
      .mockResolvedValueOnce(secondCommand);

    await readOrCreateStableMockExamCommand(storage, key, create, parsedOpen);
    storage.setItem(
      mockExamAttemptCommandStorageKey("session-first", 0),
      JSON.stringify({ schemaVersion: 1, command: { stale: true } }),
    );
    storage.setItem(
      mockExamSubmitCommandStorageKey("session-first"),
      JSON.stringify({ schemaVersion: 1, command: { stale: true } }),
    );
    clearCompletedMockExamCommandKeys(
      storage,
      "hsk1",
      "b",
      "session-first",
      1,
    );
    const next = await readOrCreateStableMockExamCommand(
      storage,
      key,
      create,
      parsedOpen,
    );

    expect(next.idempotencyKey).toBe("mock-open-second:stable");
    expect(next.deviceSequence).toBe(60);
    expect(storage.getItem(mockExamAttemptCommandStorageKey("session-first", 0)))
      .toBeNull();
    expect(storage.getItem(mockExamSubmitCommandStorageKey("session-first")))
      .toBeNull();
    expect(create).toHaveBeenCalledTimes(2);
  });
});
