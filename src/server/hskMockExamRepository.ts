import {
  canonicalAssessmentForm,
  hashAssessmentForm,
  isExactAssessmentFormV1,
  type AssessmentFormHash,
  type AssessmentSessionAuthorityBindingV1,
} from "../assessment/assessmentSessionProtocol";
import type { D1Database } from "./d1";
import {
  HSK_MOCK_EXAM_SKILLS,
  type HskMockExamDefinition,
  type HskMockExamLevel,
  type HskMockExamFormKey,
} from "./hskMockExamBank";
import { resolveHskMockExamDefinitionByBlueprint } from "./hskMockExamEditorialRepository";

type SessionRow = {
  sessionId: string;
  enrollmentId: string;
  resetEpoch: number;
  contentVersion: string;
  blueprintId: string;
  formVersion: string;
  scoringPolicyVersion: string;
  expectedItemCount: number;
  formManifestJson: string;
  formManifestHash: string;
  status: "started" | "submitted" | "abandoned";
  measurementEvidenceCount: number | null;
  measurementCorrectCount: number | null;
  observedAccuracy: number | null;
  startedAt: number;
  terminalAt: number | null;
};

type AttemptRow = {
  position: number;
  itemId: string;
  itemVersion: string;
  skill: string;
  responseJson: string;
  outcome: "correct" | "incorrect";
};

export const publicHskMockExamDefinition = (definition: HskMockExamDefinition) => ({
  examLevel: definition.examLevel,
  formKey: definition.formKey,
  title: definition.title,
  timeLimitMinutes: definition.timeLimitMinutes,
  itemCount: definition.blueprint.itemCount,
  formVersion: definition.blueprint.formVersion,
  humanReviewed: false as const,
  browserTtsPracticeOnly: true as const,
  officialExam: false as const,
  certificationEligible: false as const,
  masteryEligible: false as const,
  prerequisiteUnlockEligible: false as const,
  standardStructure: definition.standardStructure,
  legacy: definition.legacy,
  sections: definition.sections,
});

export const hskMockExamRepositoryOptions = (
  definition: HskMockExamDefinition,
) => ({
  bank: definition.bank,
  blueprint: definition.blueprint,
  sessionTimeLimitMs: definition.timeLimitMinutes * 60_000,
  allowIncompleteSubmissionAfterTimeout: true,
  excludePreviouslyExposedItems: definition.legacy,
  shuffleFormItems: definition.legacy,
  // Mock exams are repeatable, practice-only sessions. Their immutable form
  // and attempts remain auditable without consuming the one-time exposure
  // ledger reserved for measurement-eligible assessments.
  recordItemExposures: false,
});

export const hskMockExamRepositoryOptionsForSession = async (
  database: D1Database,
  userId: string,
  sessionId: string,
) => {
  const row = await database.prepare(
    `SELECT blueprint_id AS blueprintId
     FROM assessment_sessions
     WHERE id = ? AND user_id = ? LIMIT 1`,
  ).bind(sessionId, userId).first<{ blueprintId: string }>();
  const definition = row
    ? await resolveHskMockExamDefinitionByBlueprint(database, row.blueprintId)
    : null;
  if (!definition) throw new Error("Mock Exam session definition is unavailable.");
  return hskMockExamRepositoryOptions(definition);
};

const parseResponseAnswer = (raw: string) => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      && typeof (parsed as { answer?: unknown }).answer === "string"
      ? (parsed as { answer: string }).answer
      : null;
  } catch {
    return null;
  }
};

const parseForm = async (
  row: SessionRow,
  definition: HskMockExamDefinition,
) => {
  let form: unknown;
  try {
    form = JSON.parse(row.formManifestJson) as unknown;
  } catch {
    throw new Error("Stored Mock Exam form is invalid JSON.");
  }
  if (
    !isExactAssessmentFormV1(form, definition.blueprint.itemCount)
    || form.blueprintId !== definition.blueprint.id
    || form.formVersion !== definition.blueprint.formVersion
    || form.scoringPolicyVersion !== definition.blueprint.scoringPolicyVersion
    || row.formManifestJson !== canonicalAssessmentForm(form)
    || await hashAssessmentForm(form) !== row.formManifestHash
  ) throw new Error("Stored Mock Exam form no longer matches its immutable version.");
  return form;
};

export class HskMockExamRepository {
  constructor(private readonly database: D1Database) {}

  async activeDoor(userId: string) {
    const row = await this.database.prepare(
      `SELECT blueprint_id AS blueprintId
       FROM assessment_sessions
       WHERE user_id = ? AND status = 'started' AND blueprint_id LIKE 'hsk-mock-%'
       ORDER BY started_at DESC LIMIT 1`,
    ).bind(userId).first<{ blueprintId: string }>();
    if (!row) return null;
    const definition = await this.definitionForBlueprint(row.blueprintId);
    return definition ? {
      examLevel: definition.examLevel,
      formKey: definition.formKey,
    } : null;
  }

  async resume(
    userId: string,
    definition: HskMockExamDefinition,
    now = Date.now(),
  ) {
    const row = await this.database.prepare(
      `SELECT id AS sessionId, enrollment_id AS enrollmentId, reset_epoch AS resetEpoch,
              content_version AS contentVersion, blueprint_id AS blueprintId,
              form_version AS formVersion, scoring_policy_version AS scoringPolicyVersion,
              expected_item_count AS expectedItemCount, form_manifest_json AS formManifestJson,
              form_manifest_hash AS formManifestHash, status,
              measurement_evidence_count AS measurementEvidenceCount,
              measurement_correct_count AS measurementCorrectCount,
              observed_accuracy AS observedAccuracy, started_at AS startedAt,
              terminal_at AS terminalAt
       FROM assessment_sessions
       WHERE user_id = ? AND blueprint_id = ? AND form_version = ? AND status = 'started'
       ORDER BY started_at DESC LIMIT 1`,
    ).bind(
      userId,
      definition.blueprint.id,
      definition.blueprint.formVersion,
    ).first<SessionRow>();
    if (!row) return null;
    const form = await parseForm(row, definition);
    const attempts = await this.readAttempts(userId, row.sessionId, row.resetEpoch);
    const expiresAt = row.startedAt + definition.timeLimitMinutes * 60_000;
    return {
      definition: publicHskMockExamDefinition(definition),
      binding: {
        sessionId: row.sessionId,
        enrollmentId: row.enrollmentId,
        resetEpoch: row.resetEpoch,
        contentVersion: row.contentVersion,
        blueprintId: row.blueprintId,
        formVersion: row.formVersion,
        scoringPolicyVersion: row.scoringPolicyVersion,
        expectedItemCount: row.expectedItemCount,
        form,
        formHash: row.formManifestHash as AssessmentFormHash,
        status: "started",
        startedAt: new Date(row.startedAt).toISOString(),
      } satisfies AssessmentSessionAuthorityBindingV1,
      expiresAt: new Date(expiresAt).toISOString(),
      expired: now >= expiresAt,
      recorded: attempts.map((attempt) => ({
        position: attempt.position,
        itemId: attempt.itemId,
        itemVersion: attempt.itemVersion,
        answer: parseResponseAnswer(attempt.responseJson),
      })),
    };
  }

  async history(userId: string) {
    const rows = await this.database.prepare(
      `SELECT id AS sessionId, enrollment_id AS enrollmentId, reset_epoch AS resetEpoch,
              content_version AS contentVersion, blueprint_id AS blueprintId,
              form_version AS formVersion, scoring_policy_version AS scoringPolicyVersion,
              expected_item_count AS expectedItemCount, form_manifest_json AS formManifestJson,
              form_manifest_hash AS formManifestHash, status,
              measurement_evidence_count AS measurementEvidenceCount,
              measurement_correct_count AS measurementCorrectCount,
              observed_accuracy AS observedAccuracy, started_at AS startedAt,
              terminal_at AS terminalAt
       FROM assessment_sessions
       WHERE user_id = ? AND blueprint_id LIKE 'hsk-mock-%' AND status = 'submitted'
       ORDER BY terminal_at DESC`,
    ).bind(userId).all<SessionRow>();
    if (!rows.success) throw new Error("Unable to read Mock Exam history.");
    const results = [];
    for (const row of rows.results ?? []) {
      const definition = await this.definitionForBlueprint(row.blueprintId);
      if (!definition) continue;
      results.push(await this.resultForSession(userId, row, definition));
    }
    return results;
  }

  async result(
    userId: string,
    sessionId: string,
  ) {
    const row = await this.database.prepare(
      `SELECT id AS sessionId, enrollment_id AS enrollmentId, reset_epoch AS resetEpoch,
              content_version AS contentVersion, blueprint_id AS blueprintId,
              form_version AS formVersion, scoring_policy_version AS scoringPolicyVersion,
              expected_item_count AS expectedItemCount, form_manifest_json AS formManifestJson,
              form_manifest_hash AS formManifestHash, status,
              measurement_evidence_count AS measurementEvidenceCount,
              measurement_correct_count AS measurementCorrectCount,
              observed_accuracy AS observedAccuracy, started_at AS startedAt,
              terminal_at AS terminalAt
       FROM assessment_sessions
       WHERE id = ? AND user_id = ? AND status = 'submitted' LIMIT 1`,
    ).bind(sessionId, userId).first<SessionRow>();
    if (!row) return null;
    const definition = await this.definitionForBlueprint(row.blueprintId);
    return definition ? this.resultForSession(userId, row, definition) : null;
  }

  private definitionForBlueprint(blueprintId: string) {
    return resolveHskMockExamDefinitionByBlueprint(this.database, blueprintId);
  }

  private async resultForSession(
    userId: string,
    row: SessionRow,
    definition: HskMockExamDefinition,
  ) {
    const form = await parseForm(row, definition);
    const attempts = await this.readAttempts(userId, row.sessionId, row.resetEpoch);
    const itemByVersion = new Map(
      definition.bank.map((item) => [item.itemVersion, item]),
    );
    const formByPosition = new Map(form.items.map((item) => [item.position, item]));
    const review = attempts.map((attempt) => {
      const item = itemByVersion.get(attempt.itemVersion);
      const presentation = formByPosition.get(attempt.position);
      if (!item || !presentation || presentation.itemVersion !== item.itemVersion) {
        throw new Error("Mock Exam history cannot bind an immutable item version.");
      }
      return {
        position: attempt.position,
        itemId: attempt.itemId,
        itemVersion: attempt.itemVersion,
        skill: item.skill as HskMockExamSkill,
        prompt: presentation.prompt,
        selectedAnswer: parseResponseAnswer(attempt.responseJson),
        correct: attempt.outcome === "correct",
        correctAnswer: item.correctAnswer,
        explanationVi: item.explanationVi,
        recommendedLessonId: item.sourceLessonId,
        recommendedLessonHref: `/lesson/${encodeURIComponent(item.sourceLessonId)}`,
      };
    });
    const skills = definition.sections.map(({ skill }) => {
      const items = review.filter((item) => item.skill === skill);
      return {
        skill,
        correct: items.filter((item) => item.correct).length,
        answered: items.length,
        total: definition.bank.filter((item) => item.skill === skill).length,
      };
    });
    const incorrect = review.filter((item) => !item.correct);
    const recommendationCounts = new Map<string, number>();
    for (const item of incorrect) {
      recommendationCounts.set(
        item.recommendedLessonId,
        (recommendationCounts.get(item.recommendedLessonId) ?? 0) + 1,
      );
    }
    const correct = review.filter((item) => item.correct).length;
    const expiresAt = row.startedAt + definition.timeLimitMinutes * 60_000;
    return {
      sessionId: row.sessionId,
      definition: publicHskMockExamDefinition(definition),
      contentVersion: row.contentVersion,
      formVersion: row.formVersion,
      formHash: row.formManifestHash,
      startedAt: new Date(row.startedAt).toISOString(),
      submittedAt: new Date(row.terminalAt ?? row.startedAt).toISOString(),
      timedOut: (row.terminalAt ?? 0) >= expiresAt
        && attempts.length < row.expectedItemCount,
      score: {
        correct,
        answered: attempts.length,
        total: row.expectedItemCount,
        percent: attempts.length > 0 ? Math.round(correct / row.expectedItemCount * 100) : 0,
      },
      skills,
      weakSkills: skills
        .filter((skill) => skill.answered > 0 && skill.correct / skill.answered < 0.7)
        .map((skill) => skill.skill),
      recommendations: [...recommendationCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 4)
        .map(([lessonId, wrongCount]) => ({
          lessonId,
          href: `/lesson/${encodeURIComponent(lessonId)}`,
          wrongCount,
        })),
      review,
      masteryEligible: false as const,
      prerequisiteUnlockEligible: false as const,
      certificationEligible: false as const,
    };
  }

  private async readAttempts(userId: string, sessionId: string, resetEpoch: number) {
    const attempts = await this.database.prepare(
      `SELECT position, item_id AS itemId, item_version AS itemVersion, skill,
              response_json AS responseJson, outcome
       FROM assessment_attempts
       WHERE user_id = ? AND session_id = ? AND reset_epoch = ?
       ORDER BY position`,
    ).bind(userId, sessionId, resetEpoch).all<AttemptRow>();
    if (!attempts.success) throw new Error("Unable to read Mock Exam attempts.");
    return attempts.results ?? [];
  }
}

type HskMockExamSkill = typeof HSK_MOCK_EXAM_SKILLS[number];

export type HskMockExamCatalogEntry = ReturnType<typeof publicHskMockExamDefinition>;
export type HskMockExamSessionState = NonNullable<Awaited<
  ReturnType<HskMockExamRepository["resume"]>
>>;
export type HskMockExamResult = NonNullable<Awaited<
  ReturnType<HskMockExamRepository["result"]>
>>;
export type { HskMockExamLevel, HskMockExamFormKey };
