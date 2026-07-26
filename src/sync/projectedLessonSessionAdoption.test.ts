import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import { hashLessonSessionForm } from "../learning/lessonSessionProtocol";
import {
  emptyObjectiveEvidenceProjection,
  type ActiveLessonAttemptProjectionV1,
  type ActiveLessonSessionProjectionV1,
  type NormalizedLearningProjectionV1,
} from "../learning/projectionProtocol";
import {
  acknowledgeLearningCommand,
  deriveProjectedLessonSessionAnchorIdentity,
  enqueueLessonSessionCommand,
  enqueueLessonSessionAbandonmentCommand,
  enqueueLessonSessionSubmissionCommand,
  enqueueObjectiveAttemptCommand,
  LearningCommandConflictError,
  listLearningCommandRecords,
  prepareLearningCommand,
} from "./learningCommandOutbox";
import {
  flushLearningCommandOutbox,
  type LearningCommandTransport,
} from "./learningCommandCoordinator";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  writeLearningProjection,
  writeSyncMeta,
  type OwnerGeneration,
} from "./indexedDb";
import { NORMALIZED_LEARNING_PROJECTION_CACHE_KEY } from "./learningProjectionClient";
import {
  adoptActiveLessonSessionFromCachedProjection,
  ProjectedLessonSessionAdoptionError,
} from "./projectedLessonSessionAdoption";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = "2026-07-22T08:00:00.000Z";
const lesson = RELEASED_LESSONS[0];

const unusedAssessmentTransport = (): Pick<
  LearningCommandTransport,
  | "sendOpenAssessmentSession"
  | "sendRecordAssessmentAttempt"
  | "sendSubmitAssessmentSession"
  | "sendAbandonAssessmentSession"
  | "sendReviewGrade"
  | "sendOpenReaderSession"
  | "sendRecordReaderAttempt"
  | "sendSubmitReaderSession"
  | "sendAbandonReaderSession"
> => ({
  sendOpenAssessmentSession: async () => {
    throw new Error("Lesson adoption must not open an assessment session.");
  },
  sendRecordAssessmentAttempt: async () => {
    throw new Error("Lesson adoption must not record an assessment attempt.");
  },
  sendSubmitAssessmentSession: async () => {
    throw new Error("Lesson adoption must not submit an assessment session.");
  },
  sendAbandonAssessmentSession: async () => {
    throw new Error("Lesson adoption must not abandon an assessment session.");
  },
  sendReviewGrade: async () => {
    throw new Error("Lesson adoption must not grade a review card.");
  },
  sendOpenReaderSession: async () => {
    throw new Error("Lesson adoption must not open a Reader session.");
  },
  sendRecordReaderAttempt: async () => {
    throw new Error("Lesson adoption must not record a Reader attempt.");
  },
  sendSubmitReaderSession: async () => {
    throw new Error("Lesson adoption must not submit a Reader session.");
  },
  sendAbandonReaderSession: async () => {
    throw new Error("Lesson adoption must not abandon a Reader session.");
  },
});

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const form = {
  schemaVersion: 1 as const,
  script: "simplified" as const,
  activities: [
    {
      position: 0,
      activityId: `${lesson.id}:projected-meaning`,
      activityVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
      method: "meaning-selection" as const,
      skill: "vocabulary" as const,
      requiredForPass: true,
    },
    {
      position: 1,
      activityId: `${lesson.id}:local-meaning`,
      activityVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
      method: "meaning-selection" as const,
      skill: "vocabulary" as const,
      requiredForPass: true,
    },
  ],
};

const projectedAttempt = (
  activity = form.activities[0],
  suffix = "projected",
): ActiveLessonAttemptProjectionV1 => ({
  attemptId: `server-attempt:${suffix}`,
  evidenceId: `server-evidence:${suffix}`,
  activityId: activity.activityId,
  activityVersion: activity.activityVersion,
  source: "lesson",
  method: activity.method,
  skill: activity.skill,
  outcome: "correct",
  score: 100,
  usedHint: false,
  priorExposure: false,
  gateEligible: true,
  occurredAt: NOW,
});

const activeSession = async (
  sessionId: string,
  attempts: ActiveLessonAttemptProjectionV1[] = [projectedAttempt()],
  providedFormHash?: `sha256:${string}`,
): Promise<ActiveLessonSessionProjectionV1> => {
  const formHash = providedFormHash ?? await hashLessonSessionForm(form);
  return {
    sessionId,
    enrollmentId: "enrollment:a",
    contentVersion: CONTENT_VERSION,
    lessonId: lesson.id,
    lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
    expectedEvidenceCount: form.activities.length,
    form,
    formHash,
    status: "started",
    startedAt: NOW,
    attempts,
  };
};

const projection = async (
  providedSessions?: ActiveLessonSessionProjectionV1[],
  manifestSha256 = CURRENT_CONTENT_MANIFEST_SHA256,
): Promise<NormalizedLearningProjectionV1> => {
  const sessions = providedSessions ?? [
    await activeSession("server-session:one"),
  ];
  return {
    protocolVersion: 1,
    resetEpoch: 0,
    cursor: 7,
    contentVersion: CONTENT_VERSION,
    manifestSha256,
    enrollment: {
      enrollmentId: "enrollment:a",
      contentVersion: CONTENT_VERSION,
      courseId: "mandarin-foundations-v1",
      manifestSha256,
      releaseState: "beta",
      goal: "conversation",
    },
    activeLessonSessions: sessions,
    submittedLessons: [],
    objectiveEvidence: emptyObjectiveEvidenceProjection(),
  };
};

const cacheProjection = (
  ownerGeneration: OwnerGeneration,
  value: NormalizedLearningProjectionV1,
) => writeLearningProjection({
  expectedOwnerGeneration: ownerGeneration,
  resetEpoch: 0,
  entryKey: NORMALIZED_LEARNING_PROJECTION_CACHE_KEY,
  value,
  updatedAt: NOW,
});

const adoptionInput = (
  ownerGeneration: OwnerGeneration,
  overrides: Partial<{ sessionId: string }> = {},
) => ({
  ownerGeneration,
  resetEpoch: 0,
  sessionId: overrides.sessionId ?? "server-session:one",
  installationId: "installation:second-device",
  deviceId: "device:second-device",
  adoptedAt: NOW,
});

const localAttemptInput = (
  ownerGeneration: OwnerGeneration,
  sessionAlias: string,
) => ({
  ownerGeneration,
  expectedResetEpoch: 0,
  sessionAlias,
  enqueuedAt: NOW,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "attempt:second-device:local",
    installationId: "installation:second-device",
    deviceId: "device:second-device",
    contentVersion: CONTENT_VERSION,
    activityId: form.activities[1].activityId,
    activityVersion: form.activities[1].activityVersion,
    source: "lesson" as const,
    method: form.activities[1].method,
    occurredAt: NOW,
    response: {
      kind: "answer" as const,
      answer: "learner response",
      usedHint: false,
      durationMs: 1_000,
    },
  },
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("projected active lesson-session adoption", () => {
  it("adopts an answer-free server binding and only permits uncovered activities", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());
    const adopted = await adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    const { anchor } = adopted;

    expect(anchor).toMatchObject({
      kind: "projected-lesson-session-anchor",
      status: "acknowledged",
      resetEpoch: 0,
      binding: {
        sessionId: "server-session:one",
        formHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      },
      projectedAttempts: [{
        activityId: form.activities[0].activityId,
      }],
      command: {
        projectionCursor: 7,
        manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      },
    });
    expect(adopted).toMatchObject({
      commandSeed: anchor.command.adoptionKey,
      sessionAlias: anchor.sessionAlias,
    });
    expect(JSON.stringify(anchor)).not.toContain("learner response");
    await expect(enqueueObjectiveAttemptCommand({
      ...localAttemptInput(ownerGeneration, anchor.sessionAlias),
      command: {
        ...localAttemptInput(ownerGeneration, anchor.sessionAlias).command,
        idempotencyKey: "attempt:duplicate-projected",
        activityId: form.activities[0].activityId,
        activityVersion: form.activities[0].activityVersion,
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);

    const localAttempt = await enqueueObjectiveAttemptCommand(
      localAttemptInput(ownerGeneration, anchor.sessionAlias),
    );
    await expect(prepareLearningCommand(
      localAttempt.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "objective-attempt",
        command: { sessionId: "server-session:one" },
      },
    });
  });

  it("submits only after projected plus acknowledged local coverage exactly fills the form", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());
    const { anchor } = await adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    const attempt = await enqueueObjectiveAttemptCommand(
      localAttemptInput(ownerGeneration, anchor.sessionAlias),
    );
    const submission = await enqueueLessonSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: anchor.sessionAlias,
      attemptCommandIds: [attempt.commandId],
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "lesson-submit:second-device",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
      },
    });
    await expect(prepareLearningCommand(
      submission.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({ state: "blocked" });

    await acknowledgeLearningCommand(attempt.recordKey, ownerGeneration, {
      protocolVersion: 1,
      idempotencyKey: attempt.command.idempotencyKey,
      duplicate: false,
      attemptId: "server-attempt:local",
      evidenceId: "server-evidence:local",
      resetEpoch: 0,
      source: "lesson",
      method: form.activities[1].method,
      activityId: form.activities[1].activityId,
      activityVersion: form.activities[1].activityVersion,
      skill: "vocabulary",
      outcome: "correct",
      score: 100,
      verification: "server-objective",
    });
    await expect(prepareLearningCommand(
      submission.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "lesson-session-submit",
        command: {
          sessionId: "server-session:one",
          formHash: anchor.binding.formHash,
        },
        sessionReceipt: {
          lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
        },
      },
    });
    const transport: LearningCommandTransport = {
      ...unusedAssessmentTransport(),
      sendLessonSession: async () => {
        throw new Error("Projected adoption must not reopen the session.");
      },
      sendObjectiveAttempt: async () => {
        throw new Error("The local attempt is already acknowledged.");
      },
      sendLessonSessionAbandonment: async () => {
        throw new Error("Submission must not use abandonment transport.");
      },
      sendLessonSessionSubmission: async (command) => ({
        status: 200,
        retryAfterMs: 0,
        body: {
          protocolVersion: 1,
          idempotencyKey: command.idempotencyKey,
          duplicate: false,
          sessionId: command.sessionId,
          contentVersion: command.contentVersion,
          resetEpoch: command.resetEpoch,
          lessonId: lesson.id,
          lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
          formHash: command.formHash,
          status: "submitted",
          evidenceCount: 2,
          rawScore: 100,
          gateScore: 100,
          requiredEvidenceCount: 2,
          requiredCorrectCount: 2,
          passed: true,
          completionEvidenceId: "completion:second-device",
          submittedAt: NOW,
        },
      }),
    };
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 1,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
  });

  it("delivers abandonment from the projected authority binding without reopening", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());
    const { anchor } = await adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    await enqueueLessonSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: anchor.sessionAlias,
      dependencyCommandId: anchor.commandId,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "lesson-abandon:second-device-delivery",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
      },
    });
    const transport: LearningCommandTransport = {
      ...unusedAssessmentTransport(),
      sendLessonSession: async () => {
        throw new Error("Projected adoption must not reopen the session.");
      },
      sendObjectiveAttempt: async () => {
        throw new Error("Abandonment must not send an attempt.");
      },
      sendLessonSessionSubmission: async () => {
        throw new Error("Abandonment must not submit the session.");
      },
      sendLessonSessionAbandonment: async (command) => ({
        status: 200,
        retryAfterMs: 0,
        body: {
          protocolVersion: 1,
          idempotencyKey: command.idempotencyKey,
          duplicate: false,
          sessionId: command.sessionId,
          enrollmentId: "enrollment:a",
          contentVersion: command.contentVersion,
          resetEpoch: command.resetEpoch,
          lessonId: lesson.id,
          lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
          status: "abandoned",
          abandonedAt: NOW,
        },
      }),
    };
    await expect(flushLearningCommandOutbox({
      ownerGeneration,
      transport,
      now: () => new Date(NOW),
    })).resolves.toEqual({
      acknowledged: 1,
      quarantined: 0,
      retried: 0,
      blocked: 0,
    });
  });

  it("keeps projected anchors idempotent and rejects duplicate aliases or server sessions", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection([
      await activeSession("server-session:one"),
      await activeSession("server-session:two"),
    ]));
    const first = await adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    await expect(adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).resolves.toEqual(first);
    await expect(adoptActiveLessonSessionFromCachedProjection({
      ...adoptionInput(ownerGeneration),
      deviceId: "device:third-device",
    })).rejects.toBeInstanceOf(LearningCommandConflictError);

    const secondSession = (await projection([
      await activeSession("server-session:two"),
    ])).activeLessonSessions[0];
    const secondIdentity = await deriveProjectedLessonSessionAnchorIdentity({
      ownerGeneration,
      resetEpoch: 0,
      sessionId: secondSession.sessionId,
      formHash: secondSession.formHash,
      installationId: "installation:second-device",
      deviceId: "device:second-device",
      activityCount: secondSession.form.activities.length,
    });
    await enqueueLessonSessionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: secondIdentity.sessionAlias,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "lesson-open:alias-reservation",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
        enrollmentId: "enrollment:a",
        lessonId: lesson.id,
      },
    });
    await expect(adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration, { sessionId: "server-session:two" }),
    )).rejects.toBeInstanceOf(LearningCommandConflictError);
  });

  it("rejects stale owner/reset scope and any form-hash or package drift", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());
    await expect(adoptActiveLessonSessionFromCachedProjection({
      ...adoptionInput(ownerGeneration),
      resetEpoch: 1,
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
      ownerKey: "account:b",
      generation: 2,
    });
    await expect(adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    await resetSyncDatabaseForTests();
    await deleteDatabase();
    const freshOwner = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await cacheProjection(freshOwner, await projection([
      await activeSession(
        "server-session:one",
        [projectedAttempt()],
        `sha256:${"0".repeat(64)}`,
      ),
    ]));
    await expect(adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(freshOwner),
    )).rejects.toBeInstanceOf(ProjectedLessonSessionAdoptionError);

    await cacheProjection(freshOwner, await projection(
      [await activeSession("server-session:one")],
      `sha256:${"f".repeat(64)}`,
    ));
    await expect(adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(freshOwner),
    )).rejects.toBeInstanceOf(ProjectedLessonSessionAdoptionError);
  });

  it("preserves submit/abandon mutual exclusion for adopted sessions", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:a")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection([
      await activeSession("server-session:one", [
        projectedAttempt(form.activities[0], "one-a"),
        projectedAttempt(form.activities[1], "one-b"),
      ]),
      await activeSession("server-session:two", [
        projectedAttempt(form.activities[0], "two-a"),
        projectedAttempt(form.activities[1], "two-b"),
      ]),
    ]));
    const { anchor: submittedAnchor } = await adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    await enqueueLessonSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: submittedAnchor.sessionAlias,
      attemptCommandIds: [],
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "lesson-submit:projected-only",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
      },
    });
    await expect(enqueueLessonSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: submittedAnchor.sessionAlias,
      dependencyCommandId: submittedAnchor.commandId,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "lesson-abandon:after-submit",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);

    const { anchor: abandonedAnchor } = await adoptActiveLessonSessionFromCachedProjection(
      adoptionInput(ownerGeneration, {
        sessionId: "server-session:two",
      }),
    );
    const abandonment = await enqueueLessonSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: abandonedAnchor.sessionAlias,
      dependencyCommandId: abandonedAnchor.commandId,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "lesson-abandon:projected",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
      },
    });
    await expect(prepareLearningCommand(
      abandonment.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        command: { sessionId: "server-session:two" },
      },
    });
    await expect(enqueueLessonSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: abandonedAnchor.sessionAlias,
      attemptCommandIds: [],
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "lesson-submit:after-abandon",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
    expect((await listLearningCommandRecords(ownerGeneration)).filter(
      (record) => record.kind === "projected-lesson-session-anchor",
    )).toHaveLength(2);
  });
});
