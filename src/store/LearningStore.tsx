import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Rating,
  State,
  createEmptyCard,
  fsrs,
  generatorParameters,
  type Card,
  type Grade,
} from "ts-fsrs";
import { CONTENT_VERSION } from "../data/contentIdentity";
import {
  makeIdempotencyKey,
  recordEvidenceInState,
  scoreLessonSession,
} from "../lib/evidence";
import { commitDurableLearningState } from "../lib/durableLearningMutation";
import {
  applyAcceptedDiagnosticPlacement,
  applyObservedDiagnosticCompletion,
  applySkippedDiagnostic,
} from "../lib/diagnosticCompletion";
import {
  canAdvanceMistakeFromEvidence,
  canRecordLocalRemediationAttempt,
  evaluateRemediationAttempt,
} from "../lib/remediation";
import { applyPronunciationQuestReward } from "../learning/pronunciationPractice";
import {
  isLocalLessonRewardClaimed,
  lessonRewardActivityId,
} from "../learning/interactionXp";
import { resolveDevelopmentSingleton } from "../lib/developmentContext";
import {
  selectStoredState,
  type StoredStateSource,
} from "../lib/stateStorageRecovery";
import type {
  LocalLessonActivityProvenanceV1,
  LocalLessonSessionProvenanceV1,
} from "../learning/localLessonRuntime";
import {
  getOrCreateLocalIdentifier,
  isHanziOsStorageKey,
  LEARNING_CORRUPT_STORAGE_KEY,
  LEARNING_OWNER_STORAGE_KEY,
  LEARNING_RECOVERY_STORAGE_KEY,
  LEARNING_STORAGE_KEY,
  SYNC_DEVICE_STORAGE_KEY,
  SYNC_INSTALLATION_STORAGE_KEY,
  readLocalStorage,
  writeLocalStorage,
} from "../lib/storageKeys";
import type {
  LearningSyncCoordinator,
  LearningSyncStatus,
} from "../sync/coordinator";
import type {
  AnswerEvidence,
  EvidenceMethod,
  LearningState,
  MistakeRecord,
  PracticeEvidenceInput,
  Profile,
  StoredFsrsCard,
} from "../types";

const defaultMastery: LearningState["skillMastery"] = {
  pronunciation: 0,
  listening: 0,
  speaking: 0,
  reading: 0,
  writing: 0,
  vocabulary: 0,
  grammar: 0,
};

export const INITIAL_LEARNING_STATE: LearningState = {
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Hành giả vô danh",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: false,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: defaultMastery,
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
};

const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    enable_fuzz: true,
  }),
);

const localDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const yesterdayKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
};

type PersistedStateParser = (
  value: unknown,
  defaults: LearningState,
) => { ok: true; state: LearningState } | { ok: false; error: string };

const deserializeState = (
  raw: string,
  parsePersistedLearningState: PersistedStateParser,
): LearningState => {
  const decoded = JSON.parse(raw) as unknown;
  if (
    typeof decoded !== "object"
    || decoded === null
    || Array.isArray(decoded)
  ) {
    throw new Error("Persisted learning state must be an object.");
  }
  if ((decoded as { schemaVersion?: unknown }).schemaVersion === 2) {
    const current = parsePersistedLearningState(
      decoded,
      INITIAL_LEARNING_STATE,
    );
    if (!current.ok) throw new Error(current.error);
    return current.state;
  }

  const parsed = decoded as Partial<LearningState>;
  const completedLessons = Object.fromEntries(
    Object.entries(parsed.completedLessons ?? {}).map(([lessonId, result]) => {
      const legacy = result as Partial<LearningState["completedLessons"][string]> & { score?: number; completedAt?: string };
      const score = legacy.score ?? 0;
      return [lessonId, {
        score,
        bestScore: legacy.bestScore ?? score,
        attempts: legacy.attempts ?? 1,
        completedAt: legacy.completedAt ?? new Date().toISOString(),
      }];
    }),
  );
  const migrated: LearningState = {
    ...INITIAL_LEARNING_STATE,
    ...parsed,
    schemaVersion: 2,
    contentVersion: CONTENT_VERSION,
    profile: { ...INITIAL_LEARNING_STATE.profile, ...parsed.profile },
    completedLessons,
    savedWords: parsed.savedWords ?? [],
    fsrsCards: parsed.fsrsCards ?? {},
    skillMastery: defaultMastery,
    knowledge: parsed.knowledge ?? {},
    mistakes: parsed.mistakes ?? [],
    activityLog: parsed.activityLog ?? [],
    diagnostic: { ...INITIAL_LEARNING_STATE.diagnostic, ...parsed.diagnostic },
    evidence: [],
  };
  const validated = parsePersistedLearningState(
    migrated,
    INITIAL_LEARNING_STATE,
  );
  if (!validated.ok) throw new Error(validated.error);
  return validated.state;
};

type InitialLearningLoad = {
  state: LearningState;
  source: StoredStateSource;
  primaryRaw: string | null;
  requiresValidation: boolean;
};

const detectInitialLearningLoad = (): InitialLearningLoad => {
  const primaryRaw = readLocalStorage(LEARNING_STORAGE_KEY);
  return {
    state: INITIAL_LEARNING_STATE,
    source: "default",
    primaryRaw,
    requiresValidation: Boolean(primaryRaw),
  };
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

const emptyStoredCard = (now = new Date()) =>
  serializeCard(createEmptyCard(now));

export type LocalLearningMutationDisposition =
  | "inserted"
  | "duplicate"
  | "conflict"
  | "rejected";

type LearningActions = {
  finishOnboarding: (profile: Profile) => boolean;
  updateProfile: (patch: Partial<Profile>) => void;
  recordAnswer: (
    evidence: AnswerEvidence,
    provenance: LocalLessonActivityProvenanceV1,
  ) => Promise<LocalLearningMutationDisposition>;
  recordPracticeEvidence: (evidence: PracticeEvidenceInput) => void;
  completePronunciationMission: (missionId: string) => boolean;
  resolveMistake: (mistakeId: string, isCorrect: boolean, selectedAnswer?: string, idempotencyKey?: string, usedHint?: boolean) => void;
  completeDiagnostic: (score: number) => void;
  acceptDiagnosticPlacement: (
    startingLevel: Exclude<LearningState["profile"]["startingLevel"], "basic">,
    score: number,
  ) => void;
  skipDiagnostic: () => void;
  completeLesson: (
    lessonId: string,
    score: number,
    idempotencyKey: string,
    expectedEvidenceCount: number,
    provenance: LocalLessonSessionProvenanceV1,
  ) => Promise<LocalLearningMutationDisposition>;
  claimLessonReward: (lessonId: string) => Promise<boolean>;
  toggleSavedWord: (wordId: string) => Promise<void>;
  gradeReview: (
    wordId: string,
    rating: Grade,
    idempotencyKey?: string,
    usedHint?: boolean,
  ) => Promise<void>;
  resetProgress: () => Promise<boolean>;
  syncNow: () => Promise<void>;
  prepareSignOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  importProgress: (nextState: LearningState) => Promise<boolean>;
};

type LearningContextValue = {
  state: LearningState;
  actions: LearningActions;
  dueWordIds: string[];
  level: number;
  sync: LearningSyncStatus;
  stateLoadSource: StoredStateSource;
};

const LEARNING_CONTEXT_REGISTRY_KEY = Symbol.for(
  "hanzi-os.learning-context.v1",
);
const LearningContext = resolveDevelopmentSingleton(
  globalThis as unknown as Record<PropertyKey, unknown>,
  LEARNING_CONTEXT_REGISTRY_KEY,
  () => createContext<LearningContextValue | null>(null),
  process.env.NODE_ENV === "development",
);

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const evidenceMethodForAnswer = (evidence: AnswerEvidence): EvidenceMethod => {
  if (evidence.kind === "meaning") return "meaning-selection";
  if (evidence.kind === "listening") return "listening-selection";
  if (evidence.kind === "sentence") return "reading-comprehension";
  if (evidence.kind === "recall") return "typed-character-recall";
  return "phonology-recognition";
};

const appendActivity = (
  current: LearningState["activityLog"],
  event: Omit<LearningState["activityLog"][number], "id" | "occurredAt">,
  stableId?: string,
) => {
  const next = [
    ...current,
    {
    ...event,
    id: stableId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    occurredAt: new Date().toISOString(),
    },
  ];
  if (next.length <= 2_000) return next;
  const rewardIds = new Set(next
    .filter((item) => item.id.startsWith("lesson-reward:"))
    .map((item) => item.id));
  const recentOrdinaryIds = new Set(next
    .filter((item) => !rewardIds.has(item.id))
    .slice(-(2_000 - rewardIds.size))
    .map((item) => item.id));
  return next.filter((item) => rewardIds.has(item.id) || recentOrdinaryIds.has(item.id));
};

const applyStudyDay = (current: LearningState) => {
  const today = localDateKey();
  if (current.lastStudyDate === today) {
    return { streak: current.streak, dailyXp: current.dailyXp };
  }
  return {
    streak: current.lastStudyDate === yesterdayKey() ? current.streak + 1 : 1,
    dailyXp: 0,
  };
};

const loadLocalLessonMutationModules = () => Promise.all([
  import("../data/curriculum"),
  import("../lib/adaptive"),
  import("../lib/exerciseGeneration"),
  import("../learning/localLessonRuntime"),
]);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(detectInitialLearningLoad);
  const [state, setState] = useState<LearningState>(initialLoad.state);
  const [stateLoadSource, setStateLoadSource] = useState<StoredStateSource>(
    initialLoad.source,
  );
  const [bootstrapReady, setBootstrapReady] = useState(
    !initialLoad.requiresValidation,
  );
  const stateRef = useRef(state);
  const coordinatorRef = useRef<LearningSyncCoordinator | null>(null);
  const replacementInFlightRef = useRef(false);
  const [sync, setSync] = useState<LearningSyncStatus>({
    phase: "checking",
    session: null,
    ownerKey: "",
    pendingCount: 0,
    normalizedPendingCount: 0,
    normalizedQuarantinedCount: 0,
    lastSyncedAt: null,
    error: null,
  });
  const coordinatorEnabled = initialLoad.requiresValidation
    || state.profile.onboarded;

  const applyDurableState = useCallback((next: LearningState) => {
    if (!writeLocalStorage(LEARNING_STORAGE_KEY, JSON.stringify(next))) return false;
    stateRef.current = next;
    setState(next);
    return true;
  }, []);

  const runExclusiveReplacement = useCallback(
    async (work: () => Promise<boolean>) => {
      if (replacementInFlightRef.current) return false;
      replacementInFlightRef.current = true;
      try {
        return await work();
      } finally {
        replacementInFlightRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    if (!initialLoad.requiresValidation) return;
    let disposed = false;
    void import("../lib/learningStatePersistence").then((module) => {
      if (disposed) return;
      const loaded = selectStoredState({
        primaryRaw: initialLoad.primaryRaw,
        readRecoveryRaw: () => readLocalStorage(LEARNING_RECOVERY_STORAGE_KEY),
        deserialize: (raw) => deserializeState(
          raw,
          module.parsePersistedLearningState,
        ),
        fallback: INITIAL_LEARNING_STATE,
        onPrimaryCorrupt: (raw) => {
          writeLocalStorage(LEARNING_CORRUPT_STORAGE_KEY, raw);
        },
      });
      stateRef.current = loaded.state;
      setState(loaded.state);
      setStateLoadSource(loaded.source);
      setBootstrapReady(true);
    }).catch((cause: unknown) => {
      if (disposed) return;
      setBootstrapReady(true);
      setSync((current) => ({
        ...current,
        phase: "error",
        error: cause instanceof Error
          ? cause.message
          : "KhÃ´ng thá»ƒ xÃ¡c minh dá»¯ liá»‡u há»c Ä‘Ã£ lÆ°u.",
      }));
    });
    return () => {
      disposed = true;
    };
  }, [initialLoad]);

  useEffect(() => {
    if (!bootstrapReady) return;
    if (!coordinatorEnabled) {
      const installationId = getOrCreateLocalIdentifier(
        SYNC_INSTALLATION_STORAGE_KEY,
        "installation",
      );
      const ownerKey = `anonymous:${installationId}`;
      writeLocalStorage(LEARNING_OWNER_STORAGE_KEY, ownerKey);
      setSync((current) => ({
        ...current,
        phase: "local-only",
        session: null,
        ownerKey,
        error: null,
      }));
      return;
    }
    let disposed = false;
    let coordinator: LearningSyncCoordinator | null = null;
    setSync((current) => ({ ...current, phase: "checking", error: null }));
    void import("../sync/coordinator").then(({ LearningSyncCoordinator }) => {
      if (disposed) return;
      coordinator = new LearningSyncCoordinator({
        initialState: INITIAL_LEARNING_STATE,
        getState: () => stateRef.current,
        applyState: applyDurableState,
        onStatus: setSync,
      });
      coordinatorRef.current = coordinator;
      void coordinator.initialize();
    }).catch((cause: unknown) => {
      if (disposed) return;
      setSync((current) => ({
        ...current,
        phase: "error",
        error: cause instanceof Error
          ? cause.message
          : "Không thể khởi tạo đồng bộ học tập.",
      }));
    });
    return () => {
      disposed = true;
      if (coordinatorRef.current === coordinator) {
        coordinatorRef.current = null;
      }
      coordinator?.dispose();
    };
  }, [applyDurableState, bootstrapReady, coordinatorEnabled]);

  const persist = useCallback((updater: (current: LearningState) => LearningState) => {
    if (replacementInFlightRef.current) return false;
    const current = stateRef.current;
    const updated = updater(current);
    if (updated === current) return true;
    const next = {
      ...updated,
      schemaVersion: 2 as const,
      contentVersion: CONTENT_VERSION,
    };
    if (!applyDurableState(next)) return false;
    coordinatorRef.current?.queueMutation(current, next);
    return true;
  }, [applyDurableState]);

  const actions = useMemo<LearningActions>(() => ({
    finishOnboarding: (profile) =>
      persist((current) => ({
        ...current,
        profile: { ...profile, onboarded: true },
      })),
    updateProfile: (patch) =>
      persist((current) => ({
        ...current,
        profile: { ...current.profile, ...patch },
      })),
    recordAnswer: async (submittedEvidence, provenance) => {
      const [
        { LESSON_BY_ID },
        { isLessonUnlocked },
        { answersMatch },
        {
          localLessonEvidenceMetadata,
          resolveExactLocalLessonActivityProvenance,
        },
      ] = await loadLocalLessonMutationModules();
      const resolved = resolveExactLocalLessonActivityProvenance(provenance);
      if (!resolved) return "rejected";
      const { activity, runtime } = resolved;
      const exercise = activity.exercise;
      const lesson = LESSON_BY_ID.get(runtime.lessonId);
      if (
        !lesson
        || submittedEvidence.lessonId !== runtime.lessonId
        || submittedEvidence.questionId !== exercise.id
        || submittedEvidence.activityVersion !== activity.activityVersion
        || submittedEvidence.idempotencyKey
          !== `${runtime.sessionId}:answer:${exercise.id}`
        || !submittedEvidence.selectedAnswer.trim()
        || (
          exercise.options.length > 0
          && !exercise.options.includes(submittedEvidence.selectedAnswer)
        )
      ) return "rejected";

      const evidence: AnswerEvidence = {
        lessonId: lesson.id,
        questionId: exercise.id,
        wordId: exercise.wordId,
        kind: exercise.kind,
        skill: exercise.skill,
        prompt: exercise.kind === "listening"
          ? exercise.spokenText ?? exercise.prompt
          : exercise.prompt,
        selectedAnswer: submittedEvidence.selectedAnswer,
        correctAnswer: exercise.correct,
        explanation: exercise.explanation,
        isCorrect: answersMatch(
          submittedEvidence.selectedAnswer,
          exercise.correct,
        ),
        idempotencyKey: `${runtime.sessionId}:answer:${exercise.id}`,
        activityVersion: activity.activityVersion,
        requiredForPass: exercise.requiredForPass,
        usedHint: submittedEvidence.usedHint === true,
      };

      let disposition: LocalLearningMutationDisposition = "rejected";
      const durable = persist((current) => {
        if (!isLessonUnlocked(lesson, current)) return current;
        const now = new Date().toISOString();
        const activityId = activity.activityId;
        const activityVersion = activity.activityVersion;
        const idempotencyKey = evidence.idempotencyKey!;
        const priorExposure = current.evidence.some((item) =>
          item.activityId === activityId
          && item.activityVersion === activityVersion
        ) || current.mistakes.some((item) => item.id === activityId);
        const evidenceResult = recordEvidenceInState(current, {
          idempotencyKey,
          contentVersion: runtime.contentVersion,
          activityVersion,
          source: "lesson",
          method: evidenceMethodForAnswer(evidence),
          activityId,
          skill: evidence.skill,
          outcome: evidence.isCorrect ? "correct" : "incorrect",
          score: evidence.isCorrect ? 100 : 0,
          metadata: {
            ...localLessonEvidenceMetadata(provenance),
            questionId: evidence.questionId,
            wordId: evidence.wordId ?? null,
            selectedAnswer: evidence.selectedAnswer,
            correctAnswer: evidence.correctAnswer,
            requiredForPass: evidence.requiredForPass ?? false,
            usedHint: evidence.usedHint === true,
            priorExposure,
          },
        }, now);
        if (!evidenceResult.inserted) {
          disposition = "conflict" in evidenceResult
            ? "conflict"
            : "duplicate";
          return current;
        }
        disposition = "inserted";
        const currentWithEvidence = evidenceResult.state;
        const recordedEvidence = currentWithEvidence.evidence.find(
          (item) => item.idempotencyKey === idempotencyKey,
        );
        const traceKey = activityId;
        const previousTrace = currentWithEvidence.knowledge[traceKey] ?? {
          attempts: 0,
          correct: 0,
          currentStreak: 0,
          mastery: 0,
          lastSeenAt: now,
        };
        const currentStreak = evidence.isCorrect ? previousTrace.currentStreak + 1 : 0;
        const outcome = evidence.isCorrect ? 100 : 0;
        const mastery = clamp(Math.round(
          previousTrace.mastery * 0.68 + outcome * 0.32 + Math.min(6, currentStreak * 2),
        ));

        const mistakeId = activityId;
        const existingIndex = currentWithEvidence.mistakes.findIndex((item) => item.id === mistakeId);
        const mistakes = [...currentWithEvidence.mistakes];
        if (!evidence.isCorrect) {
          const nextMistake: MistakeRecord = {
            id: mistakeId,
            lessonId: evidence.lessonId,
            questionId: evidence.questionId,
            wordId: evidence.wordId,
            kind: evidence.kind,
            skill: evidence.skill,
            prompt: evidence.prompt,
            selectedAnswer: evidence.selectedAnswer,
            correctAnswer: evidence.correctAnswer,
            explanation: evidence.explanation,
            occurrences: existingIndex >= 0 ? mistakes[existingIndex].occurrences + 1 : 1,
            correctedStreak: 0,
            resolved: false,
            lastAttemptAt: now,
          };
          if (existingIndex >= 0) mistakes[existingIndex] = nextMistake;
          else mistakes.unshift(nextMistake);
        } else if (
          existingIndex >= 0
          && recordedEvidence
          && canAdvanceMistakeFromEvidence(recordedEvidence)
        ) {
          const correctedStreak = mistakes[existingIndex].correctedStreak + 1;
          mistakes[existingIndex] = {
            ...mistakes[existingIndex],
            correctedStreak,
            resolved: correctedStreak >= 2,
            lastAttemptAt: now,
          };
        }

        return {
          ...currentWithEvidence,
          knowledge: {
            ...currentWithEvidence.knowledge,
            [traceKey]: {
              attempts: previousTrace.attempts + 1,
              correct: previousTrace.correct + (evidence.isCorrect ? 1 : 0),
              currentStreak,
              mastery,
              lastSeenAt: now,
            },
          },
          mistakes: mistakes.slice(0, 120),
        };
      });
      return durable ? disposition : "rejected";
    },
    recordPracticeEvidence: (evidence) =>
      persist((current) => recordEvidenceInState(current, evidence).state),
    completePronunciationMission: (missionId) => {
      let awarded = false;
      const durable = persist((current) => {
        const result = applyPronunciationQuestReward(current, missionId);
        awarded = result.awarded;
        return result.state;
      });
      return durable && awarded;
    },
    resolveMistake: (mistakeId, isCorrect, selectedAnswer = "", idempotencyKey, usedHint = false) =>
      persist((current) => {
        const target = current.mistakes.find((mistake) => mistake.id === mistakeId);
        if (!canRecordLocalRemediationAttempt(target)) return current;
        const evidenceResult = recordEvidenceInState(current, {
          idempotencyKey: idempotencyKey ?? makeIdempotencyKey(`mistake:${mistakeId}`),
          activityVersion: `${CONTENT_VERSION}:remediation:1`,
          source: "mistake",
          method: "remediation-recall",
          activityId: mistakeId,
          skill: target.skill,
          outcome: isCorrect ? "correct" : "incorrect",
          score: isCorrect ? 100 : 0,
          metadata: {
            selectedAnswer,
            correctAnswer: target.correctAnswer,
            originalKind: target.kind,
            usedHint,
          },
        });
        if (!evidenceResult.inserted) return current;
        const currentWithEvidence = evidenceResult.state;
        const day = applyStudyDay(currentWithEvidence);
        const attempt = evaluateRemediationAttempt(
          target.correctedStreak,
          isCorrect,
          usedHint,
        );
        const mistakes = currentWithEvidence.mistakes.map((mistake) => {
          if (mistake.id !== mistakeId) return mistake;
          return {
            ...mistake,
            correctedStreak: attempt.correctedStreak,
            occurrences: mistake.occurrences + (isCorrect ? 0 : 1),
            resolved: attempt.resolved,
            lastAttemptAt: new Date().toISOString(),
          };
        });
        const earnedXp = attempt.unassistedCorrect ? 8 : 0;
        return {
          ...currentWithEvidence,
          xp: currentWithEvidence.xp + earnedXp,
          dailyXp: day.dailyXp + earnedXp,
          streak: attempt.unassistedCorrect ? day.streak : currentWithEvidence.streak,
          lastStudyDate: attempt.unassistedCorrect ? localDateKey() : currentWithEvidence.lastStudyDate,
          mistakes,
          activityLog: attempt.unassistedCorrect
            ? appendActivity(currentWithEvidence.activityLog, { type: "correction", label: `Phá giải: ${target.prompt}`, xp: earnedXp })
            : currentWithEvidence.activityLog,
        };
      }),
    completeDiagnostic: (score) =>
      persist((current) => applyObservedDiagnosticCompletion(current, score)),
    acceptDiagnosticPlacement: (startingLevel, score) =>
      persist((current) => applyAcceptedDiagnosticPlacement(
        current,
        startingLevel,
        score,
      )),
    skipDiagnostic: () =>
      persist((current) => applySkippedDiagnostic(current)),
    completeLesson: async (
      lessonId,
      score,
      idempotencyKey,
      expectedEvidenceCount,
      provenance,
    ) => {
      const [
        { LESSON_BY_ID },
        { isLessonUnlocked },
        ,
        {
          localLessonEvidenceMetadata,
          resolveExactLocalLessonSessionProvenance,
          resolvePersistedLocalLessonActivityProvenance,
        },
      ] = await loadLocalLessonMutationModules();
      const resolved = resolveExactLocalLessonSessionProvenance(provenance);
      const lesson = LESSON_BY_ID.get(lessonId);
      if (
        !resolved
        || !lesson
        || resolved.runtime.lessonId !== lessonId
        || expectedEvidenceCount !== resolved.runtime.activities.length
        || idempotencyKey !== `${resolved.runtime.sessionId}:complete`
      ) return "rejected";
      const { runtime } = resolved;
      let disposition: LocalLearningMutationDisposition = "rejected";
      const durable = persist((current) => {
        if (!isLessonUnlocked(lesson, current)) return current;
        const sessionAnswers = current.evidence.filter((item) =>
          item.source === "lesson"
          && item.contentVersion === lesson.contentVersion
          && item.activityId.startsWith(`${lessonId}:`)
          && item.idempotencyKey.startsWith(`${runtime.sessionId}:answer:`)
        );
        const answerById = new Map(
          sessionAnswers.map((item) => [item.idempotencyKey, item]),
        );
        const completeExactForm = answerById.size === runtime.activities.length
          && runtime.activities.every((activity) => {
            const answer = answerById.get(
              `${runtime.sessionId}:answer:${activity.exercise.id}`,
            );
            const persisted = answer
              ? resolvePersistedLocalLessonActivityProvenance(answer)
              : null;
            return Boolean(
              answer
              && persisted?.kind === "exact"
              && answer.activityId === activity.activityId
              && answer.activityVersion === activity.activityVersion
              && persisted.resolved.runtime.sessionId === runtime.sessionId
              && persisted.resolved.runtime.lessonId === runtime.lessonId
              && persisted.resolved.runtime.script === runtime.script
              && persisted.resolved.activity.position === activity.position
              && persisted.resolved.activity.activityId
                === activity.activityId
            );
          });
        if (!completeExactForm) return current;
        const sessionScore = scoreLessonSession(
          sessionAnswers,
          expectedEvidenceCount,
        );
        if (!sessionScore) return current;
        const clientScore = clamp(Math.round(score));
        if (clientScore !== sessionScore.rawScore) return current;
        const normalizedScore = sessionScore.gateScore;
        const evidenceResult = recordEvidenceInState(current, {
          idempotencyKey,
          contentVersion: runtime.contentVersion,
          activityVersion: `${lesson.contentVersion}:${lesson.id}:1`,
          source: "lesson",
          method: "lesson-completion",
          activityId: lesson.id,
          skill: lesson.skills[0] ?? "vocabulary",
          outcome: "completed",
          score: normalizedScore,
          metadata: {
            ...localLessonEvidenceMetadata(provenance),
            passed: normalizedScore >= 70,
            clientScore,
            rawScore: sessionScore.rawScore,
            evidenceCount: sessionAnswers.length,
            requiredEvidenceCount: sessionScore.requiredEvidenceCount,
            requiredCorrect: sessionScore.requiredCorrect,
          },
        });
        if (!evidenceResult.inserted) {
          disposition = "conflict" in evidenceResult
            ? "conflict"
            : "duplicate";
          return current;
        }
        disposition = "inserted";
        const currentWithEvidence = evidenceResult.state;
        const day = applyStudyDay(currentWithEvidence);
        const fsrsCards = { ...currentWithEvidence.fsrsCards };
        lesson.wordIds.forEach((wordId) => {
          if (!fsrsCards[wordId]) fsrsCards[wordId] = emptyStoredCard();
        });

        return {
          ...currentWithEvidence,
          xp: currentWithEvidence.xp,
          dailyXp: day.dailyXp,
          streak: day.streak,
          lastStudyDate: localDateKey(),
          completedLessons: {
            ...currentWithEvidence.completedLessons,
            [lessonId]: {
              score: normalizedScore,
              bestScore: Math.max(normalizedScore, currentWithEvidence.completedLessons[lessonId]?.bestScore ?? 0),
              attempts: (currentWithEvidence.completedLessons[lessonId]?.attempts ?? 0) + 1,
              completedAt: new Date().toISOString(),
            },
          },
          fsrsCards,
          activityLog: appendActivity(currentWithEvidence.activityLog, {
            type: "lesson",
            label: lesson.title,
            xp: 0,
          }),
        };
      });
      return durable ? disposition : "rejected";
    },
    claimLessonReward: async (lessonId) => {
      const { LESSON_BY_ID } = await import("../data/curriculum");
      let awarded = false;
      const durable = persist((current) => {
        const lesson = LESSON_BY_ID.get(lessonId);
        const completion = current.completedLessons[lessonId];
        if (
          !lesson
          || !completion
          || completion.bestScore < 70
          || isLocalLessonRewardClaimed({
            lessonId,
            lessonTitle: lesson.title,
            lessonXp: lesson.xp,
            completedAt: completion.completedAt,
            activityLog: current.activityLog,
          })
        ) return current;
        awarded = true;
        const day = applyStudyDay(current);
        return {
          ...current,
          xp: current.xp + lesson.xp,
          dailyXp: day.dailyXp + lesson.xp,
          streak: day.streak,
          lastStudyDate: localDateKey(),
          activityLog: appendActivity(current.activityLog, {
            type: "lesson",
            label: lesson.title,
            xp: lesson.xp,
          }, lessonRewardActivityId(lessonId)),
        };
      });
      return durable && awarded;
    },
    toggleSavedWord: async (wordId) => {
      const { RELEASED_WORD_BY_ID } = await import("../data/curriculum");
      if (!RELEASED_WORD_BY_ID.has(wordId)) return;
      persist((current) => ({
        ...current,
        savedWords: current.savedWords.includes(wordId)
          ? current.savedWords.filter((id) => id !== wordId)
          : [...current.savedWords, wordId],
        fsrsCards: current.fsrsCards[wordId]
          ? current.fsrsCards
          : { ...current.fsrsCards, [wordId]: emptyStoredCard() },
      }));
    },
    gradeReview: async (wordId, rating, idempotencyKey, usedHint = false) => {
      const { RELEASED_WORD_BY_ID, WORD_BY_ID } = await import(
        "../data/curriculum"
      );
      if (!RELEASED_WORD_BY_ID.has(wordId)) return;
      persist((current) => {
        const now = new Date();
        const evidenceResult = recordEvidenceInState(current, {
          idempotencyKey: idempotencyKey ?? makeIdempotencyKey(`review:${wordId}`),
          activityVersion: `${CONTENT_VERSION}:fsrs:1`,
          source: "review",
          method: "fsrs-rating",
          activityId: `review:${wordId}`,
          skill: "vocabulary",
          outcome: rating === Rating.Again ? "incorrect" : "unverified",
          score: null,
          metadata: { rating: Number(rating), usedHint },
        }, now.toISOString());
        if (!evidenceResult.inserted) return current;
        const currentWithEvidence = evidenceResult.state;
        const stored = currentWithEvidence.fsrsCards[wordId] ?? emptyStoredCard(now);
        const result = scheduler.next(
          {
            ...stored,
            due: stored.due,
            last_review: stored.last_review ?? null,
            state: stored.state as State,
          },
          now,
          rating,
        );
        const day = applyStudyDay(currentWithEvidence);
        const word = WORD_BY_ID.get(wordId);
        const recalled = rating !== Rating.Again;
        let mistakes = currentWithEvidence.mistakes;
        if (!recalled && word) {
          const mistakeId = `review:${wordId}`;
          const existing = currentWithEvidence.mistakes.find((item) => item.id === mistakeId);
          const reviewMistake: MistakeRecord = {
            id: mistakeId,
            lessonId: "review",
            questionId: mistakeId,
            wordId,
            kind: "recall",
            skill: "vocabulary",
            prompt: word.simplified,
            selectedAnswer: "Không nhớ",
            correctAnswer: `${word.pinyin} · ${word.meaning}`,
            explanation: `${word.simplified} đọc là ${word.pinyin}, nghĩa là “${word.meaning}”. Ví dụ: ${word.example} — ${word.exampleMeaning}.`,
            occurrences: (existing?.occurrences ?? 0) + 1,
            correctedStreak: 0,
            resolved: false,
            lastAttemptAt: now.toISOString(),
          };
          mistakes = [reviewMistake, ...currentWithEvidence.mistakes.filter((item) => item.id !== mistakeId)].slice(0, 120);
        }
        return {
          ...currentWithEvidence,
          xp: currentWithEvidence.xp + 5,
          dailyXp: day.dailyXp + 5,
          streak: day.streak,
          lastStudyDate: localDateKey(),
          reviewCount: currentWithEvidence.reviewCount + 1,
          fsrsCards: {
            ...currentWithEvidence.fsrsCards,
            [wordId]: serializeCard(result.card),
          },
          mistakes,
          activityLog: appendActivity(currentWithEvidence.activityLog, {
            type: "review",
            label: word ? `Ôn ${word.simplified}` : "Ôn ký ức",
            xp: 5,
          }),
        };
      });
    },
    resetProgress: () => runExclusiveReplacement(async () => {
      const current = stateRef.current;
      const coordinator = coordinatorRef.current;
      if (!coordinator) return false;
      let hanziOsKeys: string[];
      try {
        hanziOsKeys = Array.from({ length: localStorage.length }, (_, index) =>
          localStorage.key(index)
        ).filter((key): key is string => Boolean(
          key
          && isHanziOsStorageKey(key)
          && key !== LEARNING_STORAGE_KEY
          && key !== LEARNING_OWNER_STORAGE_KEY
          && key !== SYNC_DEVICE_STORAGE_KEY
          && key !== SYNC_INSTALLATION_STORAGE_KEY,
        ));
      } catch {
        window.dispatchEvent(new CustomEvent("hanzi-storage-error"));
        return false;
      }

      if (!await commitDurableLearningState({
        nextState: INITIAL_LEARNING_STATE,
        enqueue: () => coordinator.queueMutation(
          current,
          INITIAL_LEARNING_STATE,
          "reset",
        ),
        apply: applyDurableState,
      })) return false;
      try {
        hanziOsKeys.forEach((key) => localStorage.removeItem(key));
      } catch {
        window.dispatchEvent(new CustomEvent("hanzi-storage-error"));
        // The learning reset is already durable; the global storage warning
        // reports any ancillary key that the browser refused to remove.
      }
      try {
        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.allSettled(
            cacheKeys
              .filter((key) => key.startsWith("hanzi-os-"))
              .map((key) => caches.delete(key)),
          );
        }
      } catch {
        // Cache cleanup is recoverable and must not roll back learning-data reset.
      }
      return true;
    }),
    syncNow: () => coordinatorRef.current?.syncNow() ?? Promise.resolve(),
    prepareSignOut: () => coordinatorRef.current?.prepareSignOut() ?? Promise.resolve(),
    deleteAccount: () => coordinatorRef.current?.deleteAccount() ?? Promise.resolve(),
    importProgress: (nextState) => runExclusiveReplacement(async () => {
      const current = stateRef.current;
      const coordinator = coordinatorRef.current;
      if (!coordinator) return false;
      if (!writeLocalStorage(
        LEARNING_RECOVERY_STORAGE_KEY,
        JSON.stringify(current),
      )) return false;
      const next = {
        ...nextState,
        schemaVersion: 2 as const,
        contentVersion: CONTENT_VERSION,
      };
      return commitDurableLearningState({
        nextState: next,
        enqueue: () => coordinator.queueMutation(current, next, "local-import"),
        apply: applyDurableState,
      });
    }),
  }), [applyDurableState, persist, runExclusiveReplacement]);

  const dueWordIds = useMemo(() => {
    const now = Date.now();
    const activated = Object.keys(state.fsrsCards);
    return activated.filter((wordId) =>
      new Date(state.fsrsCards[wordId].due).getTime() <= now,
    ).slice(0, 12);
  }, [state.fsrsCards]);

  const value = useMemo<LearningContextValue>(
    () => ({
      state,
      actions,
      dueWordIds,
      level: Math.floor(state.xp / 500) + 1,
      sync,
      stateLoadSource,
    }),
    [state, dueWordIds, actions, sync, stateLoadSource],
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export const useLearning = () => {
  const value = useContext(LearningContext);
  if (!value) throw new Error("useLearning must be used inside LearningProvider");
  return value;
};
