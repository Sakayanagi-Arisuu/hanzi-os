import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  type AuthoritativeReleasedLessonProgressV1,
} from "../learning/authoritativeProgress";
import type { OwnerGeneration } from "../sync/indexedDb";
import { hashAssessmentForm, type AssessmentFormV1 } from "./assessmentSessionProtocol";
import {
  buildNormalizedAssessmentAbandonQueueInput,
  buildNormalizedAssessmentAttemptQueueInput,
  buildNormalizedAssessmentOpenQueueInput,
  buildNormalizedAssessmentSubmissionQueueInput,
  deriveStableNormalizedAssessmentCommandIds,
  type NormalizedAssessmentQueueEnvironment,
} from "./normalizedAssessmentCommands";
import type { NormalizedAssessmentRuntimeV1 } from "./normalizedAssessmentRuntime";

const NOW = "2026-07-22T10:00:00.000Z";
const OPEN_COMMAND_ID = "assessment-open:commands:test";
const ENROLLMENT_ID = "enrollment:commands:test";

const environment: NormalizedAssessmentQueueEnvironment = {
  ownerGeneration: {
    ownerKey: "account:commands:test",
    generation: 2,
  } satisfies OwnerGeneration,
  resetEpoch: 3,
  installationId: "installation:commands:test",
  deviceId: "device:commands:test",
};

const progress = (
  overrides: Partial<AuthoritativeReleasedLessonProgressV1> = {},
): AuthoritativeReleasedLessonProgressV1 => ({
  schemaVersion: 1,
  resetEpoch: 3,
  cursor: 10,
  enrollmentId: ENROLLMENT_ID,
  courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  completedCount: 0,
  totalCount: 1,
  remainingCount: 1,
  progress: 0,
  lessons: [],
  nextLesson: null,
  ...overrides,
});

const assessmentForm = (): AssessmentFormV1 => ({
  schemaVersion: 1,
  blueprintId: "foundation:test",
  formVersion: `${CONTENT_VERSION}:assessment:test`,
  scoringPolicyVersion: "observed:test",
  items: [
    {
      position: 0,
      itemId: "item:a",
      itemVersion: `${CONTENT_VERSION}:item:a:1`,
      skill: "vocabulary",
      construct: "meaning",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "你",
      meta: "Meaning",
      options: ["tôi", "bạn"],
    },
    {
      position: 1,
      itemId: "item:b",
      itemVersion: `${CONTENT_VERSION}:item:b:1`,
      skill: "reading",
      construct: "sentence-reading",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "我是学生。",
      meta: "Reading",
      options: ["Tôi là sinh viên.", "Tôi là giáo viên."],
    },
  ],
});

const runtime = async (): Promise<NormalizedAssessmentRuntimeV1> => {
  const form = assessmentForm();
  return {
    schemaVersion: 1,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    resetEpoch: 3,
    enrollmentId: ENROLLMENT_ID,
    commandSeed: OPEN_COMMAND_ID,
    sessionId: "assessment-session:test",
    blueprintId: form.blueprintId,
    formVersion: form.formVersion,
    scoringPolicyVersion: form.scoringPolicyVersion,
    formHash: await hashAssessmentForm(form),
    startedAt: NOW,
    items: form.items,
  };
};

describe("normalized assessment command builders", () => {
  it("derives deterministic domain-separated aliases and command ids", async () => {
    const first = await deriveStableNormalizedAssessmentCommandIds(
      OPEN_COMMAND_ID,
      2,
    );
    const second = await deriveStableNormalizedAssessmentCommandIds(
      OPEN_COMMAND_ID,
      2,
    );
    expect(first).toEqual(second);
    expect(first.sessionAlias).toMatch(/^assessment:[a-f0-9]{64}$/u);
    expect(first.attemptCommandIds).toEqual([
      expect.stringMatching(/^assessment-attempt:[a-f0-9]{64}:0$/u),
      expect.stringMatching(/^assessment-attempt:[a-f0-9]{64}:1$/u),
    ]);
    await expect(deriveStableNormalizedAssessmentCommandIds(
      OPEN_COMMAND_ID,
      0,
    )).rejects.toThrow("item count");
  });

  it("opens only against exact current enrollment/reset authority", async () => {
    const queued = await buildNormalizedAssessmentOpenQueueInput({
      authoritativeProgress: progress(),
      environment,
      openCommandId: OPEN_COMMAND_ID,
      enqueuedAt: NOW,
    });
    expect(queued).toMatchObject({
      ownerGeneration: environment.ownerGeneration,
      expectedResetEpoch: 3,
      sessionAlias: expect.stringMatching(/^assessment:/u),
      command: {
        protocolVersion: 1,
        idempotencyKey: OPEN_COMMAND_ID,
        contentVersion: CONTENT_VERSION,
        enrollmentId: ENROLLMENT_ID,
      },
      enqueuedAt: NOW,
    });
    expect(queued.command).not.toHaveProperty("resetEpoch");
    expect(queued.command).not.toHaveProperty("deviceSequence");

    await expect(buildNormalizedAssessmentOpenQueueInput({
      authoritativeProgress: progress({ resetEpoch: 4 }),
      environment,
      openCommandId: OPEN_COMMAND_ID,
    })).rejects.toThrow("Exact current enrollment");
    await expect(buildNormalizedAssessmentOpenQueueInput({
      authoritativeProgress: progress({
        manifestSha256: `sha256:${"0".repeat(64)}`,
      }),
      environment,
      openCommandId: OPEN_COMMAND_ID,
    })).rejects.toThrow("Exact current enrollment");
  });

  it("binds each selection to the immutable position and issued option", async () => {
    const current = await runtime();
    const queued = await buildNormalizedAssessmentAttemptQueueInput(
      current,
      environment,
      {
        position: 1,
        selectedAnswer: "Tôi là sinh viên.",
        durationMs: 1_200,
        occurredAt: NOW,
      },
    );
    expect(queued).toMatchObject({
      expectedResetEpoch: 3,
      command: {
        protocolVersion: 1,
        itemId: "item:b",
        itemVersion: `${CONTENT_VERSION}:item:b:1`,
        response: {
          kind: "selection",
          answer: "Tôi là sinh viên.",
          durationMs: 1_200,
        },
      },
    });
    expect(queued.command).not.toHaveProperty("sessionId");
    expect(queued.command).not.toHaveProperty("formHash");
    await expect(buildNormalizedAssessmentAttemptQueueInput(
      current,
      environment,
      {
        position: 1,
        selectedAnswer: "Injected option",
        occurredAt: NOW,
      },
    )).rejects.toThrow("server-issued form");
  });

  it("queues an exact full-form terminal dependency set", async () => {
    const current = await runtime();
    const ids = await deriveStableNormalizedAssessmentCommandIds(
      OPEN_COMMAND_ID,
      current.items.length,
    );
    const submitted = await buildNormalizedAssessmentSubmissionQueueInput(
      current,
      environment,
      NOW,
    );
    expect(submitted).toMatchObject({
      sessionAlias: ids.sessionAlias,
      attemptCommandIds: ids.attemptCommandIds,
      command: {
        idempotencyKey: ids.submitCommandId,
        protocolVersion: 1,
      },
    });
    expect(submitted.command).not.toHaveProperty("sessionId");
    expect(submitted.command).not.toHaveProperty("formHash");

    const crossDeviceSubmission =
      await buildNormalizedAssessmentSubmissionQueueInput(
        current,
        environment,
        NOW,
        [1],
      );
    expect(crossDeviceSubmission.attemptCommandIds).toEqual([
      ids.attemptCommandIds[1],
    ]);
    await expect(buildNormalizedAssessmentSubmissionQueueInput(
      current,
      environment,
      NOW,
      [1, 1],
    )).rejects.toThrow("local attempt positions");
    await expect(buildNormalizedAssessmentSubmissionQueueInput(
      current,
      environment,
      NOW,
      [current.items.length],
    )).rejects.toThrow("local attempt positions");

    const abandoned = await buildNormalizedAssessmentAbandonQueueInput(
      current,
      environment,
      NOW,
    );
    expect(abandoned).toMatchObject({
      sessionAlias: ids.sessionAlias,
      dependencyCommandId: OPEN_COMMAND_ID,
      command: {
        idempotencyKey: ids.abandonCommandId,
        protocolVersion: 1,
      },
    });
  });

  it("rejects a stale or mutated runtime before producing a command", async () => {
    const stale = await runtime();
    stale.resetEpoch = 2;
    await expect(buildNormalizedAssessmentAttemptQueueInput(
      stale,
      environment,
      { position: 0, selectedAnswer: "bạn", occurredAt: NOW },
    )).rejects.toThrow("stale or invalid");

    const mutated = await runtime();
    mutated.items[0]!.prompt = "Substituted";
    await expect(buildNormalizedAssessmentSubmissionQueueInput(
      mutated,
      environment,
      NOW,
    )).rejects.toThrow("stale or invalid");
  });
});
