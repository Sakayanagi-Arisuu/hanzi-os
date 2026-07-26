import { describe, expect, it } from "vitest";
import { MAX_LEARNING_RESET_EPOCH } from "../learning/resetEpoch";
import type { LearningState } from "../types";
import { createInitialSyncDocument } from "./document";
import {
  hasValidSyncOperationHash,
  hashSyncPushOperation,
  parseSyncPushOperation,
  SYNC_PROTOCOL_VERSION,
  type SyncPushOperationV1,
} from "./protocol";

const state = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: "2026.07-alpha",
  profile: { name: "A", goal: "conversation", dailyMinutes: 20, script: "simplified", startingLevel: "zero", onboarded: true },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: { pronunciation: 0, listening: 0, speaking: 0, reading: 0, writing: 0, vocabulary: 0, grammar: 0 },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: { completed: false, score: 0, recommendedLessonId: "boot-1", completedAt: null },
  evidence: [],
});

async function operation(): Promise<SyncPushOperationV1> {
  const occurredAt = "2026-07-20T00:00:00.000Z";
  const withoutHash: Omit<SyncPushOperationV1, "requestHash"> = {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    operationId: "sync:test",
    idempotencyKey: "sync:test",
    ownerKey: "anonymous:installation",
    installationId: "installation",
    deviceId: "device",
    deviceSequence: 1,
    baseRevision: 0,
    kind: "local-import",
    contentVersion: "2026.07-alpha",
    occurredAt,
    document: createInitialSyncDocument(state(), occurredAt, "sync:test"),
  };
  return { ...withoutHash, requestHash: await hashSyncPushOperation(withoutHash) };
}

describe("sync wire protocol", () => {
  it("validates a canonical operation and keeps owner reassignment out of its hash", async () => {
    const input = await operation();
    expect(parseSyncPushOperation(input)).toMatchObject({ ok: true });
    expect(await hasValidSyncOperationHash(input)).toBe(true);
    expect(await hasValidSyncOperationHash({ ...input, ownerKey: "siwc_account" })).toBe(true);
  });

  it("detects a modified durable payload", async () => {
    const input = await operation();
    input.document.state.profile.name = "Tampered";
    expect(await hasValidSyncOperationHash(input)).toBe(false);
  });

  it("rejects local-only speech evidence at the API boundary", async () => {
    const input = await operation();
    input.document.state.evidence.push({
      id: "evidence:speech",
      idempotencyKey: "speech",
      schemaVersion: 1,
      contentVersion: input.contentVersion,
      activityVersion: "speech:1",
      source: "pronunciation",
      method: "speech-transcript",
      activityId: "speech:1",
      skill: "speaking",
      outcome: "unverified",
      score: 80,
      verified: false,
      masteryEligible: false,
      occurredAt: input.occurredAt,
      metadata: { transcript: "你好" },
    });
    expect(parseSyncPushOperation(input)).toEqual({
      ok: false,
      reason: "Cloud payload contains local-only speech evidence.",
    });
  });

  it("rejects malformed clocks before merge code can consume the document", async () => {
    const input = await operation();
    input.document.profile.clock.counter = -1;
    expect(parseSyncPushOperation(input)).toEqual({
      ok: false,
      reason: "Cloud document is invalid.",
    });
  });

  it("rejects reset epochs that cannot be stored by normalized ledgers", async () => {
    const input = await operation();
    input.document.reset.epoch = MAX_LEARNING_RESET_EPOCH + 1;
    expect(parseSyncPushOperation(input)).toEqual({
      ok: false,
      reason: "Cloud document is invalid.",
    });
  });

  it("rejects adversarially deep JSON before hashing", async () => {
    const input = await operation();
    let nested: Record<string, unknown> = {};
    const root = nested;
    for (let depth = 0; depth < 20; depth += 1) {
      nested.next = {};
      nested = nested.next as Record<string, unknown>;
    }
    (input as unknown as Record<string, unknown>).extra = root;
    expect(parseSyncPushOperation(input)).toEqual({
      ok: false,
      reason: "Sync payload is too deeply nested or contains oversized fields.",
    });
  });

  it("validates every mistake field and accepts a real calendar study date", async () => {
    const validMistake: LearningState["mistakes"][number] = {
      id: "mistake:boot-2:ni-meaning",
      lessonId: "boot-2",
      questionId: "ni-meaning",
      wordId: "ni",
      kind: "meaning",
      skill: "vocabulary",
      prompt: "NghÄ©a cá»§a ä½  lÃ  gÃ¬?",
      selectedAnswer: "tÃ´i",
      correctAnswer: "báº¡n",
      explanation: "ä½  nghÄ©a lÃ  báº¡n.",
      occurrences: 1,
      correctedStreak: 0,
      resolved: false,
      lastAttemptAt: "2026-07-20T08:00:00.000Z",
    };
    const valid = await operation();
    valid.document.state.lastStudyDate = "2026-07-20";
    valid.document.state.mistakes = [validMistake];
    expect(parseSyncPushOperation(valid)).toMatchObject({ ok: true });

    const malformedVariants: Array<Record<string, unknown>> = [
      { id: "" },
      { lessonId: 7 },
      { questionId: "" },
      { wordId: "" },
      { kind: "unknown" },
      { skill: "xp" },
      { prompt: null },
      { selectedAnswer: null },
      { correctAnswer: null },
      { explanation: null },
      { occurrences: 0 },
      { occurrences: 1.5 },
      { correctedStreak: -1 },
      { resolved: "false" },
      { lastAttemptAt: "not-a-date" },
    ];
    for (const patch of malformedVariants) {
      const input = await operation();
      input.document.state.mistakes = [{
        ...validMistake,
        ...patch,
      } as LearningState["mistakes"][number]];
      expect(parseSyncPushOperation(input)).toEqual({
        ok: false,
        reason: "Cloud document is invalid.",
      });
    }
  });

  it("rejects malformed or impossible lastStudyDate values", async () => {
    for (const lastStudyDate of ["2026-07-20T00:00:00.000Z", "2026-02-30"]) {
      const input = await operation();
      input.document.state.lastStudyDate = lastStudyDate;
      expect(parseSyncPushOperation(input)).toEqual({
        ok: false,
        reason: "Cloud document is invalid.",
      });
    }
  });
});
