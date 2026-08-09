import { RELEASED_LESSONS, WORD_BY_ID } from "../data/curriculum";
import type { ObjectiveAttemptMethod } from "./attemptProtocol";
import { isEvidenceCombinationAllowed } from "../lib/evidencePolicy";
import type {
  ExerciseKind,
  LearningEvidence,
  Lesson,
  Skill,
} from "../types";

const SKILLS: readonly Skill[] = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
];

const methodForExercise = (
  exercise: ExerciseIdentity,
): ObjectiveAttemptMethod => {
  if (exercise.kind === "meaning") return "meaning-selection";
  if (exercise.kind === "listening") return "listening-selection";
  if (exercise.kind === "sentence") return "reading-comprehension";
  if (exercise.kind === "recall") return "typed-character-recall";
  return "phonology-recognition";
};

type ExerciseIdentity = {
  id: string;
  kind: ExerciseKind;
  skill: Skill;
};

/**
 * Presentation-free mirror of the released exercise ID rules. This keeps the
 * dashboard from allocating prompts, answer keys, distractors and explanations
 * for the full bank. A full-catalog parity test fails if the frozen generator
 * ever changes without this index changing with it.
 */
const buildCompactExerciseIdentities = (
  lesson: Lesson,
): ExerciseIdentity[] => {
  const words = lesson.wordIds.flatMap((id) => {
    const word = WORD_BY_ID.get(id);
    return word ? [word] : [];
  });
  const wordIdentities: ExerciseIdentity[] = words.flatMap((word) => [
    { id: `${word.id}-meaning`, kind: "meaning", skill: "vocabulary" },
    { id: `${word.id}-pinyin`, kind: "pinyin", skill: "pronunciation" },
  ]);
  const toneIdentities: ExerciseIdentity[] = words.flatMap((word) =>
    word.syllables.map((syllable) => ({
      id: `${word.id}-tone-${syllable.index}`,
      kind: "tone" as const,
      skill: "pronunciation" as const,
    }))
  );
  const contextIdentities: ExerciseIdentity[] = words.slice(0, 2).flatMap(
    (word) => [
      { id: `${word.id}-listening`, kind: "listening", skill: "listening" },
      { id: `${word.id}-recall`, kind: "recall", skill: "writing" },
      {
        id: `${word.id}-sentence`,
        kind: "sentence",
        skill: lesson.skills.includes("grammar") ? "grammar" : "reading",
      },
    ],
  );
  const regular = [
    ...wordIdentities,
    ...toneIdentities,
    ...contextIdentities,
  ];
  if (lesson.id === "boot-1") {
    const toneIds = new Set(toneIdentities.map((exercise) => exercise.id));
    return [
      ...toneIdentities,
      ...regular.filter((exercise) => !toneIds.has(exercise.id)),
    ];
  }
  if (lesson.id === "boot-4") {
    return [
      { id: "sandhi-ni3-hao3", kind: "tone-pair", skill: "pronunciation" },
      { id: "sandhi-bu4-shi4", kind: "tone-pair", skill: "pronunciation" },
      { id: "sandhi-yi1-ben3", kind: "tone-pair", skill: "pronunciation" },
      ...regular,
    ];
  }
  return regular;
};

export type ReleasedLessonActivity = {
  activityId: string;
  method: ObjectiveAttemptMethod;
  skill: Skill;
};

/**
 * Builds the complete catalog only for validators/tests. Learner-facing routes
 * must not call this helper: doing so allocates more than 30,000 objects on the
 * main thread before the dashboard can paint.
 */
export const buildReleasedLessonActivityCatalogForValidation = () =>
  RELEASED_LESSONS.flatMap(buildReleasedLessonActivities);

const buildReleasedLessonActivities = (
  lesson: Lesson,
): ReleasedLessonActivity[] => buildCompactExerciseIdentities(lesson)
  .filter((exercise) => isEvidenceCombinationAllowed(
    "lesson",
    methodForExercise(exercise),
    exercise.skill,
  ))
  .map((exercise) => ({
    activityId: `${lesson.id}:${exercise.id}`,
    method: methodForExercise(exercise),
    skill: exercise.skill,
  }));

/**
 * Frozen counts from the released catalog. The parity test derives these from
 * the immutable full exercise generator, so content drift fails CI instead of
 * being recomputed in every learner's browser.
 */
export const LEARNING_COVERAGE_TARGETS: Readonly<Record<Skill, number>> =
  Object.freeze({
    pronunciation: 21_083,
    listening: 434,
    speaking: 0,
    reading: 250,
    writing: 434,
    vocabulary: 7_966,
    grammar: 184,
  });

let releasedLessonById: ReadonlyMap<string, Lesson> | null = null;
let releasedActivityById: Map<string, ReleasedLessonActivity> | null = null;
let indexedLessonIds: Set<string> | null = null;

/**
 * Indexes only lessons represented in local evidence. Anonymous learners with
 * no attempts therefore pay no 30k-catalog startup cost; active learners pay a
 * small, bounded cost per lesson they have actually touched.
 */
const findReleasedActivity = (
  activityId: string,
): ReleasedLessonActivity | undefined => {
  const separator = activityId.indexOf(":");
  if (separator <= 0) return undefined;
  const lessonId = activityId.slice(0, separator);

  releasedActivityById ??= new Map();
  indexedLessonIds ??= new Set();
  const cached = releasedActivityById.get(activityId);
  if (cached || indexedLessonIds.has(lessonId)) return cached;

  releasedLessonById ??= new Map(
    RELEASED_LESSONS.map((lesson) => [lesson.id, lesson]),
  );
  indexedLessonIds.add(lessonId);
  const lesson = releasedLessonById.get(lessonId);
  if (!lesson) return undefined;
  for (const activity of buildReleasedLessonActivities(lesson)) {
    releasedActivityById.set(activity.activityId, activity);
  }
  return releasedActivityById.get(activityId);
};

export type LearnerActivityCoverage = Record<Skill, {
  covered: number;
  target: number;
  percent: number | null;
  supported: boolean;
}>;

export const learnerActivityCoveragePercent = (
  covered: number,
  target: number,
) => {
  if (!Number.isFinite(covered) || !Number.isFinite(target) || target <= 0) {
    return null;
  }
  return Math.min(
    100,
    Math.round((Math.max(0, covered) / target) * 1_000) / 10,
  );
};

const coverageFromCounts = (
  counts: Readonly<Partial<Record<Skill, number>>>,
): LearnerActivityCoverage => Object.fromEntries(SKILLS.map((skill) => {
  const target = LEARNING_COVERAGE_TARGETS[skill];
  const covered = Math.min(target, Math.max(0, counts[skill] ?? 0));
  return [skill, {
    covered,
    target,
    percent: learnerActivityCoveragePercent(covered, target),
    supported: target > 0,
  }];
})) as LearnerActivityCoverage;

export const deriveLocalLearnerActivityCoverage = (
  evidence: readonly LearningEvidence[],
): LearnerActivityCoverage => {
  const uniqueCorrectActivities = new Set<string>();
  const counts = Object.fromEntries(SKILLS.map((skill) => [skill, 0])) as
    Record<Skill, number>;
  for (const item of evidence) {
    if (
      item.source !== "lesson"
      || item.outcome !== "correct"
      || !item.verified
      || item.metadata?.usedHint === true
      || item.metadata?.priorExposure === true
    ) continue;
    const released = findReleasedActivity(item.activityId);
    if (
      !released
      || released.skill !== item.skill
      || released.method !== item.method
    ) continue;
    if (uniqueCorrectActivities.has(item.activityId)) continue;
    uniqueCorrectActivities.add(item.activityId);
    counts[item.skill] += 1;
  }
  return coverageFromCounts(counts);
};

/**
 * Uses server-owned COUNT(DISTINCT activity_id) aggregates for correct,
 * unassisted, first-exposure attempts. Values are bounded by the released
 * catalog before presentation.
 */
export const deriveProjectedLearnerActivityCoverage = (
  uniqueCorrectActivityCounts: Readonly<Record<Skill, number>>,
): LearnerActivityCoverage => coverageFromCounts(uniqueCorrectActivityCounts);

export const formatLearnerActivityCoverage = (
  covered: number,
  target: number,
) => target <= 0
  ? "Chưa có hoạt động hỗ trợ"
  : `${covered.toLocaleString("vi-VN")} / ${target.toLocaleString("vi-VN")} hoạt động đúng`;

export const formatCoveragePercent = (percent: number | null) => {
  if (percent === null) return "Chưa hỗ trợ";
  if (percent <= 0) return "0%";
  if (percent < 0.1) return "<0,1%";
  return `${percent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
};
