import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import {
  CONTENT_VERSION,
  LESSON_BY_ID,
  RELEASED_LESSONS,
} from "../data/curriculum";
import {
  buildExerciseCatalog,
  buildExercises,
  type Exercise,
} from "../lib/exerciseGeneration";
import type { OwnerGeneration } from "../sync/indexedDb";
import type { Lesson } from "../types";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  deriveAuthoritativeReleasedLessonProgress,
  type AuthoritativeReleasedLessonProgressV1,
} from "./authoritativeProgress";
import {
  emptyObjectiveEvidenceProjection,
  type NormalizedLearningProjectionV1,
  type SubmittedLessonProjectionV1,
} from "./projectionProtocol";
import {
  hashLessonSessionForm,
  type LessonSessionAuthorityBindingV1,
  type LessonSessionFormV1,
  type OpenLessonSessionReceiptV1,
} from "./lessonSessionProtocol";
import {
  buildNormalizedLessonAbandonQueueInput,
  buildNormalizedLessonAttemptQueueInput,
  buildNormalizedLessonOpenQueueInput,
  buildNormalizedLessonSubmissionQueueInput,
  deriveStableNormalizedLessonCommandIds,
  type NormalizedLessonQueueEnvironment,
} from "./normalizedLessonCommands";
import {
  materializeNormalizedLessonRuntime,
  materializeNormalizedLessonRuntimeFromAuthorityBinding,
  type MaterializeNormalizedLessonRuntimeInput,
  type NormalizedLessonRuntimeV1,
} from "./normalizedLessonRuntime";

const ROOT_LESSON = LESSON_BY_ID.get("boot-1")!;
const LOCKED_LESSON = LESSON_BY_ID.get("boot-2")!;
const SYNTHETIC_DRAFT_LESSON: Lesson = {
  ...ROOT_LESSON,
  id: "synthetic-draft-lesson",
  title: `${ROOT_LESSON.title} (draft fixture)`,
  releaseState: "draft",
  prerequisiteIds: [],
};
const ENROLLMENT_ID = "enrollment:runtime";
const OPEN_COMMAND_ID = "lesson-open:runtime:test";
const NOW = "2026-07-22T10:00:00.000Z";

const methodForExercise = (exercise: Exercise) => {
  switch (exercise.kind) {
    case "meaning": return "meaning-selection" as const;
    case "pinyin":
    case "tone":
    case "tone-pair": return "phonology-recognition" as const;
    case "listening": return "listening-selection" as const;
    case "recall": return "typed-character-recall" as const;
    case "sentence": return "reading-comprehension" as const;
  }
};

const submitted = (lesson: Lesson): SubmittedLessonProjectionV1 => ({
  enrollmentId: ENROLLMENT_ID,
  contentVersion: CONTENT_VERSION,
  lessonId: lesson.id,
  lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
  submittedSessionCount: 1,
  passedSessionCount: 1,
  passed: true,
  bestRawScore: 100,
  bestGateScore: 100,
  lastSubmittedAt: NOW,
});

const progress = (
  passedLessons: Lesson[] = [],
): AuthoritativeReleasedLessonProgressV1 => {
  const projection: NormalizedLearningProjectionV1 = {
    protocolVersion: 1,
    resetEpoch: 3,
    cursor: 19,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    enrollment: {
      enrollmentId: ENROLLMENT_ID,
      contentVersion: CONTENT_VERSION,
      courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
      manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
      releaseState: "beta",
      goal: "conversation",
    },
    activeLessonSessions: [],
    submittedLessons: passedLessons.map(submitted),
    objectiveEvidence: emptyObjectiveEvidenceProjection(),
  };
  const result = deriveAuthoritativeReleasedLessonProgress(projection);
  if (!result) throw new Error("Test projection must yield exact progress.");
  return result;
};

const releasedPrerequisitesFor = (lesson: Lesson): Lesson[] => {
  const prerequisites: Lesson[] = [];
  const visited = new Set<string>();

  const visit = (lessonId: string) => {
    if (visited.has(lessonId)) return;
    const prerequisite = LESSON_BY_ID.get(lessonId);
    if (!prerequisite) {
      throw new Error(`Released prerequisite ${lessonId} must exist.`);
    }
    for (const prerequisiteId of prerequisite.prerequisiteIds) {
      visit(prerequisiteId);
    }
    visited.add(lessonId);
    prerequisites.push(prerequisite);
  };

  for (const prerequisiteId of lesson.prerequisiteIds) {
    visit(prerequisiteId);
  }
  return prerequisites;
};

const formFor = (
  lesson: Lesson,
  script: "simplified" | "traditional" = "simplified",
  reverse = false,
  random: () => number = () => 0.375,
): LessonSessionFormV1 => {
  const exercises = buildExercises(lesson, script, random);
  const ordered = reverse ? [...exercises].reverse() : exercises;
  return {
    schemaVersion: 1,
    script,
    activities: ordered.map((exercise, position) => ({
      position,
      activityId: `${lesson.id}:${exercise.id}`,
      activityVersion: exercise.activityVersion,
      method: methodForExercise(exercise),
      skill: exercise.skill,
      requiredForPass: exercise.requiredForPass === true,
    })),
  };
};

const commandKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(commandKeys);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...commandKeys(child)]);
};

const receiptFor = async (
  lesson: Lesson = ROOT_LESSON,
  form = formFor(lesson),
): Promise<OpenLessonSessionReceiptV1> => ({
  protocolVersion: 1,
  idempotencyKey: OPEN_COMMAND_ID,
  duplicate: false,
  sessionId: "session:runtime",
  enrollmentId: ENROLLMENT_ID,
  contentVersion: CONTENT_VERSION,
  resetEpoch: 3,
  lessonId: lesson.id,
  lessonVersion: `${CONTENT_VERSION}:${lesson.id}:1`,
  expectedEvidenceCount: form.activities.length,
  form,
  formHash: await hashLessonSessionForm(form),
  status: "started",
  startedAt: NOW,
});

const materializeInput = async (
  lesson: Lesson = ROOT_LESSON,
  authoritativeProgress = progress(),
  form = formFor(lesson),
): Promise<MaterializeNormalizedLessonRuntimeInput> => ({
  lesson,
  script: form.script,
  receipt: await receiptFor(lesson, form),
  authoritativeProgress,
  expectedOpenCommandId: OPEN_COMMAND_ID,
});

const materializeValid = async (
  lesson: Lesson = ROOT_LESSON,
  authoritativeProgress = progress(),
  form = formFor(lesson),
): Promise<NormalizedLessonRuntimeV1> => {
  const result = await materializeNormalizedLessonRuntime(
    await materializeInput(lesson, authoritativeProgress, form),
  );
  if (!result.ok) throw new Error(`${result.code}: ${result.reason}`);
  return result.runtime;
};

const environment: NormalizedLessonQueueEnvironment = {
  ownerGeneration: {
    ownerKey: "account:runtime",
    generation: 4,
  } satisfies OwnerGeneration,
  resetEpoch: 3,
  installationId: "installation:runtime",
  deviceId: "device:runtime",
};

describe("normalized lesson server-form materializer", () => {
  it("materializes projected authority without fabricating open receipt metadata", async () => {
    const receipt = await receiptFor();
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = receipt;
    const commandSeed = "projected-session-anchor:test";
    const result = await materializeNormalizedLessonRuntimeFromAuthorityBinding({
      lesson: ROOT_LESSON,
      script: "simplified",
      binding: binding satisfies LessonSessionAuthorityBindingV1,
      authoritativeProgress: progress(),
      commandSeed,
    });

    expect(result).toMatchObject({
      ok: true,
      runtime: {
        commandSeed,
        sessionId: receipt.sessionId,
        formHash: receipt.formHash,
      },
    });
    expect(result.ok && Object.hasOwn(result.runtime, "openCommandId")).toBe(false);
    await expect(materializeNormalizedLessonRuntimeFromAuthorityBinding({
      lesson: ROOT_LESSON,
      script: "simplified",
      binding: { ...binding, idempotencyKey: "synthetic-open" },
      authoritativeProgress: progress(),
      commandSeed,
    })).resolves.toMatchObject({
      ok: false,
      code: "authority-binding-invalid",
    });
  });

  it("uses only the exact server form selection and order", async () => {
    const serverForm = formFor(ROOT_LESSON, "simplified", true);
    const runtime = await materializeValid(ROOT_LESSON, progress(), serverForm);

    expect(runtime.activities.map((activity) => activity.activityId)).toEqual(
      serverForm.activities.map((activity) => activity.activityId),
    );
    expect(runtime.activities.map((activity) => activity.position)).toEqual(
      serverForm.activities.map((activity) => activity.position),
    );
    expect(runtime.activities.every((activity) =>
      !Object.hasOwn(activity, "correct")
      && !Object.hasOwn(activity, "answerKey")
      && !Object.hasOwn(activity, "explanation")
    )).toBe(true);
  });

  it("resolves randomized forms for every released lesson from form-independent catalogs", async () => {
    const presentations = new Map<string, string>();
    let reusedPresentationCount = 0;
    for (const lesson of RELEASED_LESSONS) {
      const authoritativeProgress = progress(releasedPrerequisitesFor(lesson));
      for (const script of ["simplified", "traditional"] as const) {
        for (const randomValue of [0.05, 0.55]) {
          const serverForm = formFor(
            lesson,
            script,
            false,
            () => randomValue,
          );
          const runtime = await materializeValid(
            lesson,
            authoritativeProgress,
            serverForm,
          );
          expect(runtime.activities.map((activity) => activity.activityId)).toEqual(
            serverForm.activities.map((activity) => activity.activityId),
          );
          for (const activity of runtime.activities) {
            const key = `${script}:${activity.activityId}`;
            const serialized = JSON.stringify({ ...activity, position: 0 });
            const previous = presentations.get(key);
            if (previous !== undefined) {
              expect(serialized).toBe(previous);
              reusedPresentationCount += 1;
            }
            presentations.set(key, serialized);
          }
        }
      }
    }
    expect(reusedPresentationCount).toBeGreaterThan(0);
  });

  it("does not expose feedback text or a typed-recall answer in presentation", async () => {
    const serverForm = formFor(
      ROOT_LESSON,
      "simplified",
      false,
      () => 0.1,
    );
    const runtime = await materializeValid(ROOT_LESSON, progress(), serverForm);
    const recall = runtime.activities.find((activity) => activity.kind === "recall");

    expect(recall).toBeDefined();
    expect(recall).not.toHaveProperty("spokenText");
    for (const activity of runtime.activities) {
      expect(activity).not.toHaveProperty("correct");
      expect(activity).not.toHaveProperty("answerKey");
      expect(activity).not.toHaveProperty("explanation");
    }
  });

  it("reconstructs identical presentation and command identity after reload", async () => {
    const input = await materializeInput();
    const first = await materializeNormalizedLessonRuntime(input);
    const reloaded = await materializeNormalizedLessonRuntime(
      JSON.parse(JSON.stringify(input)) as MaterializeNormalizedLessonRuntimeInput,
    );

    expect(first).toEqual(reloaded);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const firstIds = await deriveStableNormalizedLessonCommandIds(
      first.runtime.commandSeed,
      first.runtime.activities.length,
    );
    const reloadedIds = await deriveStableNormalizedLessonCommandIds(
      reloaded.ok ? reloaded.runtime.commandSeed : "invalid",
      reloaded.ok ? reloaded.runtime.activities.length : 1,
    );
    expect(firstIds).toEqual(reloadedIds);
  });

  it.each([
    ["correct", "injected-answer"],
    ["answerKey", "injected-answer"],
    ["score", 100],
  ])("rejects receipt-level %s injection", async (key, value) => {
    const input = await materializeInput();
    input.receipt = { ...(input.receipt as object), [key]: value };

    await expect(materializeNormalizedLessonRuntime(input)).resolves.toMatchObject({
      ok: false,
      code: "receipt-invalid",
    });
  });

  it("rejects missing, substituted, and stale authoritative activities", async () => {
    const base = await receiptFor();

    const missingForm: LessonSessionFormV1 = {
      ...base.form,
      activities: base.form.activities.map((activity, index) => index === 0
        ? { ...activity, activityId: `${ROOT_LESSON.id}:missing-item` }
        : activity),
    };
    const missing = await materializeInput();
    missing.receipt = await receiptFor(ROOT_LESSON, missingForm);
    await expect(materializeNormalizedLessonRuntime(missing)).resolves.toMatchObject({
      ok: false,
      code: "activity-unavailable",
    });

    const firstMethod = base.form.activities[0].method;
    const substitutedForm: LessonSessionFormV1 = {
      ...base.form,
      activities: base.form.activities.map((activity, index) => index === 0
        ? {
            ...activity,
            method: firstMethod === "meaning-selection"
              ? "phonology-recognition"
              : "meaning-selection",
          }
        : activity),
    };
    const substituted = await materializeInput();
    substituted.receipt = await receiptFor(ROOT_LESSON, substitutedForm);
    await expect(materializeNormalizedLessonRuntime(substituted)).resolves.toMatchObject({
      ok: false,
      code: "activity-unavailable",
    });

    const staleForm: LessonSessionFormV1 = {
      ...base.form,
      activities: base.form.activities.map((activity, index) => index === 0
        ? { ...activity, activityVersion: "stale-content:activity:1" }
        : activity),
    };
    const stale = await materializeInput();
    stale.receipt = await receiptFor(ROOT_LESSON, staleForm);
    await expect(materializeNormalizedLessonRuntime(stale)).resolves.toMatchObject({
      ok: false,
      code: "activity-unavailable",
    });
  });

  it("rejects an incomplete form and a form that drops required gate evidence", async () => {
    const base = await receiptFor();
    const incompleteForm: LessonSessionFormV1 = {
      ...base.form,
      activities: base.form.activities.slice(0, -1),
    };
    const incomplete = await materializeInput();
    incomplete.receipt = await receiptFor(ROOT_LESSON, incompleteForm);
    await expect(materializeNormalizedLessonRuntime(incomplete)).resolves.toMatchObject({
      ok: false,
      code: "activity-unavailable",
    });

    const issuedIds = new Set(base.form.activities.map((activity) => activity.activityId));
    const replacement = buildExerciseCatalog(
      ROOT_LESSON,
      "simplified",
      () => 0.125,
    ).find((exercise) =>
      exercise.requiredForPass !== true
      && !issuedIds.has(`${ROOT_LESSON.id}:${exercise.id}`)
    );
    const requiredPosition = base.form.activities.findIndex((activity) =>
      activity.requiredForPass
    );
    expect(replacement).toBeDefined();
    expect(requiredPosition).toBeGreaterThanOrEqual(0);
    if (!replacement || requiredPosition < 0) return;
    const droppedRequiredForm: LessonSessionFormV1 = {
      ...base.form,
      activities: base.form.activities.map((activity, position) =>
        position === requiredPosition
          ? {
              position,
              activityId: `${ROOT_LESSON.id}:${replacement.id}`,
              activityVersion: replacement.activityVersion,
              method: methodForExercise(replacement),
              skill: replacement.skill,
              requiredForPass: false,
            }
          : activity
      ),
    };
    const droppedRequired = await materializeInput();
    droppedRequired.receipt = await receiptFor(
      ROOT_LESSON,
      droppedRequiredForm,
    );
    await expect(materializeNormalizedLessonRuntime(
      droppedRequired,
    )).resolves.toMatchObject({
      ok: false,
      code: "activity-unavailable",
    });
  });

  it("rejects a reordered array whose positional binding was not rewritten", async () => {
    const receipt = await receiptFor();
    const reorderedForm: LessonSessionFormV1 = {
      ...receipt.form,
      activities: [
        receipt.form.activities[1],
        receipt.form.activities[0],
        ...receipt.form.activities.slice(2),
      ],
    };
    const input = await materializeInput();
    input.receipt = await receiptFor(ROOT_LESSON, reorderedForm);

    await expect(materializeNormalizedLessonRuntime(input)).resolves.toMatchObject({
      ok: false,
      code: "receipt-invalid",
    });
  });

  it("rejects form hash, open command, enrollment, and reset substitutions", async () => {
    const input = await materializeInput();
    const receipt = input.receipt as OpenLessonSessionReceiptV1;

    await expect(materializeNormalizedLessonRuntime({
      ...input,
      receipt: { ...receipt, formHash: `sha256:${"f".repeat(64)}` },
    })).resolves.toMatchObject({ ok: false, code: "form-hash-mismatch" });
    await expect(materializeNormalizedLessonRuntime({
      ...input,
      expectedOpenCommandId: "different-open-command",
    })).resolves.toMatchObject({ ok: false, code: "receipt-binding-mismatch" });
    await expect(materializeNormalizedLessonRuntime({
      ...input,
      receipt: { ...receipt, enrollmentId: "foreign-enrollment" },
    })).resolves.toMatchObject({ ok: false, code: "receipt-binding-mismatch" });
    await expect(materializeNormalizedLessonRuntime({
      ...input,
      receipt: { ...receipt, resetEpoch: receipt.resetEpoch + 1 },
    })).resolves.toMatchObject({ ok: false, code: "receipt-binding-mismatch" });
  });

  it("fails closed for draft lessons, locked prerequisites, and withdrawn progress", async () => {
    await expect(materializeNormalizedLessonRuntime(
      await materializeInput(
        SYNTHETIC_DRAFT_LESSON,
        progress(),
        formFor(SYNTHETIC_DRAFT_LESSON),
      ),
    )).resolves.toMatchObject({ ok: false, code: "lesson-unavailable" });

    await expect(materializeNormalizedLessonRuntime(
      await materializeInput(LOCKED_LESSON, progress(), formFor(LOCKED_LESSON)),
    )).resolves.toMatchObject({ ok: false, code: "progress-unavailable" });

    const withdrawn = {
      ...progress(),
      manifestSha256: `sha256:${"f".repeat(64)}`,
    } as AuthoritativeReleasedLessonProgressV1;
    await expect(materializeNormalizedLessonRuntime(
      await materializeInput(ROOT_LESSON, withdrawn),
    )).resolves.toMatchObject({ ok: false, code: "progress-unavailable" });
  });

  it("accepts a non-root form only with every exact prerequisite passed", async () => {
    const unlockedProgress = progress([ROOT_LESSON]);
    await expect(materializeNormalizedLessonRuntime(
      await materializeInput(LOCKED_LESSON, unlockedProgress, formFor(LOCKED_LESSON)),
    )).resolves.toMatchObject({
      ok: true,
      runtime: { lessonId: LOCKED_LESSON.id },
    });
  });
});

describe("normalized lesson pure command facade", () => {
  it("builds stable dependency IDs and answer-only commands", async () => {
    const runtime = await materializeValid();
    const ids = await deriveStableNormalizedLessonCommandIds(
      runtime.commandSeed,
      runtime.activities.length,
    );
    const open = await buildNormalizedLessonOpenQueueInput({
      lesson: ROOT_LESSON,
      authoritativeProgress: progress(),
      environment,
      openCommandId: OPEN_COMMAND_ID,
      enqueuedAt: NOW,
    });
    expect(open.sessionAlias).toBe(ids.sessionAlias);
    expect(open.command.idempotencyKey).toBe(ids.commandSeed);

    const activity = runtime.activities.find((candidate) =>
      candidate.options.length > 0
    )!;
    const attempt = await buildNormalizedLessonAttemptQueueInput(
      runtime,
      environment,
      {
        position: activity.position,
        selectedAnswer: activity.options[0],
        usedHint: true,
        durationMs: 1_250,
        occurredAt: NOW,
      },
    );
    expect(attempt.command).toEqual({
      protocolVersion: 1,
      idempotencyKey: ids.attemptCommandIds[activity.position],
      installationId: environment.installationId,
      deviceId: environment.deviceId,
      contentVersion: CONTENT_VERSION,
      activityId: activity.activityId,
      activityVersion: activity.activityVersion,
      source: "lesson",
      method: activity.method,
      occurredAt: NOW,
      response: {
        kind: "answer",
        answer: activity.options[0],
        usedHint: true,
        durationMs: 1_250,
      },
    });
    const serializedAttempt = JSON.stringify(attempt.command);
    expect(serializedAttempt).not.toContain("correct");
    expect(serializedAttempt).not.toContain("answerKey");
    expect(serializedAttempt).not.toContain("outcome");
    expect(serializedAttempt).not.toContain("score");

    const submission = await buildNormalizedLessonSubmissionQueueInput(
      runtime,
      environment,
      NOW,
    );
    expect(submission.attemptCommandIds).toEqual(ids.attemptCommandIds);
    expect(submission.command.idempotencyKey).toBe(ids.submitCommandId);
    expect(submission.command).not.toHaveProperty("sessionId");
    expect(submission.command).not.toHaveProperty("formHash");
    const localPositions = [0, runtime.activities.length - 1];
    const adoptedSubmission = await buildNormalizedLessonSubmissionQueueInput(
      runtime,
      environment,
      NOW,
      localPositions,
    );
    expect(adoptedSubmission.attemptCommandIds).toEqual(
      localPositions.map((position) => ids.attemptCommandIds[position]),
    );
    await expect(buildNormalizedLessonSubmissionQueueInput(
      runtime,
      environment,
      NOW,
      [0, 0],
    )).rejects.toThrow("local attempt positions are invalid");

    const abandon = await buildNormalizedLessonAbandonQueueInput(
      runtime,
      environment,
      NOW,
    );
    expect(abandon).toMatchObject({
      sessionAlias: ids.sessionAlias,
      dependencyCommandId: ids.commandSeed,
      command: { idempotencyKey: ids.abandonCommandId },
    });
    expect(abandon.command).not.toHaveProperty("sessionId");
    expect(abandon.command).not.toHaveProperty("resetEpoch");
    expect(abandon.command).not.toHaveProperty("deviceSequence");

    const forbiddenAuthorityKeys = new Set([
      "answerKey",
      "correct",
      "mastery",
      "outcome",
      "passed",
      "score",
      "verification",
    ]);
    for (const command of [
      open.command,
      attempt.command,
      submission.command,
      abandon.command,
    ]) {
      expect(commandKeys(command).filter((key) =>
        forbiddenAuthorityKeys.has(key)
      )).toEqual([]);
    }
  });

  it("rejects correctness injection and answers outside a selection item", async () => {
    const runtime = await materializeValid();
    const activity = runtime.activities.find((candidate) =>
      candidate.options.length > 0
    )!;
    const injected = {
      position: activity.position,
      selectedAnswer: activity.options[0],
      usedHint: false,
      occurredAt: NOW,
      correct: true,
    };
    await expect(buildNormalizedLessonAttemptQueueInput(
      runtime,
      environment,
      injected as never,
    )).rejects.toThrow("attempt response is invalid");

    await expect(buildNormalizedLessonAttemptQueueInput(
      runtime,
      environment,
      {
        position: activity.position,
        selectedAnswer: "client-substituted-answer",
        usedHint: false,
        occurredAt: NOW,
      },
    )).rejects.toThrow("selection is not in the server form item");

    const forgedRuntime = JSON.parse(
      JSON.stringify(runtime),
    ) as NormalizedLessonRuntimeV1;
    forgedRuntime.activities[activity.position] = {
      ...forgedRuntime.activities[activity.position],
      correct: activity.options[0],
    } as never;
    await expect(buildNormalizedLessonAttemptQueueInput(
      forgedRuntime,
      environment,
      {
        position: activity.position,
        selectedAnswer: activity.options[0],
        usedHint: false,
        occurredAt: NOW,
      },
    )).rejects.toThrow("runtime is stale or invalid");
  });

  it("refuses open and queued work outside the exact owner/reset eligibility scope", async () => {
    await expect(buildNormalizedLessonOpenQueueInput({
      lesson: LOCKED_LESSON,
      authoritativeProgress: progress(),
      environment,
      openCommandId: OPEN_COMMAND_ID,
    })).rejects.toThrow("Exact unlocked lesson progress");

    const runtime = await materializeValid();
    await expect(buildNormalizedLessonSubmissionQueueInput(
      runtime,
      { ...environment, resetEpoch: environment.resetEpoch + 1 },
      NOW,
    )).rejects.toThrow("runtime is stale or invalid");
  });
});
