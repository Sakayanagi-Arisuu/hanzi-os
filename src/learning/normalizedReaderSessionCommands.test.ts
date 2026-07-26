import { describe, expect, it } from "vitest";
import {
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_VERSION,
} from "../content/currentContentIdentity";
import {
  hashReaderSessionForm,
  type ReaderSessionAuthorityBindingV1,
  type ReaderSessionFormV1,
} from "../reader/readerSessionProtocol";
import type { AuthoritativeReleasedLessonProgressV1 } from "./authoritativeProgress";
import {
  buildNormalizedReaderSessionAbandonmentQueueInput,
  buildNormalizedReaderSessionAttemptQueueInput,
  buildNormalizedReaderSessionOpenQueueInput,
  buildNormalizedReaderSessionSubmissionQueueInput,
  deriveStableNormalizedReaderCommandIds,
  type NormalizedReaderSessionQueueContextV1,
} from "./normalizedReaderSessionCommands";

const progress = (): AuthoritativeReleasedLessonProgressV1 => ({
  schemaVersion: 1,
  resetEpoch: 0,
  cursor: 1,
  enrollmentId: "enrollment:test",
  courseId: "hanzi-os-core",
  contentVersion: CURRENT_CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  completedCount: 0,
  totalCount: 0,
  remainingCount: 0,
  progress: 0,
  nextLesson: null,
  lessons: [],
});

const environment = {
  ownerGeneration: { ownerKey: "account:test", generation: 1 },
  resetEpoch: 0,
  installationId: "installation:test",
  deviceId: "device:test",
} as const;

const serverForm = (
  supportMode: "assisted" | "unassisted" = "unassisted",
): ReaderSessionFormV1 => ({
  formSchemaVersion: 1,
  storyId: "server-reader-story",
  storyVersion: `${CURRENT_CONTENT_VERSION}:server-reader-story:1`,
  formVersion: `${CURRENT_CONTENT_VERSION}:server-reader-form:1`,
  script: "simplified",
  supportMode,
  supportPolicyVersion: "reader-support-v1",
  items: [{
    position: 0,
    itemId: "server-reader-item",
    itemVersion: `${CURRENT_CONTENT_VERSION}:server-reader-item:1`,
    method: "reading-comprehension",
    skill: "reading",
    chineseStimulus: "\u4f60\u597d\u3002",
    prompt: "What happened?",
    options: ["Greeting", "Farewell"],
    answerExposure: "server-confidential",
    priorExposure: supportMode === "assisted",
    masteryEligible: supportMode === "unassisted",
  }],
});

const sessionContext = async (
  supportMode: "assisted" | "unassisted" = "unassisted",
): Promise<NormalizedReaderSessionQueueContextV1> => {
  const form = serverForm(supportMode);
  const binding: ReaderSessionAuthorityBindingV1 = {
    sessionId: `reader-session:${supportMode}`,
    enrollmentId: "enrollment:test",
    resetEpoch: 0,
    contentVersion: CURRENT_CONTENT_VERSION,
    storyId: form.storyId,
    storyVersion: form.storyVersion,
    formVersion: form.formVersion,
    formSchemaVersion: 1,
    script: form.script,
    supportMode: form.supportMode,
    supportPolicyVersion: form.supportPolicyVersion,
    expectedItemCount: form.items.length,
    form,
    formHash: await hashReaderSessionForm(form),
    status: "started",
    startedAt: "2026-07-22T00:00:00.000Z",
  };
  return {
    schemaVersion: 1,
    commandSeed: `reader-open:${supportMode}`,
    binding,
  };
};

describe("normalized Reader session command builders", () => {
  it("derives stable ids and opens from identifiers without an answer bank", async () => {
    const ids = await deriveStableNormalizedReaderCommandIds(
      "reader-open:test",
      1,
    );
    await expect(deriveStableNormalizedReaderCommandIds(
      "reader-open:test",
      1,
    )).resolves.toEqual(ids);
    const queued = await buildNormalizedReaderSessionOpenQueueInput({
      storyId: "server-reader-story",
      script: "simplified",
      supportMode: "unassisted",
      authoritativeProgress: progress(),
      environment,
      openCommandId: "reader-open:test",
      enqueuedAt: "2026-07-22T00:00:00.000Z",
    });
    expect(queued).toMatchObject({
      sessionAlias: ids.sessionAlias,
      command: {
        idempotencyKey: ids.commandSeed,
        storyId: "server-reader-story",
        supportMode: "unassisted",
      },
    });
    expect(JSON.stringify(queued)).not.toMatch(
      /correctAnswer|answerKey|explanation|outcome|score|masteryEligible/u,
    );
  });

  it("builds an attempt only from the exact answer-free issued form", async () => {
    const context = await sessionContext();
    const queued = await buildNormalizedReaderSessionAttemptQueueInput(
      context,
      environment,
      {
        position: 0,
        selectedOption: "Greeting",
        occurredAt: "2026-07-22T00:01:00.000Z",
        durationMs: 700,
      },
    );
    expect(queued.command).toMatchObject({
      itemId: context.binding.form.items[0]!.itemId,
      itemVersion: context.binding.form.items[0]!.itemVersion,
      position: 0,
      selectedOption: "Greeting",
    });
    expect(JSON.stringify(queued.command)).not.toMatch(
      /answerKey|correct|outcome|score|masteryEligible/u,
    );
    await expect(buildNormalizedReaderSessionAttemptQueueInput(
      context,
      environment,
      {
        position: 0,
        selectedOption: "Injected",
        occurredAt: "2026-07-22T00:01:00.000Z",
      },
    )).rejects.toThrow(
      "Reader selection is not in the server-issued form.",
    );
    await expect(buildNormalizedReaderSessionAttemptQueueInput(
      {
        ...context,
        binding: {
          ...context.binding,
          sessionId: "substituted-session",
          formHash: `sha256:${"0".repeat(64)}`,
        },
      },
      environment,
      {
        position: 0,
        selectedOption: "Greeting",
        occurredAt: "2026-07-22T00:01:00.000Z",
      },
    )).rejects.toThrow(
      "Exact answer-free Reader session authority is required.",
    );
  });

  it("binds submission, abandonment, and assisted downgrade without authoring results", async () => {
    const context = await sessionContext();
    const ids = await deriveStableNormalizedReaderCommandIds(
      context.commandSeed,
      context.binding.expectedItemCount,
    );
    const submission =
      await buildNormalizedReaderSessionSubmissionQueueInput(
        context,
        environment,
        "2026-07-22T00:02:00.000Z",
      );
    expect(submission).toMatchObject({
      attemptCommandIds: ids.attemptCommandIds,
      command: {
        idempotencyKey: ids.submitCommandId,
        expectedItemCount: 1,
      },
    });
    const abandonment =
      await buildNormalizedReaderSessionAbandonmentQueueInput(
        context,
        environment,
        "support-requested",
        "2026-07-22T00:02:00.000Z",
      );
    expect(abandonment).toMatchObject({
      dependencyCommandId: context.commandSeed,
      command: {
        idempotencyKey: ids.abandonCommandId,
        reason: "support-requested",
      },
    });
    const assisted = await buildNormalizedReaderSessionOpenQueueInput({
      storyId: context.binding.storyId,
      script: context.binding.script,
      supportMode: "assisted",
      authoritativeProgress: progress(),
      environment,
      openCommandId: "reader-open:assisted",
      supportDowngradeDependencyCommandId: ids.abandonCommandId,
    });
    expect(assisted).toMatchObject({
      supportDowngradeDependencyCommandId: ids.abandonCommandId,
      command: { supportMode: "assisted" },
    });
    expect(JSON.stringify({ submission, abandonment, assisted })).not.toMatch(
      /correctCount|results|outcome|score|masteryEligible/u,
    );
  });
});
