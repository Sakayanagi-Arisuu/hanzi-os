import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  hashAssessmentForm,
  type AssessmentFormV1,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../assessment/assessmentSessionProtocol";
import type {
  RecordAssessmentAttemptCommandV1,
  RecordAssessmentAttemptReceiptV1,
} from "../assessment/assessmentAttemptProtocol";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  writeSyncMeta,
  type OwnerGeneration,
} from "./indexedDb";
import {
  acknowledgeLearningCommand,
  enqueueAssessmentAttemptCommand,
  enqueueAssessmentSessionAbandonmentCommand,
  enqueueAssessmentSessionCommand,
  enqueueAssessmentSessionSubmissionCommand,
  LearningCommandConflictError,
  persistProjectedAssessmentSessionAnchor,
  prepareLearningCommand,
} from "./learningCommandOutbox";

const DATABASE_NAME = "hanzi-os-sync-v1";
const NOW = "2026-07-22T09:00:00.000Z";
const SESSION_ALIAS = "assessment:local:test";

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const form = (): AssessmentFormV1 => ({
  schemaVersion: 1,
  blueprintId: "assessment-blueprint:test",
  formVersion: `${CONTENT_VERSION}:assessment-form:test`,
  scoringPolicyVersion: "observed-wilson:test",
  items: [
    {
      position: 0,
      itemId: "assessment-item:vocabulary",
      itemVersion: `${CONTENT_VERSION}:assessment-item:vocabulary:1`,
      skill: "vocabulary",
      construct: "word-meaning-recognition",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "ni",
      meta: "Choose the meaning",
      options: ["you", "me"],
    },
    {
      position: 1,
      itemId: "assessment-item:listening",
      itemVersion: `${CONTENT_VERSION}:assessment-item:listening:1`,
      skill: "listening",
      construct: "phrase-identification",
      modality: "synthetic-tts-selection",
      measurementEligible: false,
      prompt: "Listen and choose",
      meta: "Synthetic TTS practice",
      options: ["hello", "thanks"],
      stimulusText: "xiexie",
    },
  ],
});

const sessionInput = (ownerGeneration: OwnerGeneration, resetEpoch = 0) => ({
  ownerGeneration,
  expectedResetEpoch: resetEpoch,
  sessionAlias: SESSION_ALIAS,
  enqueuedAt: NOW,
  command: {
    protocolVersion: 1 as const,
    idempotencyKey: "assessment-open:test",
    installationId: "installation:test",
    deviceId: "device:test",
    contentVersion: CONTENT_VERSION,
    enrollmentId: "enrollment:test",
  },
});

const openReceipt = async (
  command: OpenAssessmentSessionCommandV1,
): Promise<OpenAssessmentSessionReceiptV1> => {
  const issuedForm = form();
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    sessionId: "assessment-session:server:test",
    enrollmentId: command.enrollmentId,
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    blueprintId: issuedForm.blueprintId,
    formVersion: issuedForm.formVersion,
    scoringPolicyVersion: issuedForm.scoringPolicyVersion,
    expectedItemCount: issuedForm.items.length,
    form: issuedForm,
    formHash: await hashAssessmentForm(issuedForm),
    status: "started",
    startedAt: NOW,
  };
};

const attemptInput = (
  ownerGeneration: OwnerGeneration,
  position: number,
  commandId = `assessment-attempt:test:${position}`,
) => {
  const item = form().items[position]!;
  return {
    ownerGeneration,
    expectedResetEpoch: 0,
    sessionAlias: SESSION_ALIAS,
    enqueuedAt: NOW,
    command: {
      protocolVersion: 1 as const,
      idempotencyKey: commandId,
      installationId: "installation:test",
      deviceId: "device:test",
      contentVersion: CONTENT_VERSION,
      itemId: item.itemId,
      itemVersion: item.itemVersion,
      occurredAt: NOW,
      response: {
        kind: "selection" as const,
        answer: item.options[0]!,
        durationMs: 800,
      },
    },
  };
};

const attemptReceipt = (
  command: RecordAssessmentAttemptCommandV1,
  position: number,
): RecordAssessmentAttemptReceiptV1 => {
  const item = form().items[position]!;
  return {
    protocolVersion: 1,
    idempotencyKey: command.idempotencyKey,
    duplicate: false,
    attemptId: `server-attempt:${position}`,
    sessionId: command.sessionId,
    resetEpoch: command.resetEpoch,
    contentVersion: command.contentVersion,
    formHash: command.formHash,
    position,
    itemId: item.itemId,
    itemVersion: item.itemVersion,
    skill: item.skill,
    measurementEligible: item.measurementEligible,
    masteryEligible: false,
    status: "recorded",
    recordedAt: NOW,
  };
};

const acknowledgeOpen = async (ownerGeneration: OwnerGeneration) => {
  const session = await enqueueAssessmentSessionCommand(
    sessionInput(ownerGeneration),
  );
  const receipt = await openReceipt(session.command);
  await acknowledgeLearningCommand(
    session.recordKey,
    ownerGeneration,
    receipt,
    new Date(NOW),
  );
  return { session, receipt };
};

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("assessment learning-command outbox", () => {
  it("enforces reset CAS, exact form coverage, and one terminal command", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment")
    ).ownerGeneration;
    await expect(enqueueAssessmentSessionCommand(
      sessionInput(ownerGeneration, 1),
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);

    const { receipt } = await acknowledgeOpen(ownerGeneration);
    await expect(enqueueAssessmentAttemptCommand({
      ...attemptInput(ownerGeneration, 0, "assessment-attempt:outside"),
      command: {
        ...attemptInput(ownerGeneration, 0).command,
        idempotencyKey: "assessment-attempt:outside",
        itemId: "assessment-item:outside",
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);

    const first = await enqueueAssessmentAttemptCommand(
      attemptInput(ownerGeneration, 0),
    );
    expect("sessionId" in first.command).toBe(false);
    expect("formHash" in first.command).toBe(false);
    await expect(enqueueAssessmentAttemptCommand(
      attemptInput(ownerGeneration, 0, "assessment-attempt:duplicate-item"),
    )).rejects.toBeInstanceOf(LearningCommandConflictError);
    const second = await enqueueAssessmentAttemptCommand(
      attemptInput(ownerGeneration, 1),
    );

    const submission = {
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: SESSION_ALIAS,
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1 as const,
        idempotencyKey: "assessment-submit:test",
        installationId: "installation:test",
        deviceId: "device:test",
        contentVersion: CONTENT_VERSION,
      },
    };
    await expect(enqueueAssessmentSessionSubmissionCommand({
      ...submission,
      attemptCommandIds: [first.commandId],
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
    const terminal = await enqueueAssessmentSessionSubmissionCommand({
      ...submission,
      attemptCommandIds: [second.commandId, first.commandId],
    });
    expect("sessionId" in terminal.command).toBe(false);
    expect("formHash" in terminal.command).toBe(false);
    await expect(enqueueAssessmentSessionAbandonmentCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: SESSION_ALIAS,
      dependencyCommandId: "assessment-open:test",
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "assessment-abandon:test",
        installationId: "installation:test",
        deviceId: "device:test",
        contentVersion: CONTENT_VERSION,
      },
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
    await expect(enqueueAssessmentAttemptCommand(
      attemptInput(ownerGeneration, 1, "assessment-attempt:after-terminal"),
    )).rejects.toBeInstanceOf(LearningCommandConflictError);

    await expect(prepareLearningCommand(
      terminal.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({ state: "blocked" });
    for (const [position, attempt] of [first, second].entries()) {
      const prepared = await prepareLearningCommand(
        attempt.recordKey,
        ownerGeneration,
      );
      expect(prepared.state).toBe("ready");
      if (prepared.state !== "ready" || prepared.prepared.kind !== "assessment-attempt") {
        throw new Error("Assessment attempt was not ready.");
      }
      expect(prepared.prepared.command).toMatchObject({
        sessionId: receipt.sessionId,
        formHash: receipt.formHash,
      });
      await acknowledgeLearningCommand(
        attempt.recordKey,
        ownerGeneration,
        attemptReceipt(prepared.prepared.command, position),
        new Date(NOW),
      );
    }
    await expect(prepareLearningCommand(
      terminal.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "assessment-session-submit",
        command: {
          sessionId: receipt.sessionId,
          formHash: receipt.formHash,
        },
        attemptReceipts: [{ position: 0 }, { position: 1 }],
        projectedAttempts: [],
      },
    });
  });

  it("adopts answer-free projected attempts without inventing an open receipt", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment")
    ).ownerGeneration;
    const issued = await openReceipt({
      ...sessionInput(ownerGeneration).command,
      deviceSequence: 1,
      resetEpoch: 0,
    });
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = issued;
    const anchor = await persistProjectedAssessmentSessionAnchor({
      ownerGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 17,
      binding,
      projectedAttempts: [{
        attemptId: "server-attempt:projected:0",
        position: 0,
        itemId: binding.form.items[0]!.itemId,
        itemVersion: binding.form.items[0]!.itemVersion,
        skill: binding.form.items[0]!.skill,
        measurementEligible: binding.form.items[0]!.measurementEligible,
        masteryEligible: false,
        status: "recorded",
        recordedAt: NOW,
      }],
      adoptedAt: NOW,
    });
    expect(anchor).toMatchObject({
      kind: "projected-assessment-session-anchor",
      status: "acknowledged",
      receipt: null,
    });
    await expect(enqueueAssessmentAttemptCommand({
      ...attemptInput(ownerGeneration, 0, "assessment-attempt:projected-again"),
      sessionAlias: anchor.sessionAlias,
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
    const localAttempt = await enqueueAssessmentAttemptCommand({
      ...attemptInput(ownerGeneration, 1, "assessment-attempt:adopted:1"),
      sessionAlias: anchor.sessionAlias,
    });
    const preparedAttempt = await prepareLearningCommand(
      localAttempt.recordKey,
      ownerGeneration,
    );
    if (
      preparedAttempt.state !== "ready"
      || preparedAttempt.prepared.kind !== "assessment-attempt"
    ) throw new Error("Adopted assessment attempt was not ready.");
    await acknowledgeLearningCommand(
      localAttempt.recordKey,
      ownerGeneration,
      attemptReceipt(preparedAttempt.prepared.command, 1),
      new Date(NOW),
    );
    const submission = await enqueueAssessmentSessionSubmissionCommand({
      ownerGeneration,
      expectedResetEpoch: 0,
      sessionAlias: anchor.sessionAlias,
      attemptCommandIds: [localAttempt.commandId],
      enqueuedAt: NOW,
      command: {
        protocolVersion: 1,
        idempotencyKey: "assessment-submit:adopted",
        installationId: "installation:test",
        deviceId: "device:test",
        contentVersion: CONTENT_VERSION,
      },
    });
    await expect(prepareLearningCommand(
      submission.recordKey,
      ownerGeneration,
    )).resolves.toMatchObject({
      state: "ready",
      prepared: {
        kind: "assessment-session-submit",
        command: {
          sessionId: binding.sessionId,
          formHash: binding.formHash,
        },
        attemptReceipts: [{ position: 1 }],
        projectedAttempts: [{ position: 0 }],
      },
    });
  });

  it("refreshes one logical projected anchor across cursors and owner generations", async () => {
    const initialGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment")
    ).ownerGeneration;
    const issued = await openReceipt({
      ...sessionInput(initialGeneration).command,
      deviceSequence: 1,
      resetEpoch: 0,
    });
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = issued;
    const projectedAttempt = (position: number) => ({
      attemptId: `server-attempt:refresh:${position}`,
      position,
      itemId: binding.form.items[position]!.itemId,
      itemVersion: binding.form.items[position]!.itemVersion,
      skill: binding.form.items[position]!.skill,
      measurementEligible:
        binding.form.items[position]!.measurementEligible,
      masteryEligible: false as const,
      status: "recorded" as const,
      recordedAt: NOW,
    });
    const first = await persistProjectedAssessmentSessionAnchor({
      ownerGeneration: initialGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 17,
      binding,
      projectedAttempts: [projectedAttempt(0)],
      adoptedAt: NOW,
    });

    const nextGeneration = {
      ownerKey: initialGeneration.ownerKey,
      generation: initialGeneration.generation + 1,
    };
    await writeSyncMeta(
      ACTIVE_OWNER_GENERATION_KEY,
      nextGeneration,
    );
    const refreshed = await persistProjectedAssessmentSessionAnchor({
      ownerGeneration: nextGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 18,
      binding,
      projectedAttempts: [projectedAttempt(0), projectedAttempt(1)],
      adoptedAt: "2026-07-22T09:01:00.000Z",
    });
    expect(refreshed).toMatchObject({
      recordKey: first.recordKey,
      commandId: first.commandId,
      sessionAlias: first.sessionAlias,
      command: { projectionCursor: 18 },
      projectedAttempts: [{ position: 0 }, { position: 1 }],
    });
    expect(refreshed.deviceSequence).toBe(first.deviceSequence);

    await expect(persistProjectedAssessmentSessionAnchor({
      ownerGeneration: nextGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 16,
      binding,
      projectedAttempts: [projectedAttempt(0), projectedAttempt(1)],
      adoptedAt: NOW,
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
    await expect(persistProjectedAssessmentSessionAnchor({
      ownerGeneration: nextGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 19,
      binding,
      projectedAttempts: [projectedAttempt(1)],
      adoptedAt: NOW,
    })).rejects.toBeInstanceOf(LearningCommandConflictError);
  });

  it("rejects a projected anchor whose form violates the shared protocol", async () => {
    const ownerGeneration = (
      await readOrInitializeOwnerGeneration("account:assessment")
    ).ownerGeneration;
    const issued = await openReceipt({
      ...sessionInput(ownerGeneration).command,
      deviceSequence: 1,
      resetEpoch: 0,
    });
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = issued;
    binding.form.items[0]!.options = ["é", " e\u0301 "];
    binding.formHash = await hashAssessmentForm(binding.form);
    await expect(persistProjectedAssessmentSessionAnchor({
      ownerGeneration,
      installationId: "installation:test",
      deviceId: "device:test",
      resetEpoch: 0,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      projectionCursor: 18,
      binding,
      projectedAttempts: [],
      adoptedAt: NOW,
    })).rejects.toThrow(
      "Projected assessment-session authority binding is invalid.",
    );
  });
});
