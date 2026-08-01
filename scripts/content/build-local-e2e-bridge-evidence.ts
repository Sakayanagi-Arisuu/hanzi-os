import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LESSON_BY_ID } from "../../src/data/curriculum";
import {
  localLessonActivityProvenance,
  localLessonEvidenceMetadata,
  localLessonSessionProvenance,
  materializeLocalLessonRuntime,
} from "../../src/learning/localLessonRuntime";
import type { Exercise } from "../../src/lib/exerciseGeneration";
import { materializeEvidence, scoreLessonSession } from "../../src/lib/evidence";
import type { EvidenceMethod, LearningEvidence } from "../../src/types";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const check = process.argv.includes("--check");
const ANSWER_TIME = "2026-08-01T00:00:00.000Z";
const COMPLETION_TIME = "2026-08-01T00:01:00.000Z";

const methodForExercise = (exercise: Exercise): EvidenceMethod => {
  if (exercise.kind === "meaning") return "meaning-selection";
  if (exercise.kind === "listening") return "listening-selection";
  if (exercise.kind === "sentence") return "reading-comprehension";
  if (exercise.kind === "recall") return "typed-character-recall";
  return "phonology-recognition";
};

const buildPassedEvidence = (
  lessonId: string,
  fixtureId: string,
): LearningEvidence[] => {
  const lesson = LESSON_BY_ID.get(lessonId);
  if (!lesson) throw new Error(`Missing E2E prerequisite lesson ${lessonId}.`);
  const sessionId = `lesson-session:${lessonId}:${fixtureId}`;
  const result = materializeLocalLessonRuntime(
    lesson,
    "simplified",
    sessionId,
  );
  if (!result.ok) throw new Error(result.reason);
  const { runtime } = result;
  const answers = runtime.activities.map((activity) => {
    const provenance = localLessonActivityProvenance(
      runtime,
      activity.position,
    );
    if (!provenance) throw new Error(`Missing activity ${activity.position}.`);
    const exercise = activity.exercise;
    return materializeEvidence({
      idempotencyKey: `${sessionId}:answer:${exercise.id}`,
      contentVersion: runtime.contentVersion,
      activityVersion: activity.activityVersion,
      source: "lesson",
      method: methodForExercise(exercise),
      activityId: activity.activityId,
      skill: exercise.skill,
      outcome: "correct",
      score: 100,
      metadata: {
        ...localLessonEvidenceMetadata(provenance),
        questionId: exercise.id,
        wordId: exercise.wordId ?? null,
        selectedAnswer: exercise.correct,
        correctAnswer: exercise.correct,
        requiredForPass: exercise.requiredForPass ?? false,
        priorExposure: false,
      },
    }, ANSWER_TIME);
  });
  const score = scoreLessonSession(answers, answers.length);
  if (!score) throw new Error(`Could not score E2E prerequisite ${lessonId}.`);
  const completion = materializeEvidence({
    idempotencyKey: `${sessionId}:complete`,
    contentVersion: runtime.contentVersion,
    activityVersion: `${runtime.contentVersion}:${runtime.lessonId}:1`,
    source: "lesson",
    method: "lesson-completion",
    activityId: runtime.lessonId,
    skill: lesson.skills[0] ?? "vocabulary",
    outcome: "completed",
    score: score.gateScore,
    metadata: {
      ...localLessonEvidenceMetadata(localLessonSessionProvenance(runtime)),
      passed: score.gateScore >= 70,
      clientScore: score.rawScore,
      rawScore: score.rawScore,
      evidenceCount: answers.length,
      requiredEvidenceCount: score.requiredEvidenceCount,
      requiredCorrect: score.requiredCorrect,
    },
  }, COMPLETION_TIME);
  return [...answers, completion];
};

const outputs = [
  {
    path: "e2e/fixtures/hsk2-bridge-evidence.json",
    evidence: buildPassedEvidence("characters-15", "hsk2-smoke"),
  },
  {
    path: "e2e/fixtures/hsk3-bridge-evidence.json",
    evidence: buildPassedEvidence(
      "hsk2-picture-description-lesson-02",
      "hsk3-smoke",
    ),
  },
  {
    path: "e2e/fixtures/hsk4-bridge-evidence.json",
    evidence: buildPassedEvidence(
      "hsk3-structured-explanation-lesson-03",
      "hsk4-smoke",
    ),
  },
];

for (const output of outputs) {
  const path = `${repositoryRoot}${output.path}`;
  const serialized = `${JSON.stringify(output.evidence, null, 2)}\n`;
  if (check) {
    if (readFileSync(path, "utf8") !== serialized) {
      throw new Error(`${output.path} is stale.`);
    }
  } else {
    writeFileSync(path, serialized);
  }
}

console.log(`${check ? "Verified" : "Built"} ${outputs.length} E2E bridge fixtures.`);
