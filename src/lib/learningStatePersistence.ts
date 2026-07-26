import {
  LESSONS,
  RELEASED_LESSONS,
  RELEASED_STORIES,
  RELEASED_WORD_BY_ID,
} from "../data/curriculum";
import { buildLessonResumeExercises } from "../learning/resumeProtocol";
import type {
  EvidenceMethod,
  EvidenceOutcome,
  EvidenceSource,
  LearningEvidence,
  LearningState,
  Skill,
} from "../types";
import { answersMatch, type Exercise } from "./exerciseGeneration";
import { scoreLessonSession } from "./evidence";
import {
  downgradeReaderEvidenceTrust,
  isEvidenceCombinationAllowed,
  isLocallyVerifiedEvidence,
  isPolicyMasteryEligible,
} from "./evidencePolicy";

const MAX_COMPLETED_LESSONS = 2_000;
const MAX_SAVED_WORDS = 5_000;
const MAX_FSRS_CARDS = 5_000;
const MAX_KNOWLEDGE = 20_000;
const MAX_MISTAKES = 2_000;
const MAX_ACTIVITY = 2_000;
const MAX_EVIDENCE = 20_000;

const skills = [
  "pronunciation",
  "listening",
  "speaking",
  "reading",
  "writing",
  "vocabulary",
  "grammar",
] as const satisfies readonly Skill[];
const skillSet = new Set<Skill>(skills);
const sources = new Set<EvidenceSource>([
  "lesson",
  "reader",
  "writing",
  "pronunciation",
  "mistake",
  "review",
  "diagnostic",
]);
const methods = new Set<EvidenceMethod>([
  "meaning-selection",
  "phonology-recognition",
  "listening-selection",
  "typed-character-recall",
  "reading-comprehension",
  "stroke-quiz",
  "speech-transcript",
  "remediation-recall",
  "fsrs-rating",
  "diagnostic-selection",
  "lesson-completion",
]);
const outcomes = new Set<EvidenceOutcome>([
  "correct",
  "incorrect",
  "completed",
  "unverified",
]);
const exerciseKinds = new Set([
  "meaning",
  "pinyin",
  "tone",
  "tone-pair",
  "listening",
  "sentence",
  "recall",
]);
const activityTypes = new Set([
  "lesson",
  "review",
  "correction",
  "diagnostic",
  "practice",
]);
const releasedLessonIds = new Set(RELEASED_LESSONS.map((lesson) => lesson.id));
const releasedLessonById = new Map(
  RELEASED_LESSONS.map((lesson) => [lesson.id, lesson]),
);
const releasedLessonTitles = new Set(
  LESSONS
    .filter((lesson) => releasedLessonIds.has(lesson.id))
    .map((lesson) => lesson.title),
);
const releasedStoryById = new Map(
  RELEASED_STORIES.map((story) => [story.id, story]),
);

type PersistedStateResult =
  | { ok: true; state: LearningState }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const boundedString = (
  value: unknown,
  maxLength: number,
  allowEmpty = false,
) =>
  typeof value === "string"
  && value.length <= maxLength
  && (allowEmpty || value.length > 0);

const finiteInRange = (value: unknown, min: number, max: number) =>
  typeof value === "number"
  && Number.isFinite(value)
  && value >= min
  && value <= max;

const nonNegativeInteger = (value: unknown, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value)
  && Number(value) >= 0
  && Number(value) <= max;

const positiveInteger = (value: unknown, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value)
  && Number(value) >= 1
  && Number(value) <= max;

const validIsoTime = (value: unknown, nullable = false) =>
  (nullable && value === null)
  || (
    typeof value === "string"
    && value.length <= 40
    && Number.isFinite(Date.parse(value))
  );

const validCalendarDate = (value: unknown) => {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value;
};

const activityBelongsTo = (activityId: string, contentId: string) =>
  activityId === contentId || activityId.startsWith(`${contentId}:`);

const referencesReleasedLesson = (activityId: string) =>
  RELEASED_LESSONS.some((lesson) =>
    activityBelongsTo(activityId, lesson.id)
  );

const referencesReleasedStory = (activityId: string) =>
  RELEASED_STORIES.some((story) =>
    activityBelongsTo(activityId, story.id)
  );

const referencesReleasedWordReview = (activityId: string) =>
  activityId.startsWith("review:")
  && RELEASED_WORD_BY_ID.has(activityId.slice("review:".length));

const isReleasedEvidence = (evidence: LearningEvidence) => {
  if (evidence.source === "lesson") {
    return referencesReleasedLesson(evidence.activityId);
  }
  if (evidence.source === "reader") {
    return referencesReleasedStory(evidence.activityId);
  }
  if (evidence.source === "review") {
    return referencesReleasedWordReview(evidence.activityId);
  }
  if (evidence.source === "mistake") {
    return referencesReleasedLesson(evidence.activityId)
      || referencesReleasedWordReview(evidence.activityId);
  }
  if (evidence.source === "writing") {
    const [, wordId = ""] = evidence.activityId.split(":");
    return evidence.activityId.startsWith("stroke-quiz:")
      && RELEASED_WORD_BY_ID.has(wordId);
  }
  return true;
};

const validProfile = (value: unknown) => isRecord(value)
  && boundedString(value.name, 120, true)
  && ["conversation", "hsk", "career", "travel"].includes(String(value.goal))
  && [10, 20, 30].includes(Number(value.dailyMinutes))
  && ["simplified", "traditional"].includes(String(value.script))
  && ["zero", "basic", "hsk1", "hsk2"].includes(String(value.startingLevel))
  && typeof value.onboarded === "boolean";

const validCompletion = (value: unknown) => isRecord(value)
  && finiteInRange(value.score, 0, 100)
  && finiteInRange(value.bestScore, 0, 100)
  && Number(value.bestScore) >= Number(value.score)
  && positiveInteger(value.attempts, 1_000_000)
  && validIsoTime(value.completedAt);

const validFsrsCard = (value: unknown) => isRecord(value)
  && validIsoTime(value.due)
  && finiteInRange(value.stability, 0, Number.MAX_VALUE)
  && finiteInRange(value.difficulty, 0, Number.MAX_VALUE)
  && nonNegativeInteger(value.elapsed_days, 1_000_000_000)
  && nonNegativeInteger(value.scheduled_days, 1_000_000_000)
  && nonNegativeInteger(value.learning_steps, 1_000_000)
  && nonNegativeInteger(value.reps, 1_000_000_000)
  && nonNegativeInteger(value.lapses, 1_000_000_000)
  && nonNegativeInteger(value.state, 3)
  && (value.last_review === undefined || validIsoTime(value.last_review));

const validKnowledgeTrace = (value: unknown) => isRecord(value)
  && nonNegativeInteger(value.attempts, 1_000_000_000)
  && nonNegativeInteger(value.correct, 1_000_000_000)
  && Number(value.correct) <= Number(value.attempts)
  && nonNegativeInteger(value.currentStreak, 1_000_000_000)
  && finiteInRange(value.mastery, 0, 100)
  && validIsoTime(value.lastSeenAt);

const validMistake = (value: unknown) => isRecord(value)
  && boundedString(value.id, 240)
  && boundedString(value.lessonId, 160)
  && boundedString(value.questionId, 240)
  && (value.wordId === undefined || boundedString(value.wordId, 160))
  && typeof value.kind === "string"
  && exerciseKinds.has(value.kind)
  && typeof value.skill === "string"
  && skillSet.has(value.skill as Skill)
  && boundedString(value.prompt, 2_000, true)
  && boundedString(value.selectedAnswer, 2_000, true)
  && boundedString(value.correctAnswer, 2_000, true)
  && boundedString(value.explanation, 6_000, true)
  && positiveInteger(value.occurrences, 1_000_000)
  && nonNegativeInteger(value.correctedStreak, 1_000_000)
  && typeof value.resolved === "boolean"
  && validIsoTime(value.lastAttemptAt);

const isReleasedMistake = (
  mistake: LearningState["mistakes"][number],
) => {
  if (mistake.wordId && !RELEASED_WORD_BY_ID.has(mistake.wordId)) return false;
  if (mistake.lessonId === "review") return Boolean(mistake.wordId);
  return releasedLessonIds.has(mistake.lessonId);
};

const validActivity = (value: unknown) => isRecord(value)
  && boundedString(value.id, 240)
  && typeof value.type === "string"
  && activityTypes.has(value.type)
  && boundedString(value.label, 2_000, true)
  && finiteInRange(value.xp, 0, Number.MAX_VALUE)
  && validIsoTime(value.occurredAt);

const validMetadata = (value: unknown) => {
  if (value === undefined) return true;
  if (!isRecord(value) || Object.keys(value).length > 32) return false;
  return Object.entries(value).every(([key, item]) =>
    key.length > 0
    && key.length <= 80
    && (
      (typeof item === "string" && item.length <= 2_000)
      || (typeof item === "number" && Number.isFinite(item))
      || typeof item === "boolean"
      || item === null
    )
  );
};

const validEvidenceEnvelope = (
  value: unknown,
): value is LearningEvidence => isRecord(value)
  && boundedString(value.id, 400)
  && boundedString(value.idempotencyKey, 240)
  && value.id === `evidence:${String(value.idempotencyKey)}`
  && value.schemaVersion === 1
  && boundedString(value.contentVersion, 80)
  && boundedString(value.activityVersion, 160)
  && boundedString(value.activityId, 240)
  && typeof value.source === "string"
  && sources.has(value.source as EvidenceSource)
  && typeof value.method === "string"
  && methods.has(value.method as EvidenceMethod)
  && typeof value.skill === "string"
  && skillSet.has(value.skill as Skill)
  && typeof value.outcome === "string"
  && outcomes.has(value.outcome as EvidenceOutcome)
  && (value.score === null || finiteInRange(value.score, 0, 100))
  && typeof value.verified === "boolean"
  && typeof value.masteryEligible === "boolean"
  && validIsoTime(value.occurredAt)
  && validMetadata(value.metadata)
  && isEvidenceCombinationAllowed(
    value.source as EvidenceSource,
    value.method as EvidenceMethod,
    value.skill as Skill,
  );

const validEvidence = (value: unknown): value is LearningEvidence => {
  if (!validEvidenceEnvelope(value)) return false;
  return value.verified === (
    (value.metadata as Record<string, unknown> | undefined)
      ?.measurementEligible !== false
    && isLocallyVerifiedEvidence(
      value.source as EvidenceSource,
      value.method as EvidenceMethod,
      value.skill as Skill,
    )
  )
  && value.masteryEligible === (
    value.verified === true
    && (value.outcome === "correct" || value.outcome === "incorrect")
    && (value.metadata as Record<string, unknown> | undefined)
      ?.usedHint !== true
    && (value.metadata as Record<string, unknown> | undefined)
      ?.priorExposure !== true
    && isPolicyMasteryEligible(
      value.method as EvidenceMethod,
      value.skill as Skill,
    )
  );
};

const validDiagnostic = (value: unknown) => isRecord(value)
  && typeof value.completed === "boolean"
  && finiteInRange(value.score, 0, 100)
  && boundedString(value.recommendedLessonId, 120)
  && validIsoTime(value.completedAt, true)
  && (
    value.completed
      ? value.completedAt !== null
      : value.completedAt === null
  );

const compareLexical = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const sortEvidence = (items: readonly LearningEvidence[]) =>
  [...items].sort((left, right) =>
    compareLexical(left.occurredAt, right.occurredAt)
    || compareLexical(left.idempotencyKey, right.idempotencyKey)
  );

const methodForExercise = (exercise: Exercise): EvidenceMethod => {
  if (exercise.kind === "meaning") return "meaning-selection";
  if (exercise.kind === "listening") return "listening-selection";
  if (exercise.kind === "sentence") return "reading-comprehension";
  if (exercise.kind === "recall") return "typed-character-recall";
  return "phonology-recognition";
};

const lessonAnswerSessionId = (evidence: LearningEvidence) => {
  const separator = ":answer:";
  const separatorIndex = evidence.idempotencyKey.lastIndexOf(separator);
  if (separatorIndex <= 0) return null;
  return evidence.idempotencyKey.slice(0, separatorIndex);
};

const exerciseFormCacheKey = (
  lessonId: string,
  sessionId: string,
  script: "simplified" | "traditional",
) => `${lessonId}\u0000${sessionId}\u0000${script}`;

const getExerciseForm = (
  lessonId: string,
  sessionId: string,
  script: "simplified" | "traditional",
  cache: Map<string, Exercise[]>,
) => {
  const key = exerciseFormCacheKey(lessonId, sessionId, script);
  const cached = cache.get(key);
  if (cached) return cached;
  const lesson = releasedLessonById.get(lessonId);
  if (!lesson) return [];
  const exercises = buildLessonResumeExercises(lesson, script, sessionId);
  cache.set(key, exercises);
  return exercises;
};

const answerMatchesExercise = (
  evidence: LearningEvidence,
  lessonId: string,
  sessionId: string,
  exercise: Exercise,
) => {
  const metadata = evidence.metadata;
  if (
    evidence.source !== "lesson"
    || evidence.method === "lesson-completion"
    || evidence.contentVersion
      !== releasedLessonById.get(lessonId)?.contentVersion
    || evidence.activityId !== `${lessonId}:${exercise.id}`
    || evidence.activityVersion !== exercise.activityVersion
    || evidence.idempotencyKey !== `${sessionId}:answer:${exercise.id}`
    || evidence.skill !== exercise.skill
    || evidence.method !== methodForExercise(exercise)
    || (evidence.outcome !== "correct" && evidence.outcome !== "incorrect")
    || !metadata
    || metadata.questionId !== exercise.id
    || metadata.wordId !== (exercise.wordId ?? null)
    || metadata.correctAnswer !== exercise.correct
    || typeof metadata.selectedAnswer !== "string"
    || metadata.requiredForPass !== (exercise.requiredForPass ?? false)
    || typeof metadata.priorExposure !== "boolean"
  ) return false;

  const correct = answersMatch(metadata.selectedAnswer, exercise.correct);
  return evidence.outcome === (correct ? "correct" : "incorrect")
    && evidence.score === (correct ? 100 : 0);
};

const validateLessonAnswer = (
  evidence: LearningEvidence,
  cache: Map<string, Exercise[]>,
) => {
  const sessionId = lessonAnswerSessionId(evidence);
  if (!sessionId) return null;
  const separatorIndex = evidence.activityId.indexOf(":");
  if (separatorIndex <= 0) return null;
  const lessonId = evidence.activityId.slice(0, separatorIndex);
  if (!releasedLessonById.has(lessonId)) return null;

  for (const script of ["simplified", "traditional"] as const) {
    const exercise = getExerciseForm(lessonId, sessionId, script, cache)
      .find((candidate) =>
        answerMatchesExercise(
          evidence,
          lessonId,
          sessionId,
          candidate,
        )
      );
    if (exercise) return { lessonId, sessionId };
  }
  return null;
};

const validateReaderEvidence = (evidence: LearningEvidence) => {
  if (
    evidence.source !== "reader"
    || evidence.method !== "reading-comprehension"
    || evidence.skill !== "reading"
    || (evidence.outcome !== "correct" && evidence.outcome !== "incorrect")
  ) return false;

  for (const story of releasedStoryById.values()) {
    const question = story.comprehension.find((candidate) =>
      evidence.activityId === `${story.id}:${candidate.id}`
    );
    if (!question) continue;
    const metadata = evidence.metadata;
    if (
      evidence.contentVersion !== story.contentVersion
      || evidence.activityVersion !== `${story.contentVersion}:${question.id}:1`
      || !metadata
      || metadata.correctAnswer !== question.correctAnswer
      || typeof metadata.selectedAnswer !== "string"
      || typeof metadata.translationVisible !== "boolean"
      || typeof metadata.usedHint !== "boolean"
      || typeof metadata.priorExposure !== "boolean"
      || metadata.measurementEligible !== false
    ) return false;
    const correct = metadata.selectedAnswer === question.correctAnswer;
    return evidence.outcome === (correct ? "correct" : "incorrect")
      && evidence.score === (correct ? 100 : 0);
  }
  return false;
};

const validCompletionMetadata = (
  completion: LearningEvidence,
  answers: readonly LearningEvidence[],
) => {
  const metadata = completion.metadata;
  if (
    !metadata
    || !positiveInteger(metadata.evidenceCount, MAX_EVIDENCE)
    || !nonNegativeInteger(metadata.requiredEvidenceCount, MAX_EVIDENCE)
    || !nonNegativeInteger(metadata.requiredCorrect, MAX_EVIDENCE)
    || !nonNegativeInteger(metadata.rawScore, 100)
    || !nonNegativeInteger(metadata.clientScore, 100)
    || typeof metadata.passed !== "boolean"
    || metadata.evidenceCount !== answers.length
  ) return false;

  const score = scoreLessonSession(answers, Number(metadata.evidenceCount));
  return score !== null
    && metadata.rawScore === score.rawScore
    && metadata.clientScore === score.rawScore
    && metadata.requiredEvidenceCount === score.requiredEvidenceCount
    && metadata.requiredCorrect === score.requiredCorrect
    && metadata.passed === (score.gateScore >= 70)
    && completion.score === score.gateScore;
};

const validateLessonCompletion = (
  completion: LearningEvidence,
  answersBySession: ReadonlyMap<string, readonly LearningEvidence[]>,
  cache: Map<string, Exercise[]>,
) => {
  if (
    completion.source !== "lesson"
    || completion.method !== "lesson-completion"
    || completion.outcome !== "completed"
    || completion.verified !== true
    || completion.masteryEligible !== false
    || completion.score === null
    || !completion.idempotencyKey.endsWith(":complete")
  ) return false;

  const lesson = releasedLessonById.get(completion.activityId);
  if (
    !lesson
    || completion.contentVersion !== lesson.contentVersion
    || completion.activityVersion
      !== `${lesson.contentVersion}:${lesson.id}:1`
    || completion.skill !== (lesson.skills[0] ?? "vocabulary")
  ) return false;

  const sessionId = completion.idempotencyKey.slice(0, -":complete".length);
  const answers = answersBySession.get(sessionId) ?? [];
  if (
    answers.length === 0
    || answers.some((answer) =>
      Date.parse(answer.occurredAt) > Date.parse(completion.occurredAt)
    )
  ) return false;

  for (const script of ["simplified", "traditional"] as const) {
    const form = getExerciseForm(lesson.id, sessionId, script, cache);
    if (form.length !== answers.length) continue;
    const answerById = new Map(
      answers.map((answer) => [answer.idempotencyKey, answer]),
    );
    if (
      answerById.size !== form.length
      || !form.every((exercise) => {
        const answer = answerById.get(
          `${sessionId}:answer:${exercise.id}`,
        );
        return Boolean(
          answer
          && answerMatchesExercise(
            answer,
            lesson.id,
            sessionId,
            exercise,
          ),
        );
      })
    ) continue;
    return validCompletionMetadata(completion, answers);
  }
  return false;
};

const replaySkillMastery = (
  evidence: readonly LearningEvidence[],
): LearningState["skillMastery"] => {
  const mastery = Object.fromEntries(
    skills.map((skill) => [skill, 0]),
  ) as LearningState["skillMastery"];
  for (const item of sortEvidence(evidence)) {
    if (!item.masteryEligible || item.source === "reader") continue;
    mastery[item.skill] = clamp(
      mastery[item.skill] + (item.outcome === "correct" ? 1 : -1),
    );
  }
  return mastery;
};

const replayKnowledge = (
  evidence: readonly LearningEvidence[],
): LearningState["knowledge"] => {
  const knowledge: LearningState["knowledge"] = {};
  for (const item of sortEvidence(evidence)) {
    if (
      item.source !== "lesson"
      || item.method === "lesson-completion"
      || (item.outcome !== "correct" && item.outcome !== "incorrect")
    ) continue;
    const previous = knowledge[item.activityId] ?? {
      attempts: 0,
      correct: 0,
      currentStreak: 0,
      mastery: 0,
      lastSeenAt: item.occurredAt,
    };
    const correct = item.outcome === "correct";
    const currentStreak = correct ? previous.currentStreak + 1 : 0;
    knowledge[item.activityId] = {
      attempts: previous.attempts + 1,
      correct: previous.correct + (correct ? 1 : 0),
      currentStreak,
      mastery: clamp(Math.round(
        previous.mastery * 0.68
        + (correct ? 100 : 0) * 0.32
        + Math.min(6, currentStreak * 2),
      )),
      lastSeenAt: item.occurredAt,
    };
  }
  return knowledge;
};

const replayCompletedLessons = (
  evidence: readonly LearningEvidence[],
): LearningState["completedLessons"] => {
  const completed: LearningState["completedLessons"] = {};
  for (const item of sortEvidence(evidence)) {
    if (item.method !== "lesson-completion" || item.score === null) continue;
    const previous = completed[item.activityId];
    completed[item.activityId] = {
      score: item.score,
      bestScore: Math.max(previous?.bestScore ?? 0, item.score),
      attempts: (previous?.attempts ?? 0) + 1,
      completedAt: item.occurredAt,
    };
  }
  return completed;
};

/**
 * Parses an ordinary, first-party browser snapshot. Unlike backup import,
 * this path preserves valid local learning evidence and recomputes every
 * navigation/mastery-bearing aggregate from that evidence. It still treats
 * malformed state as corrupt and removes references to content that is not
 * currently released. Aggregate-only legacy progress is downgraded and cannot
 * unlock content or claim mastery after reload.
 */
export function parsePersistedLearningState(
  value: unknown,
  defaults: LearningState,
): PersistedStateResult {
  if (!isRecord(value) || value.schemaVersion !== 2) {
    return { ok: false, error: "Persisted learning state schema is invalid." };
  }
  if (
    !boundedString(value.contentVersion, 80)
    || !validProfile(value.profile)
    || !finiteInRange(value.xp, 0, Number.MAX_VALUE)
    || !finiteInRange(value.dailyXp, 0, Number.MAX_VALUE)
    || !nonNegativeInteger(value.streak, 1_000_000)
    || !validCalendarDate(value.lastStudyDate)
    || !isRecord(value.completedLessons)
    || Object.keys(value.completedLessons).length > MAX_COMPLETED_LESSONS
    || !Array.isArray(value.savedWords)
    || value.savedWords.length > MAX_SAVED_WORDS
    || !isRecord(value.fsrsCards)
    || Object.keys(value.fsrsCards).length > MAX_FSRS_CARDS
    || !nonNegativeInteger(value.reviewCount, 1_000_000_000)
    || !isRecord(value.skillMastery)
    || !isRecord(value.knowledge)
    || Object.keys(value.knowledge).length > MAX_KNOWLEDGE
    || !Array.isArray(value.mistakes)
    || value.mistakes.length > MAX_MISTAKES
    || !Array.isArray(value.activityLog)
    || value.activityLog.length > MAX_ACTIVITY
    || !validDiagnostic(value.diagnostic)
    || !Array.isArray(value.evidence)
    || value.evidence.length > MAX_EVIDENCE
  ) {
    return { ok: false, error: "Persisted learning state is corrupt." };
  }
  const persistedSkillMastery = value.skillMastery as Record<string, unknown>;

  if (
    Object.values(value.completedLessons).some((item) => !validCompletion(item))
    || value.savedWords.some((wordId) => !boundedString(wordId, 160))
    || Object.values(value.fsrsCards).some((card) => !validFsrsCard(card))
    || Object.values(value.knowledge).some((trace) => !validKnowledgeTrace(trace))
    || value.mistakes.some((mistake) => !validMistake(mistake))
    || value.activityLog.some((event) => !validActivity(event))
    || value.evidence.some((evidence) =>
      !validEvidenceEnvelope(evidence)
    )
    || skills.some((skill) =>
      !finiteInRange(persistedSkillMastery[skill], 0, 100)
    )
  ) {
    return { ok: false, error: "Persisted learning state is corrupt." };
  }

  const normalizedEvidence = (
    value.evidence as LearningEvidence[]
  ).map(downgradeReaderEvidenceTrust);
  if (normalizedEvidence.some((evidence) => !validEvidence(evidence))) {
    return { ok: false, error: "Persisted learning state is corrupt." };
  }

  const evidenceKeys = new Set<string>();
  const evidenceIds = new Set<string>();
  for (const item of normalizedEvidence) {
    if (
      evidenceKeys.has(item.idempotencyKey)
      || evidenceIds.has(item.id)
    ) {
      return { ok: false, error: "Persisted learning evidence is duplicated." };
    }
    evidenceKeys.add(item.idempotencyKey);
    evidenceIds.add(item.id);
  }

  const savedWords = [...new Set(
    value.savedWords.filter(
      (wordId): wordId is string =>
        typeof wordId === "string" && RELEASED_WORD_BY_ID.has(wordId),
    ),
  )];
  const fsrsCards = Object.fromEntries(
    Object.entries(value.fsrsCards)
      .filter(([wordId]) => RELEASED_WORD_BY_ID.has(wordId)),
  ) as LearningState["fsrsCards"];
  const mistakes = (value.mistakes as LearningState["mistakes"])
    .filter(isReleasedMistake);
  const activityLog = (value.activityLog as LearningState["activityLog"])
    .filter((event) =>
      event.type !== "lesson" || releasedLessonTitles.has(event.label)
    );
  const releasedEvidence = normalizedEvidence
    .filter(isReleasedEvidence);
  const exerciseFormCache = new Map<string, Exercise[]>();
  const validatedLessonAnswerIds = new Set<string>();
  const answersBySession = new Map<string, LearningEvidence[]>();
  for (const item of releasedEvidence) {
    if (item.source !== "lesson" || item.method === "lesson-completion") {
      continue;
    }
    const proof = validateLessonAnswer(item, exerciseFormCache);
    if (!proof) continue;
    validatedLessonAnswerIds.add(item.id);
    const sessionAnswers = answersBySession.get(proof.sessionId) ?? [];
    sessionAnswers.push(item);
    answersBySession.set(proof.sessionId, sessionAnswers);
  }

  const validatedLessonCompletionIds = new Set<string>();
  for (const item of releasedEvidence) {
    if (
      item.method === "lesson-completion"
      && validateLessonCompletion(
        item,
        answersBySession,
        exerciseFormCache,
      )
    ) {
      validatedLessonCompletionIds.add(item.id);
    }
  }

  const evidence = releasedEvidence.filter((item) => {
    if (item.source === "lesson") {
      return item.method === "lesson-completion"
        ? validatedLessonCompletionIds.has(item.id)
        : validatedLessonAnswerIds.has(item.id);
    }
    if (item.source === "reader") return validateReaderEvidence(item);
    return true;
  });
  const completedLessons = replayCompletedLessons(evidence);
  const skillMastery = replaySkillMastery(evidence);
  const knowledge = replayKnowledge(evidence);
  const diagnostic = value.diagnostic as LearningState["diagnostic"];

  return {
    ok: true,
    state: {
      schemaVersion: 2,
      contentVersion: defaults.contentVersion,
      profile: {
        name: String((value.profile as Record<string, unknown>).name),
        goal: (value.profile as LearningState["profile"]).goal,
        dailyMinutes: (value.profile as LearningState["profile"]).dailyMinutes,
        script: (value.profile as LearningState["profile"]).script,
        startingLevel: (value.profile as LearningState["profile"]).startingLevel,
        onboarded: Boolean((value.profile as Record<string, unknown>).onboarded),
      },
      xp: Number(value.xp),
      dailyXp: Number(value.dailyXp),
      streak: Number(value.streak),
      lastStudyDate: value.lastStudyDate as string | null,
      completedLessons: structuredClone(completedLessons),
      savedWords,
      fsrsCards: structuredClone(fsrsCards),
      reviewCount: Number(value.reviewCount),
      skillMastery,
      knowledge: structuredClone(knowledge),
      mistakes: structuredClone(mistakes),
      activityLog: structuredClone(activityLog),
      diagnostic: {
        ...structuredClone(diagnostic),
        recommendedLessonId: releasedLessonIds.has(diagnostic.recommendedLessonId)
          ? diagnostic.recommendedLessonId
          : defaults.diagnostic.recommendedLessonId,
      },
      evidence: structuredClone(evidence),
    },
  };
}
