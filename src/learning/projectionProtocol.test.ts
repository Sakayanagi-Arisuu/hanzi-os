import { describe, expect, it } from "vitest";
import {
  LEARNING_PROJECTION_V3_MEDIA_TYPE,
  LEARNING_PROJECTION_V3_PROTOCOL_VERSION,
  LEARNING_PROJECTION_V4_MEDIA_TYPE,
  LEARNING_PROJECTION_V4_PROTOCOL_VERSION,
  emptyObjectiveEvidenceProjection,
  parseAnyNormalizedLearningProjection,
  parseNormalizedLearningProjection,
  parseNormalizedLearningProjectionV2,
  parseNormalizedLearningProjectionV3,
  parseNormalizedLearningProjectionV4,
  toNormalizedLearningProjectionV1,
  toNormalizedLearningProjectionV2,
  toNormalizedLearningProjectionV3,
  type NormalizedLearningProjectionV1,
  type NormalizedLearningProjectionV2,
  type NormalizedLearningProjectionV3,
  type NormalizedLearningProjectionV4,
} from "./projectionProtocol";
import { estimateObservedAccuracyFromCounts } from "../lib/assessment/skillEstimate";
import type { Skill } from "../types";

const contentVersion = "foundation-test";
const enrollmentId = "enrollment-test";
const activity = {
  position: 0,
  activityId: "boot-1:q1",
  activityVersion: "foundation-test:boot-1:q1:1",
  method: "meaning-selection" as const,
  skill: "vocabulary" as const,
  requiredForPass: true,
};

const projection = (): NormalizedLearningProjectionV1 => ({
  protocolVersion: 1,
  resetEpoch: 1,
  cursor: 9,
  contentVersion,
  manifestSha256: `sha256:${"a".repeat(64)}`,
  enrollment: {
    enrollmentId,
    contentVersion,
    courseId: "hanzi-os-core",
    manifestSha256: `sha256:${"a".repeat(64)}`,
    releaseState: "beta",
    goal: "conversation",
  },
  activeLessonSessions: [{
    sessionId: "session-test",
    enrollmentId,
    contentVersion,
    lessonId: "boot-1",
    lessonVersion: "foundation-test:boot-1:1",
    expectedEvidenceCount: 1,
    form: {
      schemaVersion: 1,
      script: "simplified",
      activities: [{ ...activity }],
    },
    formHash: `sha256:${"b".repeat(64)}`,
    status: "started",
    startedAt: "2026-07-22T06:00:00.000Z",
    attempts: [{
      attemptId: "attempt-test",
      evidenceId: "evidence-test",
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
      occurredAt: "2026-07-22T06:01:00.000Z",
    }],
  }],
  submittedLessons: [],
  objectiveEvidence: {
    ...emptyObjectiveEvidenceProjection(),
    vocabulary: {
      attemptCount: 1,
      correctCount: 1,
      incorrectCount: 0,
      masteryEligibleCount: 1,
      masteryEligibleCorrectCount: 1,
    },
  },
});

const skills: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

const observed = (correct: number, n: number) => ({
  ...estimateObservedAccuracyFromCounts(correct, n),
  masteryEligible: false as const,
});

const projectionV2 = (): NormalizedLearningProjectionV2 => ({
  ...projection(),
  protocolVersion: 2,
  activeAssessmentSession: {
    sessionId: "assessment-active",
    enrollmentId,
    resetEpoch: 1,
    contentVersion,
    blueprintId: "foundation-screening-server-v1",
    formVersion: `${contentVersion}:assessment-foundation-server:1`,
    scoringPolicyVersion: "foundation-observed-wilson-95:1",
    expectedItemCount: 1,
    form: {
      schemaVersion: 1,
      blueprintId: "foundation-screening-server-v1",
      formVersion: `${contentVersion}:assessment-foundation-server:1`,
      scoringPolicyVersion: "foundation-observed-wilson-95:1",
      items: [{
        position: 0,
        itemId: "assessment-reading",
        itemVersion: `${contentVersion}:server-assessment-item:reading:1`,
        skill: "reading",
        construct: "sentence-meaning-recognition",
        modality: "visual-selection",
        measurementEligible: true,
        prompt: "我是学生。",
        meta: "Chọn nghĩa câu",
        options: ["Tôi là sinh viên.", "Tôi là giáo viên."],
      }],
    },
    formHash: `sha256:${"c".repeat(64)}`,
    status: "started",
    startedAt: "2026-07-22T06:02:00.000Z",
    attempts: [{
      attemptId: "assessment-attempt",
      position: 0,
      itemId: "assessment-reading",
      itemVersion: `${contentVersion}:server-assessment-item:reading:1`,
      skill: "reading",
      measurementEligible: true,
      masteryEligible: false,
      status: "recorded",
      recordedAt: "2026-07-22T06:03:00.000Z",
    }],
  },
  latestAssessmentResult: {
    sessionId: "assessment-submitted",
    enrollmentId,
    resetEpoch: 1,
    contentVersion,
    blueprintId: "foundation-screening-server-v1",
    formVersion: `${contentVersion}:assessment-foundation-server:1`,
    scoringPolicyVersion: "foundation-observed-wilson-95:1",
    formHash: `sha256:${"d".repeat(64)}`,
    status: "submitted",
    calibrationStatus: "uncalibrated",
    confidenceLevel: 0.95,
    masteryEligible: false,
    overall: observed(2, 2),
    skills: skills.map((skill) => ({
      skill,
      ...(skill === "reading" ? observed(2, 2) : observed(0, 0)),
    })),
    submittedAt: "2026-07-22T06:04:00.000Z",
  },
});

const projectionV3 = (): NormalizedLearningProjectionV3 => ({
  ...projectionV2(),
  protocolVersion: 3,
  activeReaderSession: {
    sessionId: "reader-active",
    enrollmentId,
    resetEpoch: 1,
    contentVersion,
    storyId: "reader-story-1",
    storyVersion: `${contentVersion}:reader-story-1:1`,
    formVersion: `${contentVersion}:reader-story-1:form:1`,
    formSchemaVersion: 1,
    script: "simplified",
    supportMode: "unassisted",
    supportPolicyVersion: "reader-support:1",
    expectedItemCount: 2,
    form: {
      formSchemaVersion: 1,
      storyId: "reader-story-1",
      storyVersion: `${contentVersion}:reader-story-1:1`,
      formVersion: `${contentVersion}:reader-story-1:form:1`,
      script: "simplified",
      supportMode: "unassisted",
      supportPolicyVersion: "reader-support:1",
      items: [
        {
          position: 0,
          itemId: "reader-story-1:q1",
          itemVersion: `${contentVersion}:reader-story-1:q1:1`,
          method: "reading-comprehension",
          skill: "reading",
          chineseStimulus: "小王是学生。",
          prompt: "小王是谁？",
          options: ["学生", "老师"],
          answerExposure: "server-confidential",
          priorExposure: false,
          masteryEligible: true,
        },
        {
          position: 1,
          itemId: "reader-story-1:q2",
          itemVersion: `${contentVersion}:reader-story-1:q2:1`,
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
    },
    formHash: `sha256:${"e".repeat(64)}`,
    status: "started",
    startedAt: "2026-07-22T06:05:00.000Z",
    attempts: [
      {
        attemptId: "reader-attempt-1",
        evidenceId: "reader-evidence-1",
        sessionId: "reader-active",
        resetEpoch: 1,
        contentVersion,
        formHash: `sha256:${"e".repeat(64)}`,
        position: 0,
        itemId: "reader-story-1:q1",
        itemVersion: `${contentVersion}:reader-story-1:q1:1`,
        method: "reading-comprehension",
        skill: "reading",
        script: "simplified",
        supportMode: "unassisted",
        supportPolicyVersion: "reader-support:1",
        answerExposure: "server-confidential",
        priorExposure: false,
        masteryEligible: true,
        outcome: "correct",
        score: 100,
        verification: "server-objective",
        status: "recorded",
        recordedAt: "2026-07-22T06:06:00.000Z",
      },
    ],
  },
});

const projectionV4 = (): NormalizedLearningProjectionV4 => ({
  ...projectionV3(),
  protocolVersion: 4,
  gateEligibleCorrectActivityCounts: Object.fromEntries(
    skills.map((skill) => [skill, skill === "vocabulary" ? 1 : 0]),
  ) as Record<Skill, number>,
});

describe("normalized learning projection protocol", () => {
  it("accepts an exact answer-free projection", () => {
    expect(parseNormalizedLearningProjection(projection())).toEqual({
      ok: true,
      projection: projection(),
    });
  });

  it("rejects response or answer-key fields at every active-attempt boundary", () => {
    const withResponse = projection() as unknown as {
      activeLessonSessions: Array<{ attempts: Array<Record<string, unknown>> }>;
    };
    withResponse.activeLessonSessions[0].attempts[0].response = {
      answer: "leaked",
    };
    expect(parseNormalizedLearningProjection(withResponse)).toEqual({
      ok: false,
      reason: "Active lesson projection is invalid.",
    });
  });

  it("rejects reordered forms and attempts outside the immutable form", () => {
    const reordered = projection();
    reordered.activeLessonSessions[0].form.activities[0].position = 1;
    expect(parseNormalizedLearningProjection(reordered).ok).toBe(false);

    const substituted = projection();
    substituted.activeLessonSessions[0].attempts[0].activityId = "boot-1:q2";
    expect(parseNormalizedLearningProjection(substituted).ok).toBe(false);
  });

  it("rejects mathematically inconsistent evidence counts", () => {
    const invalid = projection();
    invalid.objectiveEvidence.vocabulary.correctCount = 2;
    expect(parseNormalizedLearningProjection(invalid)).toEqual({
      ok: false,
      reason: "Learning projection contract is invalid.",
    });
  });

  it("rejects objective evidence without an exact released enrollment", () => {
    const invalid = projection();
    invalid.enrollment = null;
    invalid.activeLessonSessions = [];
    expect(parseNormalizedLearningProjection(invalid)).toEqual({
      ok: false,
      reason: "Active lesson projection is invalid.",
    });
  });

  it("accepts a strict V2 projection with answer-free assessment state", () => {
    const value = projectionV2();
    expect(parseNormalizedLearningProjectionV2(value)).toEqual({
      ok: true,
      projection: value,
    });
    expect(parseNormalizedLearningProjection(value).ok).toBe(false);
    expect(parseNormalizedLearningProjection(
      toNormalizedLearningProjectionV1(value),
    ).ok).toBe(true);
  });

  it("rejects assessment answer, response, and item-outcome leakage", () => {
    const withAnswer = projectionV2() as unknown as {
      activeAssessmentSession: {
        form: { items: Array<Record<string, unknown>> };
      };
    };
    withAnswer.activeAssessmentSession.form.items[0].correctAnswer =
      "Tôi là sinh viên.";
    expect(parseNormalizedLearningProjectionV2(withAnswer)).toMatchObject({
      ok: false,
      reason: "Active assessment projection is invalid.",
    });

    for (const key of ["response", "outcome", "score"] as const) {
      const leaked = projectionV2() as unknown as {
        activeAssessmentSession: {
          attempts: Array<Record<string, unknown>>;
        };
      };
      leaked.activeAssessmentSession.attempts[0][key] = key === "score"
        ? 100
        : "leaked";
      expect(parseNormalizedLearningProjectionV2(leaked).ok).toBe(false);
    }
  });

  it("rejects form/attempt binding and aggregate inconsistencies", () => {
    const wrongAttempt = projectionV2();
    wrongAttempt.activeAssessmentSession!.attempts[0].itemVersion = "substitute";
    expect(parseNormalizedLearningProjectionV2(wrongAttempt).ok).toBe(false);

    const missingSkill = projectionV2();
    missingSkill.latestAssessmentResult!.skills.pop();
    expect(parseNormalizedLearningProjectionV2(missingSkill).ok).toBe(false);

    const inconsistentOverall = projectionV2();
    inconsistentOverall.latestAssessmentResult!.overall = observed(1, 2);
    expect(parseNormalizedLearningProjectionV2(inconsistentOverall).ok).toBe(false);
  });

  it("keeps projection form bounds aligned with assessment runtime policy", () => {
    const longConstruct = projectionV2();
    longConstruct.activeAssessmentSession!.form.items[0].construct = "c".repeat(161);
    expect(parseNormalizedLearningProjectionV2(longConstruct).ok).toBe(false);

    const tooManyOptions = projectionV2();
    tooManyOptions.activeAssessmentSession!.form.items[0].options = Array.from(
      { length: 9 },
      (_, index) => `option-${index}`,
    );
    expect(parseNormalizedLearningProjectionV2(tooManyOptions).ok).toBe(false);

    const measuredSynthetic = projectionV2();
    const synthetic = measuredSynthetic.activeAssessmentSession!.form.items[0];
    synthetic.modality = "synthetic-tts-selection";
    synthetic.stimulusText = "谢谢";
    synthetic.measurementEligible = true;
    measuredSynthetic.activeAssessmentSession!.attempts[0].measurementEligible = true;
    expect(parseNormalizedLearningProjectionV2(measuredSynthetic).ok).toBe(false);

    const equivalentOptions = projectionV2();
    equivalentOptions.activeAssessmentSession!.form.items[0].options = [
      "é",
      " e\u0301 ",
    ];
    expect(parseNormalizedLearningProjectionV2(equivalentOptions).ok).toBe(false);
  });

  it("does not turn absent V1 assessment authority into null V2 state", () => {
    const withoutEnrollment = projectionV2();
    withoutEnrollment.enrollment = null;
    withoutEnrollment.activeLessonSessions = [];
    withoutEnrollment.submittedLessons = [];
    withoutEnrollment.objectiveEvidence = emptyObjectiveEvidenceProjection();
    expect(parseNormalizedLearningProjectionV2(withoutEnrollment)).toMatchObject({
      ok: false,
      reason: "Assessment projection requires an exact released enrollment.",
    });
  });

  it("accepts a strict V3 answer-free Reader resume aggregate", () => {
    const value = projectionV3();
    expect(LEARNING_PROJECTION_V3_PROTOCOL_VERSION).toBe(3);
    expect(LEARNING_PROJECTION_V3_MEDIA_TYPE).toBe(
      "application/vnd.hanzi-os.learning-projection.v3+json",
    );
    expect(parseNormalizedLearningProjectionV3(value)).toEqual({
      ok: true,
      projection: value,
    });
    expect(JSON.stringify(value.activeReaderSession)).not.toMatch(
      /correctAnswer|answerKey|selectedOption|response|explanation/iu,
    );
  });

  it("keeps V1-V3 exact while V4 adds backward-compatible breadth", () => {
    const v1 = projection();
    const v2 = projectionV2();
    const v3 = projectionV3();
    const v4 = projectionV4();

    expect(parseNormalizedLearningProjection(v1).ok).toBe(true);
    expect(parseNormalizedLearningProjectionV2(v2).ok).toBe(true);
    expect(parseNormalizedLearningProjectionV3(v3).ok).toBe(true);
    expect(LEARNING_PROJECTION_V4_PROTOCOL_VERSION).toBe(4);
    expect(LEARNING_PROJECTION_V4_MEDIA_TYPE).toBe(
      "application/vnd.hanzi-os.learning-projection.v4+json",
    );
    expect(parseNormalizedLearningProjectionV4(v4)).toEqual({
      ok: true,
      projection: v4,
    });
    expect(parseNormalizedLearningProjection(v2).ok).toBe(false);
    expect(parseNormalizedLearningProjectionV2(v3).ok).toBe(false);
    expect(parseNormalizedLearningProjectionV3(v4).ok).toBe(false);

    expect(parseAnyNormalizedLearningProjection(v1)).toEqual({
      ok: true,
      projection: v1,
    });
    expect(parseAnyNormalizedLearningProjection(v2)).toEqual({
      ok: true,
      projection: v2,
    });
    expect(parseAnyNormalizedLearningProjection(v3)).toEqual({
      ok: true,
      projection: v3,
    });
    expect(parseAnyNormalizedLearningProjection(v4)).toEqual({
      ok: true,
      projection: v4,
    });

    const downgraded = toNormalizedLearningProjectionV1(v3);
    expect(parseNormalizedLearningProjection(downgraded).ok).toBe(true);
    expect(downgraded).not.toHaveProperty("activeAssessmentSession");
    expect(downgraded).not.toHaveProperty("activeReaderSession");

    const assessmentProjection = toNormalizedLearningProjectionV2(v3);
    expect(parseNormalizedLearningProjectionV2(
      assessmentProjection,
    ).ok).toBe(true);
    expect(assessmentProjection.activeAssessmentSession).toEqual(
      v3.activeAssessmentSession,
    );
    expect(assessmentProjection).not.toHaveProperty("activeReaderSession");

    const readerProjection = toNormalizedLearningProjectionV3(v4);
    expect(parseNormalizedLearningProjectionV3(readerProjection).ok).toBe(true);
    expect(readerProjection).not.toHaveProperty(
      "gateEligibleCorrectActivityCounts",
    );
  });

  it("rejects impossible V4 breadth without invalidating older caches", () => {
    const invalid = projectionV4();
    invalid.gateEligibleCorrectActivityCounts.vocabulary = 2;
    expect(parseNormalizedLearningProjectionV4(invalid)).toMatchObject({
      ok: false,
      reason: "Learning projection V4 breadth aggregate is invalid.",
    });
    expect(parseNormalizedLearningProjection(projection()).ok).toBe(true);
    expect(parseNormalizedLearningProjectionV3(projectionV3()).ok).toBe(true);
  });

  it("rejects answer, explanation, selected-option and response leaks in V3", () => {
    for (const key of ["correctAnswer", "answerKey", "explanation"] as const) {
      const leaked = projectionV3() as unknown as {
        activeReaderSession: {
          form: { items: Array<Record<string, unknown>> };
        };
      };
      leaked.activeReaderSession.form.items[0]![key] = "leaked";
      expect(parseNormalizedLearningProjectionV3(leaked)).toMatchObject({
        ok: false,
        reason: "Active Reader projection is invalid.",
      });
    }

    for (const key of ["response", "selectedOption"] as const) {
      const leaked = projectionV3() as unknown as {
        activeReaderSession: {
          attempts: Array<Record<string, unknown>>;
        };
      };
      leaked.activeReaderSession.attempts[0]![key] =
        key === "response" ? { answer: "leaked" } : "leaked";
      expect(parseNormalizedLearningProjectionV3(leaked)).toMatchObject({
        ok: false,
        reason: "Active Reader projection is invalid.",
      });
    }
  });

  it("rejects mismatched Reader aggregate authority and form metadata", () => {
    const cases: Array<
      (value: NormalizedLearningProjectionV3) => void
    > = [
      (value) => {
        value.activeReaderSession!.enrollmentId = "other-enrollment";
      },
      (value) => {
        value.activeReaderSession!.resetEpoch += 1;
      },
      (value) => {
        value.activeReaderSession!.contentVersion = "other-content";
      },
      (value) => {
        value.activeReaderSession!.storyVersion = "substituted-story";
      },
      (value) => {
        value.activeReaderSession!.form.formVersion = "substituted-form";
      },
      (value) => {
        value.activeReaderSession!.form.script = "traditional";
      },
      (value) => {
        value.activeReaderSession!.form.supportPolicyVersion =
          "substituted-policy";
      },
      (value) => {
        value.activeReaderSession!.expectedItemCount = 1;
      },
      (value) => {
        value.activeReaderSession!.form.items[1]!.position = 4;
      },
    ];
    for (const mutate of cases) {
      const value = projectionV3();
      mutate(value);
      expect(parseNormalizedLearningProjectionV3(value)).toMatchObject({
        ok: false,
        reason: "Active Reader projection is invalid.",
      });
    }
  });

  it("rejects mismatched Reader attempt item, form and policy bindings", () => {
    const cases: Array<
      (value: NormalizedLearningProjectionV3) => void
    > = [
      (value) => {
        value.activeReaderSession!.attempts[0]!.sessionId = "other-session";
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.resetEpoch += 1;
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.formHash =
          `sha256:${"f".repeat(64)}`;
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.position = 1;
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.itemVersion =
          "substituted-item";
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.supportMode = "assisted";
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.answerExposure =
          "public-client";
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.priorExposure = true;
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.masteryEligible = false;
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.outcome = "incorrect";
      },
      (value) => {
        value.activeReaderSession!.attempts[0]!.recordedAt =
          "2026-07-22T06:04:59.999Z";
      },
    ];
    for (const mutate of cases) {
      const value = projectionV3();
      mutate(value);
      expect(parseNormalizedLearningProjectionV3(value)).toMatchObject({
        ok: false,
        reason: "Active Reader projection is invalid.",
      });
    }
  });

  it("rejects duplicate Reader attempts and Reader state without enrollment", () => {
    const duplicate = projectionV3();
    duplicate.activeReaderSession!.attempts.push({
      ...duplicate.activeReaderSession!.attempts[0]!,
      attemptId: "reader-attempt-2",
      evidenceId: "reader-evidence-2",
    });
    expect(parseNormalizedLearningProjectionV3(duplicate)).toMatchObject({
      ok: false,
      reason: "Active Reader projection is invalid.",
    });

    const withoutEnrollment = projectionV3();
    withoutEnrollment.enrollment = null;
    withoutEnrollment.activeLessonSessions = [];
    withoutEnrollment.submittedLessons = [];
    withoutEnrollment.objectiveEvidence = emptyObjectiveEvidenceProjection();
    withoutEnrollment.activeAssessmentSession = null;
    withoutEnrollment.latestAssessmentResult = null;
    expect(parseNormalizedLearningProjectionV3(withoutEnrollment)).toEqual({
      ok: false,
      reason: "Reader projection requires an exact released enrollment.",
    });
  });
});
