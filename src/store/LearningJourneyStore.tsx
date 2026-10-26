import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { RELEASED_LESSONS } from "../data/curriculum";
import {
  applyLearningJourneyReceipt,
  createIntegratedJourneyCheckpoint,
  integratedJourneyStorageKey,
  parseIntegratedJourneyCheckpoint,
  selectAuthoritativeJourneyAnchor,
  type IntegratedJourneyCheckpoint,
  type LearningJourneyReceipt,
} from "../learning/integratedJourney";
import {
  buildDailyLearningJourney,
  projectLearningJourneyProgress,
  type DailyLearningJourney,
  type LearningJourneyStep,
} from "../learning/learningJourney";
import {
  LEARNING_JOURNEY_RECEIPT_EVENT,
  type LearningJourneyReceiptEventDetail,
} from "../learning/journeyReceiptEvent";
import { writeLocalStorage } from "../lib/storageKeys";
import { useLearning } from "./LearningStore";
import { useNormalizedLearningProjection } from "./NormalizedLearningProjectionStore";
import { useLearnerOverview } from '../learning/useLearnerOverview';
import { readJourneyScope } from '../sync/journeyScope';
import { reportLearningResumeStorageError } from '../sync/learningResumeStore';

type LearningJourneyContextValue = {
  checkpoint: IntegratedJourneyCheckpoint | null;
  journey: DailyLearningJourney | null;
  currentStep: LearningJourneyStep | null;
  recordReceipt: (receipt: LearningJourneyReceipt) => void;
};

const LearningJourneyContext = createContext<LearningJourneyContextValue | null>(null);

const findReleasedLesson = (lessonId: string | null) => lessonId
  ? RELEASED_LESSONS.find((lesson) => lesson.id === lessonId) ?? null
  : null;

const anchorWordIds = (lessonId: string | null) =>
  findReleasedLesson(lessonId)?.wordIds ?? [];

const persistJourney = (checkpoint: IntegratedJourneyCheckpoint) => {
  if (writeLocalStorage(integratedJourneyStorageKey(checkpoint.scopeKey), JSON.stringify(checkpoint))) return true;
  reportLearningResumeStorageError(new Error('Journey storage failed; retain previous checkpoint.'));
  return false;
};

export function LearningJourneyProvider({ children }: { children: ReactNode }) {
  const { state, dueWordIds, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const { unresolved } = useLearnerOverview();
  const authenticated = sync.session?.authenticated === true;
  const [learningScope, setLearningScope] = useState<Awaited<ReturnType<typeof readJourneyScope>>>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void readJourneyScope(sync.ownerKey, authenticated ? normalized.resetEpoch : null)
        .then(scope => { if (active) setLearningScope(scope); })
        .catch(error => { if (active) { setLearningScope(null); reportLearningResumeStorageError(error); } });
    };
    refresh(); window.addEventListener('hanzi-learning-reset', refresh); window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('hanzi-learning-reset', refresh); window.removeEventListener('focus', refresh); };
  }, [authenticated, normalized.resetEpoch, sync.lastSyncedAt, sync.ownerKey, sync.phase]);
  const scopeKey = learningScope?.ownerGeneration.ownerKey === sync.ownerKey
    && (!authenticated || normalized.resetEpoch === null || normalized.resetEpoch === learningScope.resetEpoch)
    ? learningScope.scopeKey : '';
  const authoritativeNextLessonId = authenticated
    ? selectAuthoritativeJourneyAnchor(normalized.authoritativeProgress)
    : undefined;
  const candidate = buildDailyLearningJourney({ state, dueWordIds, unresolvedMistakeCount: unresolved });
  const candidateAnchor = authoritativeNextLessonId === undefined
    ? candidate.learnLessonId
    : authoritativeNextLessonId;
  const [storedCheckpoint, setCheckpoint] = useState<IntegratedJourneyCheckpoint | null>(null);
  const checkpoint = storedCheckpoint?.scopeKey === scopeKey ? storedCheckpoint : null;

  useEffect(() => {
    if (!scopeKey) return;
    let raw: string | null;
    try { raw = window.localStorage.getItem(integratedJourneyStorageKey(scopeKey)); }
    catch (error) { setCheckpoint(null); reportLearningResumeStorageError(error); return; }
    let stored: IntegratedJourneyCheckpoint | null = null;
    if (raw) {
      try {
        stored = parseIntegratedJourneyCheckpoint(JSON.parse(raw), scopeKey);
      } catch {
        setCheckpoint(null); reportLearningResumeStorageError(new Error('Unreadable journey checkpoint; retain source.')); return;
      }
      if (!stored) { setCheckpoint(null); reportLearningResumeStorageError(new Error('Unsupported journey checkpoint; retain source.')); return; }
    }
    const invalidGoal = stored?.goal !== state.profile.goal;
    const invalidAnchor = stored?.anchorLessonId
      ? !findReleasedLesson(stored.anchorLessonId)
      : false;
    const resetContradiction = Boolean(
      stored?.completedStages.learn
      && stored.anchorLessonId
      && !state.completedLessons[stored.anchorLessonId]
      && !authenticated,
    );
    const finished = Boolean(
      stored?.completedStages.close
      && stored.anchorLessonId !== candidateAnchor,
    );
    const unstartedAnchorDrift = Boolean(
      stored
      && stored.anchorLessonId !== candidateAnchor
      && Object.keys(stored.completedStages).length === 0,
    );
    const next = !stored
      || invalidGoal
      || invalidAnchor
      || resetContradiction
      || finished
      || unstartedAnchorDrift
      ? createIntegratedJourneyCheckpoint({
          scopeKey,
          goal: state.profile.goal,
          anchorLessonId: candidateAnchor,
        })
      : stored;
    setCheckpoint(persistJourney(next) ? next : null);
  }, [authenticated, candidateAnchor, scopeKey, state.completedLessons, state.profile.goal]);

  useEffect(() => {
    if (!checkpoint?.anchorLessonId) return;
    const passedLocally = Boolean(state.completedLessons[checkpoint.anchorLessonId]);
    const passedAuthoritatively = normalized.authoritativeProgress?.lessons
      .some((lesson) =>
        lesson.lessonId === checkpoint.anchorLessonId && lesson.passed
      ) === true;
    if ((!passedLocally && !passedAuthoritatively) || checkpoint.completedStages.learn) return;
    setCheckpoint((current) => {
      if (!current || current.journeyId !== checkpoint.journeyId) return current;
      const result = applyLearningJourneyReceipt(current, {
        stage: "learn",
        source: "lesson",
        lessonId: current.anchorLessonId,
        activityId: `learn:${current.anchorLessonId}:durable-completion`,
      });
      if (result.state !== "accepted") return current;
      if (!persistJourney(result.checkpoint)) return current;
      return result.checkpoint;
    });
  }, [checkpoint, normalized.authoritativeProgress, state.completedLessons]);

  useEffect(() => {
    if (
      authenticated||!checkpoint?.completedStages.learn
      || checkpoint.completedStages.review
    ) return;
    const anchored = buildDailyLearningJourney({
      state,
      dueWordIds,
      anchorLessonId: checkpoint.anchorLessonId,
      reinforcementWordIds: anchorWordIds(checkpoint.anchorLessonId),
      unresolvedMistakeCount: unresolved,
    });
    if (anchored.steps[1].status !== "clear") return;
    setCheckpoint((current) => {
      if (!current || current.journeyId !== checkpoint.journeyId) return current;
      const result = applyLearningJourneyReceipt(current, {
        stage: "review",
        source: "review",
        lessonId: current.anchorLessonId,
        activityId: `review:${current.journeyId}:nothing-due`,
      });
      if (result.state !== "accepted") return current;
      if (!persistJourney(result.checkpoint)) return current;
      return result.checkpoint;
    });
  }, [checkpoint, dueWordIds, state, unresolved,authenticated]);

  const recordReceipt = useCallback((receipt: LearningJourneyReceipt) => {
    if (!scopeKey) return;
    setCheckpoint((current) => {
      if (!current || current.scopeKey !== scopeKey) return current;
      const base = current;
      const result = applyLearningJourneyReceipt(base, receipt);
      if (result.state !== "accepted") return base;
      const next = receipt.stage === "close"
        && candidateAnchor !== result.checkpoint.anchorLessonId
        ? createIntegratedJourneyCheckpoint({
            scopeKey,
            goal: state.profile.goal,
            anchorLessonId: candidateAnchor,
          })
        : result.checkpoint;
      if (!persistJourney(next)) return current;
      return next;
    });
  }, [candidateAnchor, scopeKey, state.profile.goal]);

  useEffect(() => {
    const receive = (event: Event) => {
      recordReceipt(
        (event as CustomEvent<LearningJourneyReceiptEventDetail>).detail,
      );
    };
    window.addEventListener(LEARNING_JOURNEY_RECEIPT_EVENT, receive);
    return () => window.removeEventListener(
      LEARNING_JOURNEY_RECEIPT_EVENT,
      receive,
    );
  }, [recordReceipt]);

  const journey = useMemo(() => {
    if (!checkpoint) return null;
    const base = buildDailyLearningJourney({
      state,
      dueWordIds,
      anchorLessonId: checkpoint.anchorLessonId,
      reinforcementWordIds: checkpoint.completedStages.learn
        ? anchorWordIds(checkpoint.anchorLessonId)
        : [],
      unresolvedMistakeCount: unresolved,
    });
    const completedStages = {
      learn: Boolean(checkpoint.completedStages.learn),
      review: Boolean(checkpoint.completedStages.review),
      transfer: Boolean(checkpoint.completedStages.transfer),
      close: Boolean(checkpoint.completedStages.close),
    };
    if (!authenticated && completedStages.learn && base.steps[1].status === "clear") {
      completedStages.review = true;
    }
    return projectLearningJourneyProgress(base, completedStages, {
      requireReviewReceipt: authenticated,
    });
  }, [checkpoint, dueWordIds, state, unresolved, authenticated]);
  const currentStep = journey?.steps.find((step) => step.status === "action") ?? null;
  const value = useMemo(() => ({
    checkpoint,
    journey,
    currentStep,
    recordReceipt,
  }), [checkpoint, currentStep, journey, recordReceipt]);

  return (
    <LearningJourneyContext.Provider value={value}>
      {children}
    </LearningJourneyContext.Provider>
  );
}

export const useLearningJourney = () => {
  const value = useContext(LearningJourneyContext);
  if (!value) throw new Error("useLearningJourney must be used inside LearningJourneyProvider");
  return value;
};
