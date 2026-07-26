import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  enforceAuthoritativeLearningDocument,
  getAuthoritativeLessonAnswer,
} from "./learningIntegrity";
import { createInitialSyncDocument } from "../sync/document";
import {
  hashSyncPushOperation,
  SYNC_PROTOCOL_VERSION,
  type SyncPushOperationV1,
} from "../sync/protocol";
import type { LearningEvidence, LearningState } from "../types";

const mocks = vi.hoisted(() => ({
  getChatGPTUser: vi.fn(),
  resolveUser: vi.fn(),
  getLearningDocument: vi.fn(),
  getLatestCursor: vi.fn(),
  upsertDevice: vi.fn(),
  claimIdempotency: vi.fn(),
  getAppliedOperation: vi.fn(),
  compareAndSwapDocumentAndAppendChange: vi.fn(),
  updateProfileProjection: vi.fn(),
  recordLocalImport: vi.fn(),
  completeIdempotency: vi.fn(),
  failIdempotency: vi.fn(),
  consumeMutationRateLimit: vi.fn(),
}));

vi.mock("../../app/chatgpt-auth", () => ({
  getChatGPTUser: mocks.getChatGPTUser,
}));
vi.mock("./d1", () => ({
  getD1Database: vi.fn(async () => ({})),
  SyncBackendUnavailableError: class extends Error {},
}));
vi.mock("./syncRepository", () => ({
  SyncRepository: class {
    resolveUser = mocks.resolveUser;
    getLearningDocument = mocks.getLearningDocument;
    getLatestCursor = mocks.getLatestCursor;
    upsertDevice = mocks.upsertDevice;
    claimIdempotency = mocks.claimIdempotency;
    getAppliedOperation = mocks.getAppliedOperation;
    compareAndSwapDocumentAndAppendChange = mocks.compareAndSwapDocumentAndAppendChange;
    updateProfileProjection = mocks.updateProfileProjection;
    recordLocalImport = mocks.recordLocalImport;
    completeIdempotency = mocks.completeIdempotency;
    failIdempotency = mocks.failIdempotency;
  },
}));
vi.mock("./mutationRateLimit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mutationRateLimit")>();
  return { ...actual, consumeMutationRateLimit: mocks.consumeMutationRateLimit };
});

import { GET, POST } from "../../app/api/sync/route";

const baseState = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
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

const operationFor = async (
  state: LearningState,
  patch: Partial<Omit<SyncPushOperationV1, "requestHash">> = {},
) => {
  const occurredAt = "2026-07-20T00:00:00.000Z";
  const document = createInitialSyncDocument(state, occurredAt, "sync:authenticated");
  const withoutHash: Omit<SyncPushOperationV1, "requestHash"> = {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    operationId: "sync:authenticated",
    idempotencyKey: "sync:authenticated",
    ownerKey: await (async () => {
      const { deriveAccountKey } = await import("../lib/accountKey");
      return deriveAccountKey("learner@example.com");
    })(),
    installationId: "installation",
    deviceId: "device",
    deviceSequence: 1,
    baseRevision: 0,
    kind: "snapshot",
    contentVersion: CONTENT_VERSION,
    occurredAt,
    document,
    ...patch,
  };
  return {
    ...withoutHash,
    requestHash: await hashSyncPushOperation(withoutHash),
  };
};

const requestFor = (operation: SyncPushOperationV1) => new Request(
  "https://hanzi.test/api/sync",
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://hanzi.test",
    },
    body: JSON.stringify(operation),
  },
);

const lessonAnswerEvidence = (
  idempotencyKey: string,
  selectedAnswer: string,
  occurredAt: string,
): LearningEvidence => {
  const answer = getAuthoritativeLessonAnswer("boot-2", "ni-meaning")!;
  return {
    id: `evidence:${idempotencyKey}`,
    idempotencyKey,
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    activityVersion: answer.activityVersion,
    source: "lesson",
    method: answer.method,
    activityId: "boot-2:ni-meaning",
    skill: answer.skill,
    outcome: "correct",
    score: 100,
    verified: true,
    masteryEligible: true,
    occurredAt,
    metadata: { selectedAnswer },
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getChatGPTUser.mockResolvedValue({
    email: "learner@example.com",
    displayName: "Learner",
    fullName: "Learner",
  });
  mocks.resolveUser.mockResolvedValue("user-1");
  mocks.getLearningDocument.mockResolvedValue(null);
  mocks.getLatestCursor.mockResolvedValue(0);
  mocks.upsertDevice.mockResolvedValue("device-row");
  mocks.claimIdempotency.mockResolvedValue({
    kind: "claimed",
    recordId: "receipt-1",
    leaseToken: "lease-1",
  });
  mocks.getAppliedOperation.mockResolvedValue(null);
  mocks.compareAndSwapDocumentAndAppendChange.mockResolvedValue({
    revision: 1,
    cursor: 1,
  });
  mocks.updateProfileProjection.mockResolvedValue(undefined);
  mocks.recordLocalImport.mockResolvedValue(undefined);
  mocks.completeIdempotency.mockResolvedValue(true);
  mocks.failIdempotency.mockResolvedValue(undefined);
  mocks.consumeMutationRateLimit.mockResolvedValue({
    allowed: true,
    limit: 120,
    remaining: 119,
    resetAfterSeconds: 300,
    retryAfterSeconds: 0,
    windowEndsAt: Date.UTC(2026, 6, 22, 6, 5),
    policyVersion: "2026-07-22.v1",
  });
});

describe("authenticated sync route", () => {
  it("removes aggregate-only mastery before the atomic commit", async () => {
    const state = baseState();
    state.completedLessons["boot-1"] = {
      score: 100,
      bestScore: 100,
      attempts: 1,
      completedAt: "2026-07-20T00:00:00.000Z",
    };
    const response = await POST(requestFor(await operationFor(state)));

    expect(response.status).toBe(200);
    const committedDocument = mocks.compareAndSwapDocumentAndAppendChange.mock.calls[0][2];
    expect(committedDocument.state.completedLessons).toEqual({});
    await expect(response.json()).resolves.toMatchObject({
      revision: 1,
      cursor: 1,
      document: { state: { completedLessons: {} } },
    });
  });

  it("rejects an evidence content version mismatch before any device write", async () => {
    const state = baseState();
    state.evidence.push({
      id: "evidence:foreign",
      idempotencyKey: "foreign",
      schemaVersion: 1,
      contentVersion: "foreign-content",
      activityVersion: "foreign-content:item:1",
      source: "reader",
      method: "reading-comprehension",
      activityId: "first-day:first-day-main-idea",
      skill: "reading",
      outcome: "correct",
      score: 100,
      verified: true,
      masteryEligible: true,
      occurredAt: "2026-07-20T00:00:00.000Z",
      metadata: { selectedAnswer: "forged" },
    });
    const response = await POST(requestFor(await operationFor(state)));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "CONTENT_VERSION_UNSUPPORTED" },
    });
    expect(mocks.upsertDevice).not.toHaveBeenCalled();
  });

  it("keeps stored immutable evidence and activity on same-epoch key collisions", async () => {
    const answer = getAuthoritativeLessonAnswer("boot-2", "ni-meaning")!;
    const storedState = baseState();
    storedState.evidence = [lessonAnswerEvidence(
      "immutable-answer",
      "sai",
      "2026-07-20T08:00:00.000Z",
    )];
    storedState.activityLog = [{
      id: "immutable-activity",
      type: "lesson",
      label: "z-server",
      xp: 3,
      occurredAt: "2026-07-20T08:00:00.000Z",
    }];
    const storedDocument = enforceAuthoritativeLearningDocument(
      createInitialSyncDocument(storedState, "2026-07-20T08:00:00.000Z", "stored"),
    ).document;
    mocks.getLearningDocument.mockResolvedValue({ document: storedDocument, revision: 4 });
    mocks.compareAndSwapDocumentAndAppendChange.mockResolvedValue({ revision: 5, cursor: 9 });

    const incomingState = baseState();
    incomingState.evidence = [lessonAnswerEvidence(
      "immutable-answer",
      answer.answers[0],
      "2026-07-20T08:01:00.000Z",
    )];
    incomingState.activityLog = [{
      id: "immutable-activity",
      type: "lesson",
      label: "a-attacker",
      xp: 999,
      occurredAt: "2026-07-20T08:01:00.000Z",
    }];
    const response = await POST(requestFor(await operationFor(incomingState)));

    expect(response.status).toBe(200);
    const committed = mocks.compareAndSwapDocumentAndAppendChange.mock.calls[0][2];
    expect(committed.state.evidence.find(
      (item: LearningEvidence) => item.idempotencyKey === "immutable-answer",
    )).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: {
        selectedAnswer: "sai",
        serverScoredOutcome: "incorrect",
      },
    });
    expect(committed.state.activityLog).toContainEqual(expect.objectContaining({
      id: "immutable-activity",
      label: "z-server",
      xp: 0,
    }));
    expect(committed.legacyXpBaseline.value).toBe(0);
    expect(committed.state.xp).toBe(0);
  });

  it("keeps all snapshot answers ineligible even when backdated", async () => {
    const answer = getAuthoritativeLessonAnswer("boot-2", "ni-meaning")!;
    const storedState = baseState();
    storedState.evidence = [lessonAnswerEvidence(
      "stored-answer",
      answer.answers[0],
      "2026-07-20T08:00:00.000Z",
    )];
    const storedDocument = enforceAuthoritativeLearningDocument(
      createInitialSyncDocument(storedState, "2026-07-20T08:00:00.000Z", "stored"),
    ).document;
    mocks.getLearningDocument.mockResolvedValue({ document: storedDocument, revision: 3 });

    const incomingState = baseState();
    incomingState.evidence = [lessonAnswerEvidence(
      "backdated-answer",
      answer.answers[0],
      "2026-07-20T07:00:00.000Z",
    )];
    const response = await POST(requestFor(await operationFor(incomingState)));

    expect(response.status).toBe(200);
    const committed = mocks.compareAndSwapDocumentAndAppendChange.mock.calls[0][2];
    expect(committed.state.evidence.find(
      (item: LearningEvidence) => item.idempotencyKey === "backdated-answer",
    )).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: { serverScoredOutcome: "correct" },
    });
    expect(committed.state.evidence.find(
      (item: LearningEvidence) => item.idempotencyKey === "stored-answer",
    )).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: { serverScoredOutcome: "correct" },
    });
    expect(committed.state.knowledge).toEqual({});
    expect(committed.state.completedLessons).toEqual({});

    mocks.getLearningDocument.mockResolvedValue({ document: committed, revision: 4 });
    mocks.getLatestCursor.mockResolvedValue(7);
    const pullResponse = await GET(new Request("https://hanzi.test/api/sync"));
    expect(pullResponse.status).toBe(200);
    const pulled = await pullResponse.json() as {
      document: { state: { evidence: LearningEvidence[] } };
    };
    expect(pulled.document.state.evidence.find(
      (item) => item.idempotencyKey === "backdated-answer",
    )).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: { serverScoredOutcome: "correct" },
    });
    expect(pulled.document.state.evidence.find(
      (item) => item.idempotencyKey === "stored-answer",
    )).toMatchObject({
      outcome: "unverified",
      verified: false,
      masteryEligible: false,
      metadata: { serverScoredOutcome: "correct" },
    });
  });

  it("returns the current canonical snapshot for a completed duplicate retry", async () => {
    const operation = await operationFor(baseState());
    const staleDocument = operation.document;
    const currentState = baseState();
    currentState.profile.name = "Current learner";
    const currentDocument = createInitialSyncDocument(
      currentState,
      "2026-07-20T09:00:00.000Z",
      "current",
    );
    currentDocument.reset.epoch = 1;
    mocks.getLearningDocument.mockResolvedValue({ document: currentDocument, revision: 8 });
    mocks.getLatestCursor.mockResolvedValue(13);
    mocks.claimIdempotency.mockResolvedValue({
      kind: "duplicate",
      responseJson: JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        acceptedOperationId: operation.operationId,
        duplicate: false,
        revision: 1,
        cursor: 1,
        document: staleDocument,
        conflicts: [],
      }),
    });

    const response = await POST(requestFor(operation));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      acceptedOperationId: operation.operationId,
      duplicate: true,
      revision: 8,
      cursor: 13,
      document: {
        reset: { epoch: 1 },
        state: { profile: { name: "Current learner" } },
      },
    });
    expect(mocks.compareAndSwapDocumentAndAppendChange).not.toHaveBeenCalled();
  });
});
