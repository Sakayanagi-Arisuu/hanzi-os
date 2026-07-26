import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import type { LearningAttemptCommandV1 } from "../learning/attemptProtocol";
import {
  LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY,
  LEARNING_OWNER_STORAGE_KEY,
  LEARNING_STORAGE_KEY,
  SYNC_INSTALLATION_STORAGE_KEY,
} from "../lib/storageKeys";
import type { LearningEvidence, LearningState, StudyEvent } from "../types";
import { createInitialSyncDocument } from "./document";
import {
  LearningSyncCoordinator,
  mergeServerAuthoritativeDocument,
  type LearningSyncStatus,
} from "./coordinator";
import {
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
  claimLearningCommand,
  enqueueObjectiveAttemptCommand,
  listLearningCommandRecords,
  quarantineLearningCommand,
} from "./learningCommandOutbox";
import {
  listPendingOperations,
  listQuarantinedOperations,
  readOrInitializeOwnerGeneration,
  readOwnerDocument,
  readOwnerLocalState,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  transitionOwnerCheckpoint,
  writeOwnerCheckpoint,
} from "./indexedDb";

const NOW = "2026-07-20T04:00:00.000Z";

const stateFixture = (overrides: Partial<LearningState> = {}): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Sync fixture",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
  ...overrides,
});

const evidenceFixture = (
  idempotencyKey: string,
  overrides: Partial<LearningEvidence> = {},
): LearningEvidence => ({
  id: `evidence:${idempotencyKey}`,
  idempotencyKey,
  schemaVersion: 1,
  contentVersion: CONTENT_VERSION,
  activityVersion: `${CONTENT_VERSION}:fixture:1`,
  source: "lesson",
  method: "meaning-selection",
  activityId: "boot-1:meaning-ni",
  skill: "vocabulary",
  outcome: "correct",
  score: 100,
  verified: true,
  masteryEligible: true,
  occurredAt: NOW,
  ...overrides,
});

const activityFixture = (
  id: string,
  label: string,
  xp = 10,
): StudyEvent => ({
  id,
  type: "lesson",
  label,
  xp,
  occurredAt: NOW,
});

const readerAttemptInput = (
  ownerGeneration: { ownerKey: string; generation: number },
  suffix: string,
  expectedResetEpoch = 0,
) => ({
  ownerGeneration,
  expectedResetEpoch,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: `attempt:reader:${suffix}`,
    installationId: "installation:a",
    deviceId: "device:a",
    contentVersion: CONTENT_VERSION,
    activityId: `reader:story-1:${suffix}`,
    activityVersion: `${CONTENT_VERSION}:reader:story-1:${suffix}:1`,
    source: "reader" as const,
    method: "reading-comprehension" as const,
    occurredAt: NOW,
    response: {
      kind: "answer" as const,
      answer: `private-answer-${suffix}`,
      usedHint: false,
      durationMs: 1_500,
    },
  },
});

const readerAttemptReceipt = (command: LearningAttemptCommandV1) => ({
  protocolVersion: 1 as const,
  idempotencyKey: command.idempotencyKey,
  duplicate: false,
  attemptId: `server:${command.idempotencyKey}`,
  evidenceId: `evidence:${command.idempotencyKey}`,
  resetEpoch: command.resetEpoch,
  source: command.source,
  method: command.method,
  activityId: command.activityId,
  activityVersion: command.activityVersion,
  skill: "reading" as const,
  outcome: "correct" as const,
  score: 100 as const,
  verification: "server-objective" as const,
});

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length() {
    return this.entries.size;
  }

  clear() {
    this.entries.clear();
  }

  getItem(key: string) {
    return this.entries.get(key) ?? null;
  }

  key(index: number) {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.entries.delete(key);
  }

  setItem(key: string, value: string) {
    this.entries.set(key, value);
  }
}

class TestBroadcastChannel {
  static latest: TestBroadcastChannel | null = null;
  private listener: ((event: MessageEvent) => void) | null = null;

  constructor(_name: string) {
    TestBroadcastChannel.latest = this;
  }

  addEventListener(_type: string, listener: (event: MessageEvent) => void) {
    this.listener = listener;
  }

  removeEventListener() {
    this.listener = null;
  }

  postMessage() {}

  close() {}

  emit(data: unknown) {
    this.listener?.({ data } as MessageEvent);
  }
}

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase("hanzi-os-sync-v1");
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

let storage: MemoryStorage;

const configureBrowser = (online = true) => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("navigator", { onLine: online, locks: undefined });
  vi.stubGlobal("BroadcastChannel", undefined);
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setInterval: vi.fn(() => 1),
    clearInterval: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  });
};

const createCoordinatorHarness = (initial: LearningState) => {
  let current = initial;
  const statuses: LearningSyncStatus[] = [];
  const coordinator = new LearningSyncCoordinator({
    initialState: stateFixture(),
    getState: () => current,
    applyState: (next) => {
      current = next;
      return true;
    },
    onStatus: (status) => statuses.push({ ...status }),
  });
  return {
    coordinator,
    statuses,
    getState: () => current,
    setState: (next: LearningState) => {
      current = next;
    },
  };
};

const emitRegisteredWindowEvent = (type: string) => {
  const registration = vi.mocked(window.addEventListener).mock.calls.find(
    ([registeredType]) => registeredType === type,
  );
  const listener = registration?.[1];
  if (typeof listener !== "function") {
    throw new Error(`No window listener was registered for ${type}.`);
  }
  listener.call(window, new Event(type));
};

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
  configureBrowser();
  TestBroadcastChannel.latest = null;
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
  vi.unstubAllGlobals();
});

describe("server-authoritative sync merge", () => {
  it("does not resurrect same-epoch local mistakes after server sanitization", () => {
    const localMistake: LearningState["mistakes"][number] = {
      id: "boot-1:q-1",
      lessonId: "boot-1",
      questionId: "q-1",
      kind: "meaning",
      skill: "vocabulary",
      prompt: "你好",
      selectedAnswer: "goodbye",
      correctAnswer: "hello",
      explanation: "A local answer-bearing compatibility record.",
      occurrences: 2,
      correctedStreak: 2,
      resolved: true,
      lastAttemptAt: NOW,
    };
    const server = createInitialSyncDocument(
      stateFixture({ mistakes: [] }),
      NOW,
      "server",
    );
    const local = createInitialSyncDocument(
      stateFixture({ mistakes: [localMistake] }),
      NOW,
      "local",
    );

    const merged = mergeServerAuthoritativeDocument(server, local).document;

    expect(merged.state.mistakes).toEqual([]);
  });

  it("keeps server-sanitized collisions and retains genuinely new local rows", () => {
    const serverEvidence = evidenceFixture("shared", {
      outcome: "incorrect",
      score: 0,
      masteryEligible: false,
    });
    const localCollision = evidenceFixture("shared");
    const localNew = evidenceFixture("local-new", { activityId: "boot-1:local" });
    const serverActivity = activityFixture("shared-activity", "server", 5);
    const localActivityCollision = activityFixture("shared-activity", "local", 99);
    const localActivityNew = activityFixture("local-activity", "local-new", 7);
    const server = createInitialSyncDocument(stateFixture({
      evidence: [serverEvidence],
      activityLog: [serverActivity],
    }), NOW, "server");
    const local = createInitialSyncDocument(stateFixture({
      evidence: [localCollision, localNew],
      activityLog: [localActivityCollision, localActivityNew],
    }), NOW, "local");

    const merged = mergeServerAuthoritativeDocument(server, local).document;

    expect(merged.state.evidence.find((item) => item.idempotencyKey === "shared"))
      .toEqual(serverEvidence);
    expect(merged.state.evidence.map((item) => item.idempotencyKey))
      .toContain("local-new");
    expect(merged.state.activityLog.find((item) => item.id === "shared-activity"))
      .toEqual(serverActivity);
    expect(merged.state.activityLog.map((item) => item.id))
      .toContain("local-activity");
  });
});

describe("coordinator durability and identity boundaries", () => {
  it("keeps the identity gate closed when session resolution is offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("offline");
    }));
    const harness = createCoordinatorHarness(stateFixture({ savedWords: ["ni"] }));

    await harness.coordinator.initialize();
    await harness.coordinator.syncNow();

    expect(harness.statuses.at(-1)?.phase).toBe("checking");
    expect(harness.statuses.at(-1)?.session).toBeNull();
    harness.coordinator.dispose();
  });

  it("releases a cold offline bootstrap only for an explicitly persisted anonymous owner", async () => {
    const ownerKey = "anonymous:persisted-installation";
    storage.setItem(SYNC_INSTALLATION_STORAGE_KEY, "persisted-installation");
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, ownerKey);
    vi.stubGlobal("navigator", { onLine: false, locks: undefined });
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("offline");
    }));
    const cached = stateFixture({ savedWords: ["ni"], xp: 20 });
    await writeOwnerCheckpoint(
      ownerKey,
      0,
      createInitialSyncDocument(cached, NOW, "offline-anonymous"),
      cached,
    );
    const harness = createCoordinatorHarness(stateFixture());

    await harness.coordinator.initialize();

    expect(harness.statuses.at(-1)).toMatchObject({
      phase: "offline",
      ownerKey,
      session: { authenticated: false },
    });
    expect(harness.getState().savedWords).toEqual(["ni"]);
    harness.coordinator.dispose();
  });

  it("quarantines a global snapshot when an anonymous session has no persisted owner proof", async () => {
    const privateState = stateFixture({
      savedWords: ["ni"],
      profile: {
        ...stateFixture().profile,
        name: "PRIVATE OWNER",
      },
    });
    storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(privateState));
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ authenticated: false, accountKey: null, user: null })
    ));
    const harness = createCoordinatorHarness(privateState);

    await harness.coordinator.initialize();

    const installationId = storage.getItem(SYNC_INSTALLATION_STORAGE_KEY);
    const expectedOwner = `anonymous:${installationId}`;
    expect(harness.getState()).toEqual(stateFixture());
    expect(harness.statuses.at(-1)).toMatchObject({
      phase: "local-only",
      ownerKey: expectedOwner,
      session: { authenticated: false },
    });
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe(expectedOwner);
    expect(JSON.parse(
      storage.getItem(LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY) ?? "null",
    )).toMatchObject({
      schemaVersion: 1,
      reason: "anonymous-owner-proof-missing-or-invalid",
      expectedAnonymousOwner: expectedOwner,
      state: {
        profile: { name: "PRIVATE OWNER" },
        savedWords: ["ni"],
      },
    });
    expect((await readOwnerLocalState(expectedOwner))?.savedWords).toEqual([]);
    harness.coordinator.dispose();
  });

  it("does not checkpoint or restore through a mismatched anonymous owner key", async () => {
    storage.setItem(SYNC_INSTALLATION_STORAGE_KEY, "current-installation");
    storage.setItem(
      LEARNING_OWNER_STORAGE_KEY,
      "anonymous:different-installation",
    );
    const privateState = stateFixture({
      savedWords: ["ni"],
      profile: {
        ...stateFixture().profile,
        name: "MISMATCHED OWNER",
      },
    });
    storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(privateState));
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ authenticated: false, accountKey: null, user: null })
    ));
    const harness = createCoordinatorHarness(privateState);

    await harness.coordinator.initialize();

    expect(harness.getState()).toEqual(stateFixture());
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY))
      .toBe("anonymous:current-installation");
    expect(await readOwnerLocalState("anonymous:different-installation"))
      .toBeNull();
    expect(JSON.parse(
      storage.getItem(LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY) ?? "null",
    )).toMatchObject({
      state: {
        profile: { name: "MISMATCHED OWNER" },
        savedWords: ["ni"],
      },
    });
    harness.coordinator.dispose();
  });

  it("resumes a global snapshot for the exact persisted anonymous owner", async () => {
    storage.setItem(SYNC_INSTALLATION_STORAGE_KEY, "proven-installation");
    storage.setItem(
      LEARNING_OWNER_STORAGE_KEY,
      "anonymous:proven-installation",
    );
    const privateState = stateFixture({
      savedWords: ["ni"],
      profile: {
        ...stateFixture().profile,
        name: "PROVEN OWNER",
      },
    });
    storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(privateState));
    vi.stubGlobal("fetch", vi.fn(async () =>
      Response.json({ authenticated: false, accountKey: null, user: null })
    ));
    const harness = createCoordinatorHarness(privateState);

    await harness.coordinator.initialize();

    expect(harness.getState()).toEqual(privateState);
    expect(storage.getItem(LEARNING_OWNERSHIP_QUARANTINE_STORAGE_KEY)).toBeNull();
    expect((await readOwnerLocalState("anonymous:proven-installation"))?.savedWords)
      .toEqual(["ni"]);
    harness.coordinator.dispose();
  });

  it("keeps a cold offline account reload privacy-gated", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:persisted");
    vi.stubGlobal("navigator", { onLine: false, locks: undefined });
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("offline");
    }));
    const harness = createCoordinatorHarness(stateFixture({ savedWords: ["secret"] }));

    await harness.coordinator.initialize();
    await harness.coordinator.syncNow();

    expect(harness.statuses.at(-1)?.phase).toBe("checking");
    expect(harness.statuses.at(-1)?.session).toBeNull();
    harness.coordinator.dispose();
  });

  it("restores an existing account checkpoint and refuses to sign out with an unsent import", async () => {
    const accountState = stateFixture({ savedWords: ["ni"], xp: 40 });
    const accountDocument = createInitialSyncDocument(accountState, NOW, "account");
    await writeOwnerCheckpoint("account:a", 7, accountDocument, accountState);
    vi.stubGlobal("navigator", { onLine: false, locks: undefined });
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());

    await harness.coordinator.initialize();

    expect(harness.getState().savedWords).toEqual(["ni"]);
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe("account:a");
    const pending = await listPendingOperations("account:a");
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ kind: "local-import", baseRevision: 7 });
    expect(pending[0].document.state.savedWords).toEqual(["ni"]);
    await expect(harness.coordinator.prepareSignOut()).rejects.toThrow(
      /1 thay đổi cục bộ chưa được máy chủ xác nhận/iu,
    );
    expect(harness.getState().savedWords).toEqual(["ni"]);
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe("account:a");
    harness.coordinator.dispose();
  });

  it("publishes answer-free normalized counts and blocks sign-out for pending, leased, or quarantined commands", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "pending"),
    );
    const leased = await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "leased"),
    );
    await claimLearningCommand(
      leased.recordKey,
      ownerGeneration,
      new Date(NOW),
    );

    await harness.coordinator.syncNow();

    expect(harness.statuses.at(-1)).toMatchObject({
      ownerKey: "account:a",
      normalizedPendingCount: 2,
      normalizedQuarantinedCount: 0,
    });
    expect(JSON.stringify(harness.statuses.at(-1))).not.toContain(
      "private-answer",
    );
    await expect(harness.coordinator.prepareSignOut()).rejects.toThrow(
      /2 lệnh học chuẩn hóa chưa được máy chủ xác nhận/iu,
    );
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe("account:a");

    await quarantineLearningCommand(
      leased.recordKey,
      ownerGeneration,
      "permanent test rejection",
    );
    await expect(harness.coordinator.prepareSignOut()).rejects.toThrow(
      /1 lệnh học chuẩn hóa bị cách ly/iu,
    );
    expect(harness.statuses.at(-1)).toMatchObject({
      normalizedPendingCount: 1,
      normalizedQuarantinedCount: 1,
    });
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe("account:a");
    harness.coordinator.dispose();
  });

  it("never calls account deletion while normalized commands are pending or quarantined", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    let accountDeleteCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/account" && init?.method === "DELETE") {
        accountDeleteCalls += 1;
        return Response.json({ deleted: true });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    const command = await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "delete-guard"),
    );

    await expect(harness.coordinator.deleteAccount()).rejects.toThrow(
      /1 lệnh học chuẩn hóa chưa được máy chủ xác nhận/iu,
    );
    expect(accountDeleteCalls).toBe(0);

    await quarantineLearningCommand(
      command.recordKey,
      ownerGeneration,
      "permanent test rejection",
    );
    await expect(harness.coordinator.deleteAccount()).rejects.toThrow(
      /1 lệnh học chuẩn hóa bị cách ly/iu,
    );
    expect(accountDeleteCalls).toBe(0);
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe("account:a");
    harness.coordinator.dispose();
  });

  it("flushes a normalized command from the queue-change event through the fixed endpoint", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    let attemptCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/learning/attempts") {
        attemptCalls += 1;
        expect(init).toMatchObject({
          method: "POST",
          credentials: "same-origin",
          redirect: "error",
          cache: "no-store",
        });
        const command = JSON.parse(String(init?.body)) as LearningAttemptCommandV1;
        return Response.json(readerAttemptReceipt(command), { status: 201 });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "queue-event"),
    );

    emitRegisteredWindowEvent(LEARNING_COMMAND_QUEUE_CHANGED_EVENT);

    await vi.waitFor(() => expect(attemptCalls).toBe(1));
    await vi.waitFor(() => expect(harness.statuses.at(-1)).toMatchObject({
      ownerKey: "account:a",
      normalizedPendingCount: 0,
      normalizedQuarantinedCount: 0,
    }));
    expect((await listLearningCommandRecords(ownerGeneration)).at(-1)?.status)
      .toBe("acknowledged");
    harness.coordinator.dispose();
  });

  it("bounds each queue-change flush batch", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    let attemptCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/learning/attempts") {
        attemptCalls += 1;
        const command = JSON.parse(String(init?.body)) as LearningAttemptCommandV1;
        return Response.json(readerAttemptReceipt(command), { status: 201 });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    for (let index = 0; index < 26; index += 1) {
      await enqueueObjectiveAttemptCommand(
        readerAttemptInput(ownerGeneration, `bounded-${index}`),
      );
    }

    emitRegisteredWindowEvent(LEARNING_COMMAND_QUEUE_CHANGED_EVENT);

    await vi.waitFor(() => expect(attemptCalls).toBe(25));
    await vi.waitFor(() => expect(harness.statuses.at(-1)).toMatchObject({
      normalizedPendingCount: 1,
      normalizedQuarantinedCount: 0,
    }));
    expect((await listLearningCommandRecords(ownerGeneration)).filter(
      (record) => record.status === "acknowledged",
    )).toHaveLength(25);
    harness.coordinator.dispose();
  });

  it("keeps normalized commands queued without sending while offline", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    let attemptCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/learning/attempts") {
        attemptCalls += 1;
        throw new Error("Offline command transport must not run.");
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "offline"),
    );
    vi.stubGlobal("navigator", { onLine: false, locks: undefined });

    emitRegisteredWindowEvent(LEARNING_COMMAND_QUEUE_CHANGED_EVENT);
    await harness.coordinator.syncNow();

    expect(attemptCalls).toBe(0);
    expect(harness.statuses.at(-1)).toMatchObject({
      phase: "offline",
      normalizedPendingCount: 1,
      normalizedQuarantinedCount: 0,
    });
    expect((await listLearningCommandRecords(ownerGeneration)).at(-1)?.status)
      .toBe("pending");
    harness.coordinator.dispose();
  });

  it("never sends records from an owner generation replaced by another tab", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    let currentAccount = "account:a";
    let attemptCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: currentAccount,
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/learning/attempts") {
        attemptCalls += 1;
        throw new Error("An old-owner command must never be sent.");
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const oldOwnerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(oldOwnerGeneration, "old-owner"),
    );
    const nextState = stateFixture({ savedWords: ["hao"] });
    await transitionOwnerCheckpoint(
      oldOwnerGeneration,
      "account:b",
      0,
      createInitialSyncDocument(nextState, NOW, "account-b"),
      nextState,
    );
    currentAccount = "account:b";

    await harness.coordinator.syncNow();

    expect(attemptCalls).toBe(0);
    expect(harness.statuses.at(-1)).toMatchObject({
      ownerKey: "account:b",
      normalizedPendingCount: 0,
      normalizedQuarantinedCount: 0,
    });
    harness.coordinator.dispose();
  });

  it("does not send an old-reset command after a canonical reset is pulled", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    let pullCount = 0;
    let attemptCalls = 0;
    const sentResetEpochs: number[] = [];
    const resetState = stateFixture();
    const resetDocumentBase = createInitialSyncDocument(
      resetState,
      NOW,
      "server-reset",
    );
    const resetDocument = {
      ...resetDocumentBase,
      reset: {
        epoch: 1,
        clock: resetDocumentBase.reset.clock,
      },
    };
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/learning/attempts") {
        attemptCalls += 1;
        const command = JSON.parse(
          String(init?.body),
        ) as LearningAttemptCommandV1;
        sentResetEpochs.push(command.resetEpoch);
        return Response.json(readerAttemptReceipt(command), { status: 201 });
      }
      pullCount += 1;
      return Response.json({
        protocolVersion: 1,
        revision: pullCount,
        cursor: pullCount,
        document: pullCount === 1 ? null : resetDocument,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "old-reset"),
    );

    await harness.coordinator.syncNow();

    expect(attemptCalls).toBe(0);
    expect(harness.statuses.at(-1)).toMatchObject({
      phase: "synced",
      normalizedPendingCount: 0,
      normalizedQuarantinedCount: 0,
    });
    expect(await listLearningCommandRecords(ownerGeneration)).toEqual([]);
    expect((await readOwnerDocument("account:a"))?.document.reset.epoch).toBe(1);

    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "current-reset", 1),
    );
    expect((await listLearningCommandRecords(ownerGeneration)).at(-1))
      .toMatchObject({ resetEpoch: 1, status: "pending" });

    await harness.coordinator.syncNow();

    expect(attemptCalls).toBe(1);
    expect(sentResetEpochs).toEqual([1]);
    expect((await listLearningCommandRecords(ownerGeneration)).at(-1))
      .toMatchObject({ resetEpoch: 1, status: "acknowledged" });
    harness.coordinator.dispose();
  });

  it("publishes retry and quarantine counts without leaking response bodies", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/learning/attempts") {
        const command = JSON.parse(String(init?.body)) as LearningAttemptCommandV1;
        if (command.idempotencyKey.endsWith("permanent")) {
          return Response.json(
            { secretServerBody: "do-not-surface-permanent" },
            { status: 422 },
          );
        }
        return Response.json(
          { secretServerBody: "do-not-surface-retry" },
          { status: 503 },
        );
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "permanent"),
    );
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "retry"),
    );

    await harness.coordinator.syncNow();

    expect(harness.statuses.at(-1)).toMatchObject({
      phase: "error",
      normalizedPendingCount: 1,
      normalizedQuarantinedCount: 1,
    });
    expect(JSON.stringify(harness.statuses)).not.toContain("secretServerBody");
    expect((await listLearningCommandRecords(ownerGeneration)).map(
      (record) => record.status,
    )).toEqual(["quarantined", "pending"]);
    harness.coordinator.dispose();
  });

  it("aborts an in-flight normalized delivery safely on disposal", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    let signalDeliveryStarted: (() => void) | null = null;
    const deliveryStarted = new Promise<void>((resolve) => {
      signalDeliveryStarted = resolve;
    });
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (String(input) === "/api/learning/attempts") {
        const signal = init?.signal;
        if (!signal) throw new Error("Normalized transport must carry a signal.");
        signalDeliveryStarted?.();
        return await new Promise<Response>((_resolve, reject) => {
          if (signal.aborted) {
            reject(signal.reason);
            return;
          }
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    const harness = createCoordinatorHarness(stateFixture());
    await harness.coordinator.initialize();
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await enqueueObjectiveAttemptCommand(
      readerAttemptInput(ownerGeneration, "dispose"),
    );

    const syncing = harness.coordinator.syncNow();
    await deliveryStarted;
    const statusCountAtDispose = harness.statuses.length;
    harness.coordinator.dispose();
    await syncing;

    expect(harness.statuses).toHaveLength(statusCountAtDispose);
    expect((await listLearningCommandRecords(ownerGeneration)).at(-1))
      .toMatchObject({ status: "pending", attemptCount: 1 });
  });

  it("rebases an anonymous reset into a clean account import epoch", async () => {
    vi.stubGlobal("navigator", { onLine: false, locks: undefined });
    const initial = stateFixture();
    const harness = createCoordinatorHarness(initial);
    await harness.coordinator.queueMutation(initial, initial, "reset");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:new",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));

    await harness.coordinator.initialize();

    const pending = await listPendingOperations("account:new");
    expect(pending).toHaveLength(1);
    expect(pending[0].kind).toBe("local-import");
    expect(pending[0].document.reset.epoch).toBe(0);
    expect(await listPendingOperations(
      `anonymous:${storage.getItem(SYNC_INSTALLATION_STORAGE_KEY)}`,
    )).toEqual([]);
    harness.coordinator.dispose();
  });

  it("rebases anonymous evidence onto the canonical server reset epoch before adoption", async () => {
    const anonymousEvidence = evidenceFixture("anonymous-before-login");
    const anonymousState = stateFixture({
      evidence: [anonymousEvidence],
      savedWords: ["ni"],
      xp: 25,
    });
    const serverBase = createInitialSyncDocument(
      stateFixture(),
      NOW,
      "server-reset",
    );
    const serverDocument = {
      ...serverBase,
      reset: {
        epoch: 3,
        resetAt: NOW,
        operationId: "server-reset",
      },
    };
    let pullCount = 0;
    const pushed: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:reset",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (!init?.method) {
        pullCount += 1;
        return Response.json({
          protocolVersion: 1,
          revision: 9,
          cursor: 9,
          document: pullCount === 1 ? serverDocument : null,
        });
      }
      const operation = JSON.parse(String(init.body)) as Record<string, unknown>;
      pushed.push(operation);
      return Response.json({
        protocolVersion: 1,
        acceptedOperationId: operation.operationId,
        duplicate: false,
        revision: 10,
        cursor: 10,
        document: operation.document,
        conflicts: [],
      });
    }));
    const harness = createCoordinatorHarness(anonymousState);

    await harness.coordinator.initialize();

    expect(pullCount).toBeGreaterThanOrEqual(2);
    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toMatchObject({
      kind: "local-import",
      baseRevision: 9,
      document: {
        reset: { epoch: 3 },
        state: {
          evidence: [expect.objectContaining({
            idempotencyKey: "anonymous-before-login",
          })],
        },
      },
    });
    expect(harness.getState().evidence.map((item) => item.idempotencyKey))
      .toContain("anonymous-before-login");
    harness.coordinator.dispose();
  });

  it("drops a stale local account epoch while rebasing anonymous evidence onto the server reset", async () => {
    const staleAccountEvidence = evidenceFixture("stale-account-before-reset", {
      activityId: "boot-1:stale-account",
    });
    const staleAccountState = stateFixture({
      evidence: [staleAccountEvidence],
      savedWords: ["stale-account-word"],
      xp: 90,
    });
    await writeOwnerCheckpoint(
      "account:reset-with-local-cache",
      4,
      createInitialSyncDocument(staleAccountState, NOW, "stale-account"),
      staleAccountState,
    );
    const anonymousEvidence = evidenceFixture("anonymous-after-account-reset", {
      activityId: "boot-1:anonymous-new",
    });
    const anonymousState = stateFixture({
      evidence: [anonymousEvidence],
      savedWords: ["anonymous-new-word"],
      xp: 15,
    });
    const serverDocument = {
      ...createInitialSyncDocument(stateFixture(), NOW, "server-reset-2"),
      reset: {
        epoch: 2,
        resetAt: NOW,
        operationId: "server-reset-2",
      },
    };
    let pullCount = 0;
    const pushed: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:reset-with-local-cache",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (!init?.method) {
        pullCount += 1;
        return Response.json({
          protocolVersion: 1,
          revision: 12,
          cursor: 12,
          document: pullCount === 1 ? serverDocument : null,
        });
      }
      const operation = JSON.parse(String(init.body)) as Record<string, unknown>;
      pushed.push(operation);
      return Response.json({
        protocolVersion: 1,
        acceptedOperationId: operation.operationId,
        duplicate: false,
        revision: 13,
        cursor: 13,
        document: operation.document,
        conflicts: [],
      });
    }));
    const harness = createCoordinatorHarness(anonymousState);

    await harness.coordinator.initialize();

    expect(pushed).toHaveLength(1);
    expect(pushed[0]).toMatchObject({
      kind: "local-import",
      baseRevision: 12,
      document: { reset: { epoch: 2 } },
    });
    const pushedEvidence = (
      pushed[0].document as { state: LearningState }
    ).state.evidence.map((item) => item.idempotencyKey);
    expect(pushedEvidence).toContain("anonymous-after-account-reset");
    expect(pushedEvidence).not.toContain("stale-account-before-reset");
    expect(harness.getState().savedWords).toContain("anonymous-new-word");
    expect(harness.getState().savedWords).not.toContain("stale-account-word");
    harness.coordinator.dispose();
  });

  it("rejects a stale-tab mutation after another tab atomically adopts its owner", async () => {
    let authenticated = false;
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json(authenticated
          ? {
              authenticated: true,
              accountKey: "account:adopted",
              user: {
                displayName: "Learner",
                email: "learner@example.com",
                fullName: null,
              },
            }
          : { authenticated: false, accountKey: null, user: null });
      }
      if (!init?.method) {
        return Response.json({
          protocolVersion: 1,
          revision: 0,
          cursor: 0,
          document: null,
        });
      }
      const operation = JSON.parse(String(init.body));
      return Response.json({
        protocolVersion: 1,
        acceptedOperationId: operation.operationId,
        duplicate: false,
        revision: 1,
        cursor: 1,
        document: operation.document,
        conflicts: [],
      });
    }));
    const initial = stateFixture();
    const adoptingTab = createCoordinatorHarness(initial);
    const staleTab = createCoordinatorHarness(initial);
    await adoptingTab.coordinator.initialize();
    await staleTab.coordinator.initialize();
    const sourceOwner = adoptingTab.statuses.at(-1)?.ownerKey ?? "";

    authenticated = true;
    await adoptingTab.coordinator.syncNow();
    const staleNext = stateFixture({ savedWords: ["stale-write"] });

    await expect(staleTab.coordinator.queueMutation(initial, staleNext))
      .rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await vi.waitFor(() => {
      expect(staleTab.statuses.at(-1)?.phase).toBe("checking");
    });
    expect(await readOwnerDocument(sourceOwner)).toBeNull();
    expect(await readOwnerLocalState(sourceOwner)).toBeNull();
    expect(await listPendingOperations(sourceOwner)).toEqual([]);
    expect((await listPendingOperations("account:adopted"))).toEqual([]);
    await staleTab.coordinator.syncNow();
    expect(staleTab.statuses.at(-1)).toMatchObject({
      ownerKey: "account:adopted",
      phase: "synced",
      session: { authenticated: true },
    });
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe("account:adopted");
    adoptingTab.coordinator.dispose();
    staleTab.coordinator.dispose();
  });

  it("quarantines a permanent poison row, continues later work, and retains diagnostics", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    const initial = stateFixture();
    const first = stateFixture({ savedWords: ["ni"] });
    const second = stateFixture({ savedWords: ["ni", "hao"] });
    const harness = createCoordinatorHarness(initial);
    await harness.coordinator.queueMutation(initial, first);
    harness.setState(first);
    await harness.coordinator.queueMutation(first, second);
    harness.setState(second);
    expect((await listPendingOperations("account:a"))).toHaveLength(2);
    let pushCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (!init?.method) {
        return Response.json({
          protocolVersion: 1,
          revision: 0,
          cursor: 0,
          document: null,
        });
      }
      pushCount += 1;
      const operation = JSON.parse(String(init.body));
      if (pushCount === 1) {
        return Response.json({
          error: {
            code: "INVALID_SYNC_OPERATION",
            message: "bad payload",
            retryable: false,
          },
        }, { status: 422 });
      }
      return Response.json({
        protocolVersion: 1,
        acceptedOperationId: operation.operationId,
        duplicate: false,
        revision: 1,
        cursor: 1,
        document: operation.document,
        conflicts: [],
      });
    }));

    await harness.coordinator.initialize();

    expect(pushCount).toBe(2);
    expect(await listPendingOperations("account:a")).toEqual([]);
    const quarantined = await listQuarantinedOperations("account:a");
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0].quarantineReason).toContain("INVALID_SYNC_OPERATION");
    expect(harness.statuses.at(-1)?.phase).toBe("error");
    harness.coordinator.dispose();
  });

  it("never acknowledges a response for a different operation id", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    const initial = stateFixture();
    const next = stateFixture({ savedWords: ["ni"] });
    const harness = createCoordinatorHarness(initial);
    await harness.coordinator.queueMutation(initial, next);
    harness.setState(next);
    vi.stubGlobal("fetch", vi.fn(async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      if (!init?.method) {
        return Response.json({
          protocolVersion: 1,
          revision: 0,
          cursor: 0,
          document: null,
        });
      }
      const operation = JSON.parse(String(init.body));
      return Response.json({
        protocolVersion: 1,
        acceptedOperationId: "different-operation",
        duplicate: false,
        revision: 1,
        cursor: 1,
        document: operation.document,
        conflicts: [],
      });
    }));

    await harness.coordinator.initialize();

    expect(await listPendingOperations("account:a")).toHaveLength(1);
    expect(await listQuarantinedOperations("account:a")).toEqual([]);
    expect(harness.statuses.at(-1)?.phase).toBe("error");
    harness.coordinator.dispose();
  });

  it("moves to a blank anonymous owner immediately after a sync 401", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    const harness = createCoordinatorHarness(stateFixture({ savedWords: ["ni"] }));
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      return Response.json({ error: { code: "AUTH_REQUIRED", message: "expired" } }, {
        status: 401,
      });
    }));

    await harness.coordinator.initialize();

    expect(harness.getState().savedWords).toEqual([]);
    expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toMatch(/^anonymous:/);
    expect(harness.statuses.at(-1)).toMatchObject({
      phase: "local-only",
      session: { authenticated: false },
    });
    harness.coordinator.dispose();
  });

  it("publishes and persists the next owner before applying that owner's state", async () => {
    const accountOwner = `siwc_${"a".repeat(64)}`;
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, accountOwner);
    storage.setItem(SYNC_INSTALLATION_STORAGE_KEY, "installation-owner-order");
    const anonymousOwner = "anonymous:installation-owner-order";
    const accountState = stateFixture({ savedWords: ["ni"] });
    const anonymousState = stateFixture({ savedWords: ["hao"] });
    await readOrInitializeOwnerGeneration(accountOwner);
    await writeOwnerCheckpoint(
      accountOwner,
      1,
      createInitialSyncDocument(accountState, NOW, "account-owner-order"),
      accountState,
    );
    await writeOwnerCheckpoint(
      anonymousOwner,
      0,
      createInitialSyncDocument(anonymousState, NOW, "anonymous-owner-order"),
      anonymousState,
    );

    let current = accountState;
    let latestOwner = accountOwner;
    const observations: Array<{ persistedOwner: string | null; statusOwner: string }> = [];
    const coordinator = new LearningSyncCoordinator({
      initialState: stateFixture(),
      getState: () => current,
      applyState: (next) => {
        if (next.savedWords.includes("hao")) {
          observations.push({
            persistedOwner: storage.getItem(LEARNING_OWNER_STORAGE_KEY),
            statusOwner: latestOwner,
          });
        }
        current = next;
        return true;
      },
      onStatus: (status) => {
        latestOwner = status.ownerKey;
      },
    });
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({ authenticated: false, accountKey: null, user: null });
      }
      throw new Error("Anonymous owner transition must not call cloud sync.");
    }));

    await coordinator.initialize();

    expect(observations).toEqual([{
      persistedOwner: anonymousOwner,
      statusOwner: anonymousOwner,
    }]);
    expect(current.savedWords).toEqual(["hao"]);
    coordinator.dispose();
  });

  it("honors an anonymous owner broadcast before a stale session endpoint can respond", async () => {
    storage.setItem(LEARNING_OWNER_STORAGE_KEY, "account:a");
    vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
    const harness = createCoordinatorHarness(stateFixture({ savedWords: ["ni"] }));
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input) === "/api/session") {
        return Response.json({
          authenticated: true,
          accountKey: "account:a",
          user: {
            displayName: "Learner",
            email: "learner@example.com",
            fullName: null,
          },
        });
      }
      return Response.json({
        protocolVersion: 1,
        revision: 0,
        cursor: 0,
        document: null,
      });
    }));
    await harness.coordinator.initialize();
    const anonymousOwner = `anonymous:${storage.getItem(SYNC_INSTALLATION_STORAGE_KEY)}`;
    const { ownerGeneration } = await readOrInitializeOwnerGeneration("account:a");
    await transitionOwnerCheckpoint(
      ownerGeneration,
      anonymousOwner,
      0,
      createInitialSyncDocument(stateFixture(), NOW, "other-tab-signout"),
      stateFixture(),
    );

    TestBroadcastChannel.latest?.emit({
      type: "owner-changed",
      previousOwner: "account:a",
      ownerKey: anonymousOwner,
    });
    await vi.waitFor(() => {
      expect(harness.statuses.at(-1)?.phase).toBe("local-only");
      expect(storage.getItem(LEARNING_OWNER_STORAGE_KEY)).toBe(anonymousOwner);
    });

    expect(harness.getState().savedWords).toEqual([]);
    harness.coordinator.dispose();
  });
});
