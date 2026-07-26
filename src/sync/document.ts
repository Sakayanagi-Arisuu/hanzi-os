import {
  Rating,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs";
import {
  CONTENT_VERSION,
  LESSON_BY_ID,
} from "../data/curriculum";
import { isMasteryEligibleEvidence } from "../lib/evidence";
import { downgradeReaderEvidenceTrust } from "../lib/evidencePolicy";
import {
  isValidLearningResetEpoch,
  MAX_LEARNING_RESET_EPOCH,
} from "../learning/resetEpoch";
import type {
  DiagnosticResult,
  LearningEvidence,
  LearningState,
  MistakeRecord,
  Profile,
  SkillMastery,
  StoredFsrsCard,
  StudyEvent,
} from "../types";
import type {
  ClockedSyncValue,
  CloudSyncDocumentV1,
  MergeSyncDocumentsResult,
  SavedWordSyncEntry,
  SyncClock,
  SyncConflict,
  SyncConflictCollection,
} from "./types";
import { canonicalStringify } from "./canonicalHash";

export type { CloudSyncDocumentV1 } from "./types";
export { canonicalStringify, sha256Hex } from "./canonicalHash";

type SyncTime = Date | string;

const ZERO_MASTERY: SkillMastery = {
  pronunciation: 0,
  listening: 0,
  speaking: 0,
  reading: 0,
  writing: 0,
  vocabulary: 0,
  grammar: 0,
};

const deterministicScheduler = fsrs(generatorParameters({
  request_retention: 0.9,
  enable_fuzz: false,
}));

const normalizeTime = (value: SyncTime) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Sync timestamps must be valid ISO dates");
  }
  return date.toISOString();
};

const tryNormalizeTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const cloneJson = <T>(value: T): T =>
  JSON.parse(canonicalStringify(value)) as T;

// Do not use localeCompare in replicated logic: ICU/locale differences can
// otherwise make two runtimes select different conflict winners.
const compareLexical = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

/**
 * Browser speech consent is device-local, so transcript rows never enter a
 * cloud document. Compatibility Reader results remain descriptive but have
 * their legacy client-authored trust flags deterministically downgraded.
 */
export const redactStateForCloud = (state: LearningState): LearningState => {
  const clone = cloneJson(state);
  clone.evidence = clone.evidence
    .filter((item) => item.method !== "speech-transcript")
    .map(downgradeReaderEvidenceTrust);
  return clone;
};

const compareClock = (left: SyncClock, right: SyncClock) => {
  if (left.counter !== right.counter) return left.counter - right.counter;
  const operationOrder = compareLexical(left.operationId, right.operationId);
  if (operationOrder !== 0) return operationOrder;
  return compareLexical(left.observedAt, right.observedAt);
};

const maxClock = (left: SyncClock, right: SyncClock) =>
  compareClock(left, right) >= 0 ? left : right;

const makeClock = (
  counter: number,
  now: SyncTime,
  operationId: string | undefined,
  scope: string,
): SyncClock => {
  const observedAt = normalizeTime(now);
  return {
    counter,
    operationId: operationId?.trim() || `${scope}:${counter}:${observedAt}`,
    observedAt,
  };
};

const fingerprint = (canonical: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}:${canonical.length}`;
};

const addConflict = (
  conflicts: SyncConflict[],
  collection: SyncConflictCollection,
  key: string,
  reason: SyncConflict["reason"],
  selectedCanonical: string,
  variants: [string, string],
) => {
  const variantFingerprints = variants
    .map(fingerprint)
    .sort() as [string, string];
  const candidate: SyncConflict = {
    collection,
    key,
    reason,
    selectedFingerprint: fingerprint(selectedCanonical),
    variantFingerprints,
  };
  if (!conflicts.some((item) => canonicalStringify(item) === canonicalStringify(candidate))) {
    conflicts.push(candidate);
  }
};

const mergeImmutable = <T>(
  left: readonly T[],
  right: readonly T[],
  keyOf: (item: T) => string,
  collection: Extract<SyncConflictCollection, "evidence" | "activity">,
  conflicts: SyncConflict[],
): T[] => {
  const values = new Map<string, { canonical: string; value: T }>();
  for (const item of [...left, ...right]) {
    const key = keyOf(item);
    const canonical = canonicalStringify(item);
    const previous = values.get(key);
    if (!previous) {
      values.set(key, { canonical, value: cloneJson(item) });
      continue;
    }
    if (previous.canonical === canonical) continue;

    const selected = compareLexical(previous.canonical, canonical) <= 0
      ? previous
      : { canonical, value: cloneJson(item) };
    addConflict(
      conflicts,
      collection,
      key,
      "same-key-different-payload",
      selected.canonical,
      [previous.canonical, canonical],
    );
    values.set(key, selected);
  }
  return [...values.values()].map((item) => item.value);
};

const sortEvidence = (items: readonly LearningEvidence[]) =>
  [...items].sort((left, right) =>
    compareLexical(left.occurredAt, right.occurredAt)
    || compareLexical(left.idempotencyKey, right.idempotencyKey)
  );

const sortActivity = (items: readonly StudyEvent[]) =>
  [...items].sort((left, right) =>
    compareLexical(left.occurredAt, right.occurredAt)
    || compareLexical(left.id, right.id)
  );

const mergeClockedValue = <T>(
  left: ClockedSyncValue<T>,
  right: ClockedSyncValue<T>,
  collection: Extract<SyncConflictCollection, "profile" | "diagnostic">,
  conflicts: SyncConflict[],
): ClockedSyncValue<T> => {
  const order = compareClock(left.clock, right.clock);
  if (order !== 0) return cloneJson(order > 0 ? left : right);

  const leftCanonical = canonicalStringify(left.value);
  const rightCanonical = canonicalStringify(right.value);
  if (leftCanonical === rightCanonical) return cloneJson(left);
  const selected = compareLexical(leftCanonical, rightCanonical) <= 0 ? left : right;
  addConflict(
    conflicts,
    collection,
    collection,
    "same-clock-different-value",
    canonicalStringify(selected.value),
    [leftCanonical, rightCanonical],
  );
  return cloneJson(selected);
};

const mergeSavedWords = (
  left: Record<string, SavedWordSyncEntry>,
  right: Record<string, SavedWordSyncEntry>,
  conflicts: SyncConflict[],
) => {
  const merged: Record<string, SavedWordSyncEntry> = {};
  const ids = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  for (const id of ids) {
    const leftEntry = left[id];
    const rightEntry = right[id];
    if (!leftEntry || !rightEntry) {
      merged[id] = cloneJson(leftEntry ?? rightEntry);
      continue;
    }
    const order = compareClock(leftEntry.clock, rightEntry.clock);
    if (order !== 0) {
      merged[id] = cloneJson(order > 0 ? leftEntry : rightEntry);
      continue;
    }
    if (leftEntry.present === rightEntry.present) {
      merged[id] = cloneJson(leftEntry);
      continue;
    }

    // Equal-clock ambiguity fails closed: a tombstone prevents resurrection.
    const selected = leftEntry.present ? rightEntry : leftEntry;
    addConflict(
      conflicts,
      "saved-word",
      id,
      "same-clock-different-value",
      canonicalStringify(selected),
      [canonicalStringify(leftEntry), canonicalStringify(rightEntry)],
    );
    merged[id] = cloneJson(selected);
  }
  return merged;
};

const mergeLegacyXpBaseline = (
  left: ClockedSyncValue<number>,
  right: ClockedSyncValue<number>,
): ClockedSyncValue<number> => {
  if (left.value !== right.value) return cloneJson(left.value > right.value ? left : right);
  return cloneJson(compareClock(left.clock, right.clock) >= 0 ? left : right);
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const evidenceIsMasteryEligible = (item: LearningEvidence) =>
  item.source !== "reader"
  && item.verified
  && (item.outcome === "correct" || item.outcome === "incorrect")
  && item.metadata?.usedHint !== true
  && item.metadata?.priorExposure !== true
  && isMasteryEligibleEvidence(item.method, item.skill);

const replaySkillMastery = (evidence: readonly LearningEvidence[]): SkillMastery => {
  const result = { ...ZERO_MASTERY };
  for (const item of sortEvidence(evidence)) {
    if (!evidenceIsMasteryEligible(item)) continue;
    result[item.skill] = clamp(
      result[item.skill] + (item.outcome === "correct" ? 1 : -1),
    );
  }
  return result;
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
    const isCorrect = item.outcome === "correct";
    const currentStreak = isCorrect ? previous.currentStreak + 1 : 0;
    knowledge[item.activityId] = {
      attempts: previous.attempts + 1,
      correct: previous.correct + (isCorrect ? 1 : 0),
      currentStreak,
      mastery: clamp(Math.round(
        previous.mastery * 0.68
        + (isCorrect ? 100 : 0) * 0.32
        + Math.min(6, currentStreak * 2),
      )),
      lastSeenAt: item.occurredAt,
    };
  }
  return knowledge;
};

const replayCompletedLessons = (
  evidence: readonly LearningEvidence[],
) => {
  const completed: LearningState["completedLessons"] = {};
  const byLesson = new Map<string, LearningEvidence[]>();
  for (const item of sortEvidence(evidence)) {
    if (
      item.source !== "lesson"
      || item.method !== "lesson-completion"
      || !item.verified
    ) continue;
    const list = byLesson.get(item.activityId) ?? [];
    list.push(item);
    byLesson.set(item.activityId, list);
  }
  for (const [lessonId, attempts] of byLesson) {
    const latest = attempts[attempts.length - 1];
    const scores = attempts.map((item) => item.score ?? 0);
    const previous = completed[lessonId];
    completed[lessonId] = {
      score: latest.score ?? 0,
      bestScore: Math.max(previous?.bestScore ?? 0, ...scores),
      attempts: Math.max(previous?.attempts ?? 0, attempts.length),
      completedAt: [previous?.completedAt, latest.occurredAt]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? latest.occurredAt,
    };
  }
  return completed;
};

const serializeCard = (card: Card): StoredFsrsCard => ({
  due: card.due.toISOString(),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: card.elapsed_days,
  scheduled_days: card.scheduled_days,
  learning_steps: card.learning_steps,
  reps: card.reps,
  lapses: card.lapses,
  state: card.state,
  last_review: card.last_review?.toISOString(),
});

const storedCardOrderKey = (card: StoredFsrsCard) =>
  `${card.last_review ?? ""}|${card.due}|${canonicalStringify(card)}`;

const mergeLegacyCards = (states: readonly LearningState[]) => {
  const result: LearningState["fsrsCards"] = {};
  for (const state of states) {
    for (const [wordId, card] of Object.entries(state.fsrsCards)) {
      const previous = result[wordId];
      if (!previous || compareLexical(storedCardOrderKey(card), storedCardOrderKey(previous)) > 0) {
        result[wordId] = cloneJson(card);
      }
    }
  }
  return result;
};

const gradeFromEvidence = (item: LearningEvidence): Grade | null => {
  const rating = Number(item.metadata?.rating);
  return rating === Rating.Again
    || rating === Rating.Hard
    || rating === Rating.Good
    || rating === Rating.Easy
    ? rating as Grade
    : null;
};

const replayFsrsCards = (
  evidence: readonly LearningEvidence[],
  fallbackStates: readonly LearningState[],
  savedWords: Record<string, SavedWordSyncEntry>,
  anchorAt: string,
) => {
  const result = mergeLegacyCards(fallbackStates);
  const activation = new Map<string, string>();

  for (const [wordId, entry] of Object.entries(savedWords)) {
    if (entry.present) {
      activation.set(wordId, tryNormalizeTime(entry.clock.observedAt) ?? anchorAt);
    }
  }
  for (const item of sortEvidence(evidence)) {
    if (item.method !== "lesson-completion" || !item.verified) continue;
    const occurredAt = tryNormalizeTime(item.occurredAt);
    if (!occurredAt) continue;
    const lesson = LESSON_BY_ID.get(item.activityId);
    lesson?.wordIds.forEach((wordId) => {
      const previous = activation.get(wordId);
      if (!previous || compareLexical(occurredAt, previous) < 0) {
        activation.set(wordId, occurredAt);
      }
    });
  }

  const reviews = new Map<string, LearningEvidence[]>();
  for (const item of sortEvidence(evidence)) {
    if (item.method !== "fsrs-rating" || !item.activityId.startsWith("review:")) continue;
    const wordId = item.activityId.slice("review:".length);
    if (!wordId || !gradeFromEvidence(item) || !tryNormalizeTime(item.occurredAt)) continue;
    const list = reviews.get(wordId) ?? [];
    list.push(item);
    reviews.set(wordId, list);
  }

  for (const [wordId, items] of reviews) {
    const firstReviewAt = tryNormalizeTime(items[0].occurredAt);
    if (!firstReviewAt) continue;
    const activatedAt = activation.get(wordId);
    const initialAt = activatedAt && compareLexical(activatedAt, firstReviewAt) <= 0
      ? activatedAt
      : firstReviewAt;
    let card = createEmptyCard(new Date(initialAt));
    for (const item of items) {
      const grade = gradeFromEvidence(item);
      const reviewedAt = tryNormalizeTime(item.occurredAt);
      if (!grade || !reviewedAt) continue;
      card = deterministicScheduler.next(card, new Date(reviewedAt), grade).card;
    }
    result[wordId] = serializeCard(card);
  }

  for (const [wordId, activatedAt] of activation) {
    if (!result[wordId]) {
      result[wordId] = serializeCard(createEmptyCard(new Date(activatedAt || anchorAt)));
    }
  }
  return result;
};

const mergeMistakes = (states: readonly LearningState[]): MistakeRecord[] => {
  const result = new Map<string, MistakeRecord>();
  for (const state of states) {
    for (const mistake of state.mistakes) {
      const previous = result.get(mistake.id);
      if (!previous) {
        result.set(mistake.id, cloneJson(mistake));
        continue;
      }
      const order = compareLexical(mistake.lastAttemptAt, previous.lastAttemptAt)
        || compareLexical(canonicalStringify(mistake), canonicalStringify(previous));
      if (order > 0) result.set(mistake.id, cloneJson(mistake));
    }
  }
  return [...result.values()]
    .sort((left, right) => compareLexical(right.lastAttemptAt, left.lastAttemptAt) || compareLexical(left.id, right.id))
    .slice(0, 120);
};

const deriveStudySummary = (
  activityLog: readonly StudyEvent[],
  fallbackStates: readonly LearningState[],
) => {
  const rewarded = activityLog.flatMap((item) => {
    const occurredAt = tryNormalizeTime(item.occurredAt);
    return item.xp > 0 && occurredAt ? [{ item, occurredAt }] : [];
  });
  if (!rewarded.length) {
    const sorted = [...fallbackStates].sort((left, right) =>
      compareLexical(left.lastStudyDate ?? "", right.lastStudyDate ?? "")
      || left.streak - right.streak
      || left.dailyXp - right.dailyXp
    );
    const latest = sorted.at(-1);
    return {
      lastStudyDate: latest?.lastStudyDate ?? null,
      dailyXp: latest?.dailyXp ?? 0,
      streak: latest?.streak ?? 0,
    };
  }

  const dates = [...new Set(rewarded.map(({ occurredAt }) => occurredAt.slice(0, 10)))].sort();
  const lastStudyDate = dates.at(-1) ?? null;
  const dailyXp = lastStudyDate
    ? rewarded
      .filter(({ occurredAt }) => occurredAt.startsWith(lastStudyDate))
      .reduce((sum, { item }) => sum + item.xp, 0)
    : 0;
  const dateSet = new Set(dates);
  let streak = 0;
  if (lastStudyDate) {
    const cursor = new Date(`${lastStudyDate}T00:00:00.000Z`);
    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }
  return { lastStudyDate, dailyXp, streak };
};

type ProjectionInput = {
  profile: Profile;
  diagnostic: DiagnosticResult;
  savedWords: Record<string, SavedWordSyncEntry>;
  evidence: LearningEvidence[];
  activityLog: StudyEvent[];
  legacyXpBaseline: number;
  fallbackStates: LearningState[];
  anchorAt: string;
};

const materializeProjection = ({
  profile,
  diagnostic,
  savedWords,
  evidence,
  activityLog,
  legacyXpBaseline,
  fallbackStates,
  anchorAt,
}: ProjectionInput): LearningState => {
  const safeEvidence = sortEvidence(
    evidence
      .filter((item) => item.method !== "speech-transcript")
      .map(downgradeReaderEvidenceTrust),
  );
  const safeActivity = sortActivity(activityLog);
  const study = deriveStudySummary(safeActivity, fallbackStates);
  const activityXp = safeActivity.reduce((sum, item) => sum + item.xp, 0);
  const presentSavedWords = Object.entries(savedWords)
    .filter(([, entry]) => entry.present)
    .map(([wordId]) => wordId)
    .sort();

  return {
    schemaVersion: 2,
    contentVersion: CONTENT_VERSION,
    profile: cloneJson(profile),
    xp: Math.max(0, Math.round(legacyXpBaseline + activityXp)),
    dailyXp: study.dailyXp,
    streak: study.streak,
    lastStudyDate: study.lastStudyDate,
    completedLessons: replayCompletedLessons(safeEvidence),
    savedWords: presentSavedWords,
    fsrsCards: replayFsrsCards(safeEvidence, fallbackStates, savedWords, anchorAt),
    reviewCount: safeEvidence.filter((item) => item.method === "fsrs-rating").length,
    skillMastery: replaySkillMastery(safeEvidence),
    knowledge: replayKnowledge(safeEvidence),
    mistakes: mergeMistakes(fallbackStates),
    activityLog: safeActivity,
    diagnostic: cloneJson(diagnostic),
    evidence: safeEvidence,
  };
};

const activityXp = (state: LearningState) =>
  state.activityLog.reduce((sum, item) => sum + item.xp, 0);

const legacyXpForState = (state: LearningState) =>
  Math.max(0, Math.round(state.xp - activityXp(state)));

export type SyncEvolutionIntent = "snapshot" | "local-import" | "reset";

/** Wrap an existing local state without uploading browser-speech evidence. */
export const createInitialSyncDocument = (
  state: LearningState,
  now: SyncTime,
  operationId?: string,
): CloudSyncDocumentV1 => {
  const safe = redactStateForCloud(state);
  const clock = makeClock(1, now, operationId, "sync-initial");
  const conflicts: SyncConflict[] = [];
  const evidence = sortEvidence(mergeImmutable(
    [],
    safe.evidence,
    (item) => item.idempotencyKey,
    "evidence",
    conflicts,
  ));
  const activityLog = sortActivity(mergeImmutable(
    [],
    safe.activityLog,
    (item) => item.id,
    "activity",
    conflicts,
  ));
  const savedWords = Object.fromEntries(
    [...new Set(safe.savedWords)].sort().map((wordId) => [wordId, {
      present: true,
      clock,
    } satisfies SavedWordSyncEntry]),
  );
  const legacyXpBaseline = {
    value: legacyXpForState(safe),
    clock,
  };
  const projection = materializeProjection({
    profile: safe.profile,
    diagnostic: safe.diagnostic,
    savedWords,
    evidence,
    activityLog,
    legacyXpBaseline: legacyXpBaseline.value,
    fallbackStates: [safe],
    anchorAt: clock.observedAt,
  });

  return {
    schemaVersion: 1,
    clock,
    reset: { epoch: 0, clock },
    profile: { value: cloneJson(safe.profile), clock },
    diagnostic: { value: cloneJson(safe.diagnostic), clock },
    savedWords,
    legacyXpBaseline,
    state: projection,
  };
};

/**
 * Convert one durable local transition into the next cloud document. Immutable
 * collections are append-only unless the transition is an explicit full reset.
 */
export const evolveSyncDocument = (
  previousDocument: CloudSyncDocumentV1,
  previousState: LearningState,
  nextState: LearningState,
  now: SyncTime,
  operationId?: string,
  intent: SyncEvolutionIntent = "snapshot",
): CloudSyncDocumentV1 => {
  const previousSafe = redactStateForCloud(previousState);
  const nextSafe = redactStateForCloud(nextState);
  const clock = makeClock(
    previousDocument.clock.counter + 1,
    now,
    operationId,
    "sync-evolve",
  );
  // A missing/corrupt local projection can look identical to a user reset. Only
  // an explicit durable reset command may advance the epoch.
  const reset = intent === "reset";
  const conflicts: SyncConflict[] = [];

  if (reset) {
    const nextResetEpoch = previousDocument.reset.epoch + 1;
    if (!isValidLearningResetEpoch(nextResetEpoch)) {
      throw new RangeError(
        `Learning reset epoch cannot exceed ${MAX_LEARNING_RESET_EPOCH}.`,
      );
    }
    const savedWords: Record<string, SavedWordSyncEntry> = {};
    const baseline = { value: legacyXpForState(nextSafe), clock };
    const projection = materializeProjection({
      profile: nextSafe.profile,
      diagnostic: nextSafe.diagnostic,
      savedWords,
      evidence: nextSafe.evidence,
      activityLog: nextSafe.activityLog,
      legacyXpBaseline: baseline.value,
      fallbackStates: [nextSafe],
      anchorAt: clock.observedAt,
    });
    return {
      schemaVersion: 1,
      clock,
      reset: { epoch: nextResetEpoch, clock },
      profile: { value: cloneJson(nextSafe.profile), clock },
      diagnostic: { value: cloneJson(nextSafe.diagnostic), clock },
      savedWords,
      legacyXpBaseline: baseline,
      state: projection,
    };
  }

  const profileChanged = canonicalStringify(previousSafe.profile) !== canonicalStringify(nextSafe.profile);
  const diagnosticChanged = canonicalStringify(previousSafe.diagnostic) !== canonicalStringify(nextSafe.diagnostic);
  const profile = profileChanged
    ? { value: cloneJson(nextSafe.profile), clock }
    : cloneJson(previousDocument.profile);
  const diagnostic = diagnosticChanged
    ? { value: cloneJson(nextSafe.diagnostic), clock }
    : cloneJson(previousDocument.diagnostic);

  const evidence = sortEvidence(mergeImmutable(
    previousDocument.state.evidence.map(downgradeReaderEvidenceTrust),
    nextSafe.evidence,
    (item) => item.idempotencyKey,
    "evidence",
    conflicts,
  ));
  const activityLog = sortActivity(mergeImmutable(
    previousDocument.state.activityLog,
    nextSafe.activityLog,
    (item) => item.id,
    "activity",
    conflicts,
  ));

  const savedWords = cloneJson(previousDocument.savedWords);
  const previousIds = new Set(previousSafe.savedWords);
  const nextIds = new Set(nextSafe.savedWords);
  for (const wordId of [...new Set([...previousIds, ...nextIds])].sort()) {
    const wasPresent = previousIds.has(wordId);
    const isPresent = nextIds.has(wordId);
    if (wasPresent !== isPresent || !savedWords[wordId]) {
      savedWords[wordId] = { present: isPresent, clock };
    }
  }

  // Compare XP against the full retained activity union, not only the bounded
  // local activity window. Otherwise pruning an old local activity would turn
  // its XP into "legacy" baseline and then count the retained cloud event twice.
  const nextLegacyBaseline = Math.max(
    0,
    Math.round(nextSafe.xp - activityLog.reduce((sum, item) => sum + item.xp, 0)),
  );
  const legacyXpBaseline = nextLegacyBaseline > previousDocument.legacyXpBaseline.value
    ? { value: nextLegacyBaseline, clock }
    : cloneJson(previousDocument.legacyXpBaseline);
  const projection = materializeProjection({
    profile: profile.value,
    diagnostic: diagnostic.value,
    savedWords,
    evidence,
    activityLog,
    legacyXpBaseline: legacyXpBaseline.value,
    fallbackStates: [previousDocument.state, nextSafe],
    anchorAt: clock.observedAt,
  });

  return {
    schemaVersion: 1,
    clock,
    reset: cloneJson(previousDocument.reset),
    profile,
    diagnostic,
    savedWords,
    legacyXpBaseline,
    state: projection,
  };
};

/** Commutative/deterministic merge for two version-one cloud documents. */
export const mergeSyncDocuments = (
  server: CloudSyncDocumentV1,
  incoming: CloudSyncDocumentV1,
): MergeSyncDocumentsResult => {
  const conflicts: SyncConflict[] = [];
  const resetEpoch = Math.max(server.reset.epoch, incoming.reset.epoch);
  const active = [server, incoming].filter((document) => document.reset.epoch === resetEpoch);
  const left = active[0];
  const right = active[1];
  const documentClock = maxClock(server.clock, incoming.clock);
  const resetClock = active.reduce(
    (clock, document) => maxClock(clock, document.reset.clock),
    left.reset.clock,
  );

  const profile = right
    ? mergeClockedValue(left.profile, right.profile, "profile", conflicts)
    : cloneJson(left.profile);
  const diagnostic = right
    ? mergeClockedValue(left.diagnostic, right.diagnostic, "diagnostic", conflicts)
    : cloneJson(left.diagnostic);
  const savedWords = right
    ? mergeSavedWords(left.savedWords, right.savedWords, conflicts)
    : cloneJson(left.savedWords);
  const legacyXpBaseline = right
    ? mergeLegacyXpBaseline(left.legacyXpBaseline, right.legacyXpBaseline)
    : cloneJson(left.legacyXpBaseline);
  const evidence = sortEvidence(mergeImmutable(
    left.state.evidence.map(downgradeReaderEvidenceTrust),
    (right?.state.evidence ?? []).map(downgradeReaderEvidenceTrust),
    (item) => item.idempotencyKey,
    "evidence",
    conflicts,
  ).filter((item) => item.method !== "speech-transcript"));
  const activityLog = sortActivity(mergeImmutable(
    left.state.activityLog,
    right?.state.activityLog ?? [],
    (item) => item.id,
    "activity",
    conflicts,
  ));
  const fallbackStates = active.map((document) => redactStateForCloud(document.state));
  const projection = materializeProjection({
    profile: profile.value,
    diagnostic: diagnostic.value,
    savedWords,
    evidence,
    activityLog,
    legacyXpBaseline: legacyXpBaseline.value,
    fallbackStates,
    anchorAt: documentClock.observedAt,
  });

  conflicts.sort((leftConflict, rightConflict) =>
    compareLexical(leftConflict.collection, rightConflict.collection)
    || compareLexical(leftConflict.key, rightConflict.key)
    || compareLexical(leftConflict.selectedFingerprint, rightConflict.selectedFingerprint)
  );

  return {
    document: {
      schemaVersion: 1,
      clock: cloneJson(documentClock),
      reset: { epoch: resetEpoch, clock: cloneJson(resetClock) },
      profile,
      diagnostic,
      savedWords,
      legacyXpBaseline,
      state: projection,
    },
    conflicts,
  };
};
