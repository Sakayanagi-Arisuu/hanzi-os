import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import { CURRENT_AUTHORITATIVE_COURSE_ID } from "../learning/authoritativeProgress";
import {
  emptyObjectiveEvidenceProjection,
  type ActiveReaderAttemptProjectionV3,
  type ActiveReaderSessionProjectionV3,
  type NormalizedLearningProjectionV3,
} from "../learning/projectionProtocol";
import {
  hashReaderSessionForm,
  type ReaderSessionFormV1,
} from "../reader/readerSessionProtocol";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  writeLearningProjection,
  writeSyncMeta,
  type OwnerGeneration,
} from "./indexedDb";
import {
  enqueueReaderAttemptCommand,
  listLearningCommandRecords,
} from "./learningCommandOutbox";
import {
  NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
} from "./learningProjectionClient";
import {
  adoptActiveReaderSessionFromCachedProjection,
  projectedReaderAnchorRefreshDecision,
  ProjectedReaderSessionAdoptionError,
  type AdoptActiveReaderSessionFromCachedProjectionInput,
} from "./projectedReaderSessionAdoption";

const DATABASE_NAME = "hanzi-os-sync-v1";
const STARTED_AT = "2026-07-26T08:00:00.000Z";
const RECORDED_AT = "2026-07-26T08:01:00.000Z";

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), {
    once: true,
  });
});

const form = (
  supportMode: "assisted" | "unassisted" = "unassisted",
): ReaderSessionFormV1 => ({
  formSchemaVersion: 1,
  storyId: "reader-story:projected",
  storyVersion: `${CONTENT_VERSION}:reader-story:projected:1`,
  formVersion: `${CONTENT_VERSION}:reader-form:projected:1`,
  script: "simplified",
  supportMode,
  supportPolicyVersion: "reader-support:projected:1",
  items: [
    {
      position: 0,
      itemId: "reader-item:projected:confidential",
      itemVersion:
        `${CONTENT_VERSION}:reader-item:projected:confidential:1`,
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "小王是学生。",
      prompt: "小王是谁？",
      options: ["学生", "老师"],
      answerExposure: "server-confidential",
      priorExposure: false,
      masteryEligible: supportMode === "unassisted",
    },
    {
      position: 1,
      itemId: "reader-item:projected:public",
      itemVersion: `${CONTENT_VERSION}:reader-item:projected:public:1`,
      method: "reading-comprehension",
      skill: "reading",
      chineseStimulus: "李老师很好。",
      prompt: "李老师怎么样？",
      options: ["很好", "不好"],
      answerExposure: "public-client",
      priorExposure: false,
      masteryEligible: false,
    },
  ],
});

const projectedAttempt = (
  session: Omit<ActiveReaderSessionProjectionV3, "attempts">,
  position: number,
): ActiveReaderAttemptProjectionV3 => {
  const item = session.form.items[position]!;
  return {
    attemptId: `reader-attempt:server:${position}`,
    evidenceId: `reader-evidence:server:${position}`,
    sessionId: session.sessionId,
    resetEpoch: session.resetEpoch,
    contentVersion: session.contentVersion,
    formHash: session.formHash,
    position,
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    method: item.method,
    skill: item.skill,
    script: session.script,
    supportMode: session.supportMode,
    supportPolicyVersion: session.supportPolicyVersion,
    answerExposure: item.answerExposure,
    priorExposure: item.priorExposure,
    masteryEligible: item.masteryEligible,
    outcome: "correct",
    score: 100,
    verification: "server-objective",
    status: "recorded",
    recordedAt: RECORDED_AT,
  };
};

const activeSession = async (
  attemptPositions: readonly number[] = [0],
  issuedForm: ReaderSessionFormV1 = form(),
): Promise<ActiveReaderSessionProjectionV3> => {
  const binding = {
    sessionId: "reader-session:projected",
    enrollmentId: "enrollment:projected",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    storyId: issuedForm.storyId,
    storyVersion: issuedForm.storyVersion,
    formVersion: issuedForm.formVersion,
    formSchemaVersion: 1 as const,
    script: issuedForm.script,
    supportMode: issuedForm.supportMode,
    supportPolicyVersion: issuedForm.supportPolicyVersion,
    expectedItemCount: issuedForm.items.length,
    form: issuedForm,
    formHash: await hashReaderSessionForm(issuedForm),
    status: "started" as const,
    startedAt: STARTED_AT,
  };
  return {
    ...binding,
    attempts: attemptPositions.map((position) =>
      projectedAttempt(binding, position)
    ),
  };
};

const projection = async (
  session?: ActiveReaderSessionProjectionV3 | null,
  options: {
    cursor?: number;
    manifestSha256?: string;
    courseId?: string;
  } = {},
): Promise<NormalizedLearningProjectionV3> => {
  const manifestSha256 =
    options.manifestSha256 ?? CURRENT_CONTENT_MANIFEST_SHA256;
  const activeReaderSession = session === undefined
    ? await activeSession()
    : session;
  return {
    protocolVersion: 3,
    resetEpoch: 0,
    cursor: options.cursor ?? 12,
    contentVersion: CONTENT_VERSION,
    manifestSha256,
    enrollment: {
      enrollmentId: "enrollment:projected",
      contentVersion: CONTENT_VERSION,
      courseId: options.courseId ?? CURRENT_AUTHORITATIVE_COURSE_ID,
      manifestSha256,
      releaseState: "beta",
      goal: "conversation",
    },
    activeLessonSessions: [],
    submittedLessons: [],
    objectiveEvidence: emptyObjectiveEvidenceProjection(),
    activeAssessmentSession: null,
    latestAssessmentResult: null,
    activeReaderSession,
  };
};

const cacheProjection = (
  ownerGeneration: OwnerGeneration,
  value: unknown,
) => writeLearningProjection({
  expectedOwnerGeneration: ownerGeneration,
  resetEpoch: 0,
  entryKey: NORMALIZED_LEARNING_PROJECTION_V3_CACHE_KEY,
  value,
  updatedAt: STARTED_AT,
});

const adoptionInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  resetEpoch: 0,
  sessionId: "reader-session:projected",
  installationId: "installation:second-device",
  deviceId: "device:second-device",
  adoptedAt: STARTED_AT,
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("projected active Reader-session adoption", () => {
  it("adopts only answer-free cached V3 authority and remains idempotent", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected-reader")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());

    const adopted = await adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );

    expect(adopted.anchor).toMatchObject({
      kind: "projected-reader-session-anchor",
      status: "acknowledged",
      receipt: null,
      binding: {
        sessionId: "reader-session:projected",
        enrollmentId: "enrollment:projected",
        supportMode: "unassisted",
        formHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
        form: {
          items: [
            {
              answerExposure: "server-confidential",
              priorExposure: false,
              masteryEligible: true,
            },
            {
              answerExposure: "public-client",
              priorExposure: false,
              masteryEligible: false,
            },
          ],
        },
      },
      projectedAttempts: [{
        position: 0,
        masteryEligible: true,
        verification: "server-objective",
      }],
      command: {
        projectionCursor: 12,
        manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      },
    });
    expect(adopted.commandSeed).toBe(adopted.anchor.command.adoptionKey);
    expect(adopted.sessionAlias).toBe(adopted.anchor.sessionAlias);
    expect(JSON.stringify(adopted.anchor)).not.toMatch(
      /"correctAnswer"|"selectedOption"|"response"|"answer":/u,
    );
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).resolves.toEqual(adopted);
  });

  it("refreshes by immutable extension and keeps local attempt echoes local", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected-reader")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());
    const first = await adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    const localItem = first.anchor.binding.form.items[1]!;
    await enqueueReaderAttemptCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: first.sessionAlias,
      enqueuedAt: RECORDED_AT,
      command: {
        protocolVersion: 1,
        idempotencyKey: "reader-attempt:second-device:1",
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
        itemId: localItem.itemId,
        itemVersion: localItem.itemVersion,
        position: localItem.position,
        selectedOption: localItem.options[0]!,
        occurredAt: RECORDED_AT,
      },
    });

    const advanced = await projection(
      await activeSession([0, 1]),
      { cursor: 13 },
    );
    await cacheProjection(ownerGeneration, advanced);
    const beforeRefresh = await listLearningCommandRecords(ownerGeneration);
    expect(projectedReaderAnchorRefreshDecision({
      anchor: first.anchor,
      projectionCursor: advanced.cursor,
      session: advanced.activeReaderSession!,
      records: beforeRefresh,
    })).toBe("refresh");

    const refreshed = await adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    expect(refreshed.anchor).toMatchObject({
      recordKey: first.anchor.recordKey,
      commandId: first.anchor.commandId,
      command: { projectionCursor: 13 },
      projectedAttempts: [{ position: 0 }],
    });
    expect(projectedReaderAnchorRefreshDecision({
      anchor: refreshed.anchor,
      projectionCursor: advanced.cursor,
      session: advanced.activeReaderSession!,
      records: await listLearningCommandRecords(ownerGeneration),
    })).toBe("current");
  });

  it("rejects regressed, rewritten, removed, or same-cursor attempt history", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected-reader")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());
    const first = await adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    const records = await listLearningCommandRecords(ownerGeneration);
    const baseSession = await activeSession();

    expect(projectedReaderAnchorRefreshDecision({
      anchor: first.anchor,
      projectionCursor: 11,
      session: baseSession,
      records,
    })).toBe("conflict");
    expect(projectedReaderAnchorRefreshDecision({
      anchor: first.anchor,
      projectionCursor: 12,
      session: await activeSession([0, 1]),
      records,
    })).toBe("conflict");
    expect(projectedReaderAnchorRefreshDecision({
      anchor: first.anchor,
      projectionCursor: 13,
      session: await activeSession([]),
      records,
    })).toBe("conflict");

    const rewritten = await activeSession();
    rewritten.attempts[0] = {
      ...rewritten.attempts[0]!,
      outcome: "incorrect",
      score: 0,
    };
    expect(projectedReaderAnchorRefreshDecision({
      anchor: first.anchor,
      projectionCursor: 13,
      session: rewritten,
      records,
    })).toBe("conflict");
    await cacheProjection(ownerGeneration, await projection(
      rewritten,
      { cursor: 13 },
    ));
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedReaderSessionAdoptionError);
  });

  it("detects changes to bank versions, form, support, exposure, and mastery authority", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected-reader")
    ).ownerGeneration;
    await cacheProjection(
      ownerGeneration,
      await projection(await activeSession([])),
    );
    const first = await adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    const records = await listLearningCommandRecords(ownerGeneration);

    const changedBankForm = structuredClone(form());
    changedBankForm.storyVersion =
      `${CONTENT_VERSION}:reader-story:projected:2`;
    changedBankForm.formVersion =
      `${CONTENT_VERSION}:reader-form:projected:2`;
    changedBankForm.items[0]!.itemVersion =
      `${CONTENT_VERSION}:reader-item:projected:confidential:2`;

    const changedExposureForm = structuredClone(form());
    changedExposureForm.items[0]!.answerExposure = "public-client";
    changedExposureForm.items[0]!.priorExposure = true;
    changedExposureForm.items[0]!.masteryEligible = false;

    const candidates = [
      await activeSession([], changedBankForm),
      await activeSession([], form("assisted")),
      await activeSession([], changedExposureForm),
    ];
    for (const session of candidates) {
      expect(projectedReaderAnchorRefreshDecision({
        anchor: first.anchor,
        projectionCursor: 13,
        session,
        records,
      })).toBe("conflict");
    }
  });

  it("requires the exact cached owner, reset, package, enrollment, and active session", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected-reader")
    ).ownerGeneration;
    await expect(adoptActiveReaderSessionFromCachedProjection({
      ...adoptionInput(ownerGeneration),
      projection: await projection(),
    } as unknown as AdoptActiveReaderSessionFromCachedProjectionInput))
      .rejects.toBeInstanceOf(ProjectedReaderSessionAdoptionError);

    await cacheProjection(ownerGeneration, await projection(null));
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedReaderSessionAdoptionError);

    await cacheProjection(ownerGeneration, await projection(
      await activeSession(),
      { manifestSha256: `sha256:${"f".repeat(64)}` },
    ));
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedReaderSessionAdoptionError);

    await cacheProjection(ownerGeneration, await projection(
      await activeSession(),
      { courseId: "other-course" },
    ));
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedReaderSessionAdoptionError);

    await cacheProjection(ownerGeneration, await projection());
    await expect(adoptActiveReaderSessionFromCachedProjection({
      ...adoptionInput(ownerGeneration),
      resetEpoch: 1,
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
      ownerKey: "account:other",
      generation: 2,
    });
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("rejects poisoned cached forms and attempts instead of persisting answer data", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected-reader")
    ).ownerGeneration;
    const leakedForm = await projection();
    (
      leakedForm.activeReaderSession!.form.items[0] as
        ReaderSessionFormV1["items"][number] & {
          correctAnswer: string;
        }
    ).correctAnswer = "学生";
    await cacheProjection(ownerGeneration, leakedForm);
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedReaderSessionAdoptionError);

    const leakedAttempt = await projection();
    (
      leakedAttempt.activeReaderSession!.attempts[0] as
        ActiveReaderAttemptProjectionV3 & { selectedOption: string }
    ).selectedOption = "学生";
    await cacheProjection(ownerGeneration, leakedAttempt);
    await expect(adoptActiveReaderSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedReaderSessionAdoptionError);
    expect((await listLearningCommandRecords(ownerGeneration)).filter(
      (record) => record.kind === "projected-reader-session-anchor",
    )).toEqual([]);
  });
});
