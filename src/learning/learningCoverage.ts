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

export const PILLAR_SIGNAL_POLICY_VERSION = "wilson-confidence-v1" as const;
export const PILLAR_SIGNAL_MINIMUM_SPAN_MS =
  24 * 60 * 60 * 1_000;
export const PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES = 6;
export const PILLAR_SIGNAL_SAMPLE_TARGET = 24;

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
  activityVersion: string;
  contentVersion: string;
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
    activityVersion: exercise.kind === "tone-pair"
      ? `${lesson.contentVersion}:tone-sandhi:1`
      : `${lesson.contentVersion}:${lesson.id}:1`,
    contentVersion: lesson.contentVersion,
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

export type LearnerActivityCoverageState =
  | "unavailable"
  | "insufficient"
  | "measured";

export type LearnerActivityCoverageItem = {
  covered: number;
  target: number;
  percent: number | null;
  /** The learner can enter a released practice flow for this pillar. */
  practiceAvailable: boolean;
  /** A reviewed, policy-bound measurement channel exists for this pillar. */
  supported: boolean;
  state: LearnerActivityCoverageState;
};

export type LearnerActivityCoverage = Record<
  Skill,
  LearnerActivityCoverageItem
>;

const roundedPercent = (value: number) => Math.min(
  100,
  Math.max(0, Math.round(value * 10) / 10),
);

/**
 * Conservative 95% Wilson lower bound, weighted by independent sample depth.
 * It deliberately avoids claiming IRT/BKT calibration: released activities do
 * not yet carry reviewed difficulty/discrimination parameters. A perfect but
 * tiny sample therefore stays low, while errors and uncertainty both pull the
 * signal down.
 */
const confidenceAdjustedPillarSignal = (
  correct: number,
  observed: number,
) => {
  if (observed <= 0 || correct < 0 || correct > observed) return null;
  const z = 1.96;
  const zSquared = z * z;
  const proportion = correct / observed;
  const denominator = 1 + zSquared / observed;
  const centre = proportion + zSquared / (2 * observed);
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * observed)) / observed,
  );
  const lowerBound = Math.max(0, (centre - margin) / denominator);
  const sampleReliability = Math.min(1, observed / PILLAR_SIGNAL_SAMPLE_TARGET);
  return roundedPercent(lowerBound * sampleReliability * 100);
};

const emptyPillarSignal = (): LearnerActivityCoverage => Object.fromEntries(
  SKILLS.map((skill) => {
    const supported = LEARNING_COVERAGE_TARGETS[skill] > 0;
    // Speaking practice is released in Vạn Âm Điện, but browser transcripts
    // remain unverified and therefore cannot become a skill measurement.
    const practiceAvailable = supported || skill === "speaking";
    return [skill, {
      covered: 0,
      target: supported ? PILLAR_SIGNAL_SAMPLE_TARGET : 0,
      percent: null,
      practiceAvailable,
      supported,
      state: supported ? "insufficient" : "unavailable",
    }];
  }),
) as LearnerActivityCoverage;

type PillarSignalCandidate = {
  occurredAt: number;
  outcome: "correct" | "incorrect";
  sessionId: string;
  stableOrder: string;
};

const localPillarSignalCandidate = (
  item: LearningEvidence,
  released: ReleasedLessonActivity,
): PillarSignalCandidate | null => {
  if (
    item.source !== "lesson"
    || (item.outcome !== "correct" && item.outcome !== "incorrect")
    || (item.outcome === "correct" ? item.score !== 100 : item.score !== 0)
    || !item.verified
    || item.contentVersion !== released.contentVersion
    || item.activityVersion !== released.activityVersion
    || item.skill !== released.skill
    || item.method !== released.method
    || item.metadata?.usedHint !== false
    || typeof item.metadata.sessionId !== "string"
    || !item.metadata.sessionId
  ) return null;

  const occurredAt = Date.parse(item.occurredAt);
  if (!Number.isFinite(occurredAt)) return null;
  return {
    occurredAt,
    outcome: item.outcome,
    sessionId: item.metadata.sessionId,
    stableOrder: item.idempotencyKey,
  };
};

const byTimeThenStableOrder = (
  left: PillarSignalCandidate,
  right: PillarSignalCandidate,
) => left.occurredAt - right.occurredAt
  || left.stableOrder.localeCompare(right.stableOrder);

export const deriveLocalLearnerActivityCoverage = (
  evidence: readonly LearningEvidence[],
): LearnerActivityCoverage => {
  // One activity contributes at most one independent item. Within a lesson
  // session only the first clean attempt counts, preventing an immediate retry
  // from becoming fresh evidence. A later session may update the item's latest
  // observed outcome without increasing breadth.
  const activitySessions = new Map<
    string,
    Map<string, PillarSignalCandidate>
  >();
  for (const item of evidence) {
    const released = findReleasedActivity(item.activityId);
    if (!released) continue;
    const candidate = localPillarSignalCandidate(item, released);
    if (!candidate) continue;
    const sessions = activitySessions.get(item.activityId) ?? new Map();
    const existing = sessions.get(candidate.sessionId);
    if (!existing || byTimeThenStableOrder(candidate, existing) < 0) {
      sessions.set(candidate.sessionId, candidate);
    }
    activitySessions.set(item.activityId, sessions);
  }

  const selectedBySkill = new Map<Skill, PillarSignalCandidate[]>();
  const observationsBySkill = new Map<Skill, PillarSignalCandidate[]>();
  for (const [activityId, sessions] of activitySessions) {
    const released = findReleasedActivity(activityId);
    if (!released || sessions.size <= 0) continue;
    const observations = [...sessions.values()].sort(byTimeThenStableOrder);
    const selected = observations.at(-1)!;
    selectedBySkill.set(released.skill, [
      ...(selectedBySkill.get(released.skill) ?? []),
      selected,
    ]);
    observationsBySkill.set(released.skill, [
      ...(observationsBySkill.get(released.skill) ?? []),
      ...observations,
    ]);
  }

  const signal = emptyPillarSignal();
  for (const skill of SKILLS) {
    if (!signal[skill].supported) continue;
    const selected = selectedBySkill.get(skill) ?? [];
    const observations = observationsBySkill.get(skill) ?? [];
    const covered = selected.length;
    signal[skill].covered = covered;
    if (covered < PILLAR_SIGNAL_MINIMUM_UNIQUE_ACTIVITIES) continue;

    const sessions = new Set(observations.map((item) => item.sessionId));
    const ordered = [...observations].sort(byTimeThenStableOrder);
    const span = ordered.length > 1
      ? ordered.at(-1)!.occurredAt - ordered[0]!.occurredAt
      : 0;
    if (sessions.size < 2 || span < PILLAR_SIGNAL_MINIMUM_SPAN_MS) continue;

    const correct = selected.filter((item) => item.outcome === "correct").length;
    signal[skill].percent = confidenceAdjustedPillarSignal(correct, covered);
    signal[skill].state = "measured";
  }
  return signal;
};

/**
 * Projection V4 only carries first-exposure correct breadth. It does not carry
 * the item outcomes, distinct sessions and server time required by the
 * confidence signal. Treating those raw counts as a skill estimate would
 * silently change their meaning, so account pillars remain insufficient until
 * a newer exact projection supplies a policy-bound aggregate.
 */
export const deriveProjectedLearnerActivityCoverage = (
  uniqueCorrectActivityCounts: Readonly<Record<Skill, number>>,
): LearnerActivityCoverage => {
  void uniqueCorrectActivityCounts;
  return emptyPillarSignal();
};

export const formatLearnerActivityCoverage = (
  covered: number,
  target: number,
) => target <= 0
  ? "Trụ chưa khai mở"
  : covered <= 0
    ? "Chưa ghi nhận chiến tích"
    : `${covered.toLocaleString("vi-VN")} / ${target.toLocaleString("vi-VN")} chiến tích khảo luyện`;

export const formatCoveragePercent = (percent: number | null) => {
  if (percent === null) return "Chưa hỗ trợ";
  if (percent <= 0) return "0%";
  if (percent < 0.1) return "<0,1%";
  return `${percent.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
};
