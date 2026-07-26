import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hashAssessmentForm,
  type AssessmentFormV1,
} from "../assessment/assessmentSessionProtocol";
import { deriveStableNormalizedAssessmentCommandIds } from "../assessment/normalizedAssessmentCommands";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  emptyObjectiveEvidenceProjection,
  type ActiveAssessmentSessionProjectionV2,
  type NormalizedLearningProjectionV2,
} from "../learning/projectionProtocol";
import {
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  writeLearningProjection,
  writeSyncMeta,
  ACTIVE_OWNER_GENERATION_KEY,
  type OwnerGeneration,
} from "./indexedDb";
import {
  enqueueAssessmentAttemptCommand,
  listLearningCommandRecords,
} from "./learningCommandOutbox";
import {
  NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
} from "./learningProjectionClient";
import {
  adoptActiveAssessmentSessionFromCachedProjection,
  projectedAssessmentAnchorRefreshDecision,
  ProjectedAssessmentSessionAdoptionError,
} from "./projectedAssessmentSessionAdoption";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = "2026-07-25T08:00:00.000Z";

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const form = (): AssessmentFormV1 => ({
  schemaVersion: 1,
  blueprintId: "assessment-blueprint:projected",
  formVersion: `${CONTENT_VERSION}:assessment-form:projected`,
  scoringPolicyVersion: "observed-wilson:projected",
  items: [
    {
      position: 0,
      itemId: "assessment-item:projected:vocabulary",
      itemVersion: `${CONTENT_VERSION}:assessment-item:projected:vocabulary:1`,
      skill: "vocabulary",
      construct: "word-meaning-recognition",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "Select the closest meaning.",
      meta: "Vocabulary recognition",
      options: ["you", "me"],
    },
    {
      position: 1,
      itemId: "assessment-item:projected:listening",
      itemVersion: `${CONTENT_VERSION}:assessment-item:projected:listening:1`,
      skill: "listening",
      construct: "phrase-identification",
      modality: "synthetic-tts-selection",
      measurementEligible: false,
      prompt: "Listen and select.",
      meta: "Synthetic TTS practice",
      options: ["hello", "thanks"],
      stimulusText: "xiexie",
    },
  ],
});

const activeSession = async (
  providedFormHash?: `sha256:${string}`,
  attemptPositions: readonly number[] = [0],
): Promise<ActiveAssessmentSessionProjectionV2> => {
  const issuedForm = form();
  return {
    sessionId: "assessment-session:projected",
    enrollmentId: "enrollment:projected",
    resetEpoch: 0,
    contentVersion: CONTENT_VERSION,
    blueprintId: issuedForm.blueprintId,
    formVersion: issuedForm.formVersion,
    scoringPolicyVersion: issuedForm.scoringPolicyVersion,
    expectedItemCount: issuedForm.items.length,
    form: issuedForm,
    formHash: providedFormHash ?? await hashAssessmentForm(issuedForm),
    status: "started",
    startedAt: NOW,
    attempts: attemptPositions.map((position) => {
      const item = issuedForm.items[position]!;
      return {
        attemptId: `assessment-attempt:server:${position}`,
        position,
        itemId: item.itemId,
        itemVersion: item.itemVersion,
        skill: item.skill,
        measurementEligible: item.measurementEligible,
        masteryEligible: false,
        status: "recorded",
        recordedAt: NOW,
      };
    }),
  };
};

const projection = async (
  session?: ActiveAssessmentSessionProjectionV2 | null,
  manifestSha256 = CURRENT_CONTENT_MANIFEST_SHA256,
  cursor = 12,
): Promise<NormalizedLearningProjectionV2> => {
  const activeAssessmentSession = session === undefined
    ? await activeSession()
    : session;
  return {
    protocolVersion: 2,
    resetEpoch: 0,
    cursor,
    contentVersion: CONTENT_VERSION,
    manifestSha256,
    enrollment: {
      enrollmentId: "enrollment:projected",
      contentVersion: CONTENT_VERSION,
      courseId: "mandarin-foundations-v1",
      manifestSha256,
      releaseState: "beta",
      goal: "conversation",
    },
    activeLessonSessions: [],
    submittedLessons: [],
    objectiveEvidence: emptyObjectiveEvidenceProjection(),
    activeAssessmentSession,
    latestAssessmentResult: null,
  };
};

const cacheProjection = (
  ownerGeneration: OwnerGeneration,
  value: NormalizedLearningProjectionV2,
) => writeLearningProjection({
  expectedOwnerGeneration: ownerGeneration,
  resetEpoch: 0,
  entryKey: NORMALIZED_LEARNING_PROJECTION_V2_CACHE_KEY,
  value,
  updatedAt: NOW,
});

const adoptionInput = (ownerGeneration: OwnerGeneration) => ({
  ownerGeneration,
  resetEpoch: 0,
  sessionId: "assessment-session:projected",
  installationId: "installation:second-device",
  deviceId: "device:second-device",
  adoptedAt: NOW,
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("projected active assessment-session adoption", () => {
  it("adopts only the answer-free V2 binding and preserves projected coverage", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());

    const adopted = await adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );

    expect(adopted.anchor).toMatchObject({
      kind: "projected-assessment-session-anchor",
      status: "acknowledged",
      receipt: null,
      binding: {
        sessionId: "assessment-session:projected",
        formHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      },
      projectedAttempts: [{
        position: 0,
        status: "recorded",
        masteryEligible: false,
      }],
      command: {
        projectionCursor: 12,
        manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      },
    });
    expect(adopted.commandSeed).toBe(adopted.anchor.command.adoptionKey);
    expect(adopted.sessionAlias).toBe(adopted.anchor.sessionAlias);
    expect(JSON.stringify(adopted.anchor)).not.toMatch(
      /correct|answer|response|explanation/iu,
    );

    await expect(adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).resolves.toEqual(adopted);
  });

  it("refreshes the existing anchor when the cached cursor and remote coverage advance", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected")
    ).ownerGeneration;
    const initialProjection = await projection();
    await cacheProjection(ownerGeneration, initialProjection);
    const first = await adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );

    const advancedProjection = await projection(
      await activeSession(undefined, [0, 1]),
      CURRENT_CONTENT_MANIFEST_SHA256,
      13,
    );
    await cacheProjection(ownerGeneration, advancedProjection);
    const beforeRefresh = await listLearningCommandRecords(ownerGeneration);
    expect(projectedAssessmentAnchorRefreshDecision({
      anchor: first.anchor,
      projectionCursor: advancedProjection.cursor,
      session: advancedProjection.activeAssessmentSession!,
      records: beforeRefresh,
    })).toBe("refresh");

    const refreshed = await adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    expect(refreshed.anchor).toMatchObject({
      recordKey: first.anchor.recordKey,
      commandId: first.anchor.commandId,
      command: { projectionCursor: 13 },
      projectedAttempts: [{ position: 0 }, { position: 1 }],
    });
    expect(projectedAssessmentAnchorRefreshDecision({
      anchor: refreshed.anchor,
      projectionCursor: advancedProjection.cursor,
      session: advancedProjection.activeAssessmentSession!,
      records: await listLearningCommandRecords(ownerGeneration),
    })).toBe("current");
  });

  it("keeps a projected echo of a child command under local receipt authority", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection());
    const first = await adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    const ids = await deriveStableNormalizedAssessmentCommandIds(
      first.commandSeed,
      first.anchor.binding.form.items.length,
    );
    const localItem = first.anchor.binding.form.items[1]!;
    await enqueueAssessmentAttemptCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: first.sessionAlias,
      command: {
        protocolVersion: 1,
        idempotencyKey: ids.attemptCommandIds[1]!,
        installationId: "installation:second-device",
        deviceId: "device:second-device",
        contentVersion: CONTENT_VERSION,
        itemId: localItem.itemId,
        itemVersion: localItem.itemVersion,
        occurredAt: NOW,
        response: {
          kind: "selection",
          answer: localItem.options[0]!,
        },
      },
      enqueuedAt: NOW,
    });

    const advancedProjection = await projection(
      await activeSession(undefined, [0, 1]),
      CURRENT_CONTENT_MANIFEST_SHA256,
      13,
    );
    await cacheProjection(ownerGeneration, advancedProjection);
    const refreshed = await adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    );
    expect(refreshed.anchor).toMatchObject({
      recordKey: first.anchor.recordKey,
      command: { projectionCursor: 13 },
      projectedAttempts: [{ position: 0 }],
    });
    expect(projectedAssessmentAnchorRefreshDecision({
      anchor: refreshed.anchor,
      projectionCursor: advancedProjection.cursor,
      session: advancedProjection.activeAssessmentSession!,
      records: await listLearningCommandRecords(ownerGeneration),
    })).toBe("current");
  });

  it("requires the exact cached V2 session, owner, reset, and package scope", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected")
    ).ownerGeneration;
    await expect(adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedAssessmentSessionAdoptionError);

    await cacheProjection(ownerGeneration, await projection(null));
    await expect(adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedAssessmentSessionAdoptionError);

    await cacheProjection(ownerGeneration, await projection(
      await activeSession(),
      `sha256:${"f".repeat(64)}`,
    ));
    await expect(adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedAssessmentSessionAdoptionError);

    await cacheProjection(ownerGeneration, await projection());
    await expect(adoptActiveAssessmentSessionFromCachedProjection({
      ...adoptionInput(ownerGeneration),
      resetEpoch: 1,
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, {
      ownerKey: "account:other",
      generation: 2,
    });
    await expect(adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("rejects a projected form whose cryptographic binding drifted", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:projected")
    ).ownerGeneration;
    await cacheProjection(ownerGeneration, await projection(
      await activeSession(`sha256:${"0".repeat(64)}`),
    ));

    await expect(adoptActiveAssessmentSessionFromCachedProjection(
      adoptionInput(ownerGeneration),
    )).rejects.toBeInstanceOf(ProjectedAssessmentSessionAdoptionError);
  });
});
