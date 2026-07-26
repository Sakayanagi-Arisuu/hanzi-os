import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION } from "../data/curriculum";
import {
  CURRENT_AUTHORITATIVE_COURSE_ID,
  type AuthoritativeReleasedLessonProgressV1,
} from "../learning/authoritativeProgress";
import {
  ASSESSMENT_SESSION_FORM_SCHEMA_VERSION,
  ASSESSMENT_SESSION_PROTOCOL_VERSION,
  hashAssessmentForm,
  type AssessmentFormV1,
  type AssessmentSessionAuthorityBindingV1,
  type OpenAssessmentSessionReceiptV1,
} from "./assessmentSessionProtocol";
import {
  isExactNormalizedAssessmentRuntime,
  materializeNormalizedAssessmentRuntime,
  materializeNormalizedAssessmentRuntimeFromAuthorityBinding,
  type NormalizedAssessmentRuntimeV1,
} from "./normalizedAssessmentRuntime";

const ENROLLMENT_ID = "enrollment:assessment-runtime";
const OPEN_COMMAND_ID = "assessment-open:runtime:test";
const NOW = "2026-07-22T10:00:00.000Z";

const progress = (
  overrides: Partial<AuthoritativeReleasedLessonProgressV1> = {},
): AuthoritativeReleasedLessonProgressV1 => ({
  schemaVersion: 1,
  resetEpoch: 3,
  cursor: 19,
  enrollmentId: ENROLLMENT_ID,
  courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  completedCount: 0,
  totalCount: 2,
  remainingCount: 2,
  progress: 0,
  lessons: [],
  nextLesson: null,
  ...overrides,
});

const form = (): AssessmentFormV1 => ({
  schemaVersion: ASSESSMENT_SESSION_FORM_SCHEMA_VERSION,
  blueprintId: "foundation-screening:test",
  formVersion: `${CONTENT_VERSION}:assessment-form:test`,
  scoringPolicyVersion: "observed-accuracy:test",
  items: [
    {
      position: 0,
      itemId: "meaning-ni",
      itemVersion: `${CONTENT_VERSION}:assessment-item:meaning-ni:1`,
      skill: "vocabulary",
      construct: "word-meaning-recognition",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "你",
      meta: "Chọn nghĩa",
      options: ["tôi", "bạn", "người"],
    },
    {
      position: 1,
      itemId: "listen-xiexie",
      itemVersion: `${CONTENT_VERSION}:assessment-item:listen-xiexie:1`,
      skill: "listening",
      construct: "phrase-identification",
      modality: "synthetic-tts-selection",
      measurementEligible: false,
      prompt: "Nghe và chọn",
      meta: "Synthetic audio practice",
      options: ["你好", "谢谢", "再见"],
      stimulusText: "谢谢",
    },
  ],
});

const receipt = async (
  assessmentForm = form(),
): Promise<OpenAssessmentSessionReceiptV1> => ({
  protocolVersion: ASSESSMENT_SESSION_PROTOCOL_VERSION,
  idempotencyKey: OPEN_COMMAND_ID,
  duplicate: false,
  sessionId: "assessment-session:runtime",
  enrollmentId: ENROLLMENT_ID,
  resetEpoch: 3,
  contentVersion: CONTENT_VERSION,
  blueprintId: assessmentForm.blueprintId,
  formVersion: assessmentForm.formVersion,
  scoringPolicyVersion: assessmentForm.scoringPolicyVersion,
  expectedItemCount: assessmentForm.items.length,
  form: assessmentForm,
  formHash: await hashAssessmentForm(assessmentForm),
  status: "started",
  startedAt: NOW,
});

const materialize = async (value?: unknown) =>
  materializeNormalizedAssessmentRuntime({
    receipt: value ?? await receipt(),
    authoritativeProgress: progress(),
    expectedOpenCommandId: OPEN_COMMAND_ID,
  });

const nestedKeys = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(nestedKeys);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => [
    key,
    ...nestedKeys(child),
  ]);
};

describe("normalized assessment server-form materializer", () => {
  it("materializes only the immutable answer-free presentation", async () => {
    const result = await materialize();

    expect(result).toMatchObject({
      ok: true,
      runtime: {
        commandSeed: OPEN_COMMAND_ID,
        sessionId: "assessment-session:runtime",
        enrollmentId: ENROLLMENT_ID,
        resetEpoch: 3,
        items: [{ position: 0 }, { position: 1 }],
      },
    });
    if (!result.ok) throw new Error(result.reason);
    expect(await isExactNormalizedAssessmentRuntime(result.runtime)).toBe(true);
    expect(nestedKeys(result.runtime)).not.toContain("correctAnswer");
    expect(nestedKeys(result.runtime)).not.toContain("explanation");
    expect(nestedKeys(result.runtime)).not.toContain("outcome");
  });

  it("rejects answer-bearing or otherwise extended receipt items", async () => {
    const value = await receipt();
    const answerBearing = structuredClone(value) as unknown as {
      form: { items: Array<Record<string, unknown>> };
    };
    answerBearing.form.items[0]!.correctAnswer = "bạn";

    await expect(materialize(answerBearing)).resolves.toMatchObject({
      ok: false,
      code: "receipt-invalid",
    });

    const explained = structuredClone(value) as unknown as {
      form: { items: Array<Record<string, unknown>> };
    };
    explained.form.items[0]!.explanation = "Answer leakage";
    await expect(materialize(explained)).resolves.toMatchObject({
      ok: false,
      code: "receipt-invalid",
    });
  });

  it("rejects a substituted form even when all surface fields are valid", async () => {
    const value = await receipt();
    value.form.items[0]!.prompt = "好";

    await expect(materialize(value)).resolves.toMatchObject({
      ok: false,
      code: "form-hash-mismatch",
    });
  });

  it("requires exact command, enrollment, reset and current package authority", async () => {
    const value = await receipt();
    await expect(materializeNormalizedAssessmentRuntime({
      receipt: value,
      authoritativeProgress: progress(),
      expectedOpenCommandId: "assessment-open:other",
    })).resolves.toMatchObject({ ok: false, code: "receipt-binding-mismatch" });
    await expect(materialize({
      ...value,
      enrollmentId: "enrollment:other",
    })).resolves.toMatchObject({ ok: false, code: "receipt-binding-mismatch" });
    await expect(materialize({
      ...value,
      resetEpoch: 4,
    })).resolves.toMatchObject({ ok: false, code: "receipt-binding-mismatch" });
    await expect(materializeNormalizedAssessmentRuntime({
      receipt: value,
      authoritativeProgress: progress({
        manifestSha256: `sha256:${"0".repeat(64)}`,
      }),
      expectedOpenCommandId: OPEN_COMMAND_ID,
    })).resolves.toMatchObject({ ok: false, code: "progress-unavailable" });
  });

  it("keeps synthetic speech out of measurement and requires its stimulus", async () => {
    const eligible = form();
    eligible.items[1]!.measurementEligible = true;
    await expect(materialize(await receipt(eligible))).resolves.toMatchObject({
      ok: false,
      code: "receipt-invalid",
    });

    const missingStimulus = form();
    delete missingStimulus.items[1]!.stimulusText;
    await expect(materialize(await receipt(missingStimulus))).resolves.toMatchObject({
      ok: false,
      code: "receipt-invalid",
    });
  });

  it("rejects duplicate or post-materialization-mutated items", async () => {
    const result = await materialize();
    if (!result.ok) throw new Error(result.reason);

    const duplicate = structuredClone(result.runtime);
    duplicate.items[1] = {
      ...duplicate.items[0]!,
      position: 1,
    };
    expect(await isExactNormalizedAssessmentRuntime(duplicate)).toBe(false);

    const mutated = structuredClone(result.runtime) as NormalizedAssessmentRuntimeV1;
    mutated.items[0]!.prompt = "Substituted prompt";
    expect(await isExactNormalizedAssessmentRuntime(mutated)).toBe(false);
  });

  it("materializes a projected authority binding without inventing an open receipt", async () => {
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = await receipt();
    const result =
      await materializeNormalizedAssessmentRuntimeFromAuthorityBinding({
        binding,
        authoritativeProgress: progress(),
        commandSeed: "projected-assessment-anchor:test",
      });

    expect(result).toMatchObject({
      ok: true,
      runtime: {
        commandSeed: "projected-assessment-anchor:test",
        sessionId: binding.sessionId,
        formHash: binding.formHash,
      },
    });
    if (!result.ok) throw new Error(result.reason);
    expect(await isExactNormalizedAssessmentRuntime(result.runtime)).toBe(true);
    expect(nestedKeys(result.runtime)).not.toContain("idempotencyKey");
    expect(nestedKeys(result.runtime)).not.toContain("correctAnswer");
  });

  it("rejects extended, stale, or substituted projected bindings", async () => {
    const {
      protocolVersion: _protocolVersion,
      idempotencyKey: _idempotencyKey,
      duplicate: _duplicate,
      ...binding
    } = await receipt();
    await expect(
      materializeNormalizedAssessmentRuntimeFromAuthorityBinding({
        binding: { ...binding, duplicate: false },
        authoritativeProgress: progress(),
        commandSeed: "projected-assessment-anchor:test",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "authority-binding-invalid",
    });
    await expect(
      materializeNormalizedAssessmentRuntimeFromAuthorityBinding({
        binding: { ...binding, resetEpoch: binding.resetEpoch + 1 },
        authoritativeProgress: progress(),
        commandSeed: "projected-assessment-anchor:test",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "authority-binding-mismatch",
    });
    const substituted = structuredClone(
      binding,
    ) as AssessmentSessionAuthorityBindingV1;
    substituted.form.items[0]!.prompt = "Substituted prompt";
    await expect(
      materializeNormalizedAssessmentRuntimeFromAuthorityBinding({
        binding: substituted,
        authoritativeProgress: progress(),
        commandSeed: "projected-assessment-anchor:test",
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "form-hash-mismatch",
    });
  });
});
