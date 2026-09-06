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
import { readLocalStorage, writeLocalStorage } from "../lib/storageKeys";
import { useLearning } from "./LearningStore";
import { useNormalizedLearningProjection } from "./NormalizedLearningProjectionStore";

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

export function LearningJourneyProvider({ children }: { children: ReactNode }) {
  const { state, dueWordIds, sync } = useLearning();
  const normalized = useNormalizedLearningProjection();
  const authenticated = sync.session?.authenticated === true;
  const resetEpoch = authenticated ? normalized.resetEpoch ?? 0 : 0;
  const scopeKey = sync.ownerKey ? `${sync.ownerKey}:${resetEpoch}` : "";
  const authoritativeNextLessonId = authenticated
    ? selectAuthoritativeJourneyAnchor(normalized.authoritativeProgress)
    : undefined;
  const candidate = buildDailyLearningJourney({ state, dueWordIds });
  const candidateAnchor = authoritativeNextLessonId === undefined
    ? candidate.learnLessonId
    : authoritativeNextLessonId;
  const [checkpoint, setCheckpoint] = useState<IntegratedJourneyCheckpoint | null>(null);

  useEffect(() => {
    if (!scopeKey) return;
    const raw = readLocalStorage(integratedJourneyStorageKey(scopeKey));
    let stored: IntegratedJourneyCheckpoint | null = null;
    if (raw) {
      try {
        stored = parseIntegratedJourneyCheckpoint(JSON.parse(raw), scopeKey);
      } catch {
        stored = null;
      }
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
    setCheckpoint(next);
    writeLocalStorage(integratedJourneyStorageKey(scopeKey), JSON.stringify(next));
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
      writeLocalStorage(integratedJourneyStorageKey(current.scopeKey), JSON.stringify(result.checkpoint));
      return result.checkpoint;
    });
  }, [checkpoint, normalized.authoritativeProgress, state.completedLessons]);

  useEffect(() => {
    if (
      !checkpoint?.completedStages.learn
      || checkpoint.completedStages.review
    ) return;
    const anchored = buildDailyLearningJourney({
      state,
      dueWordIds,
      anchorLessonId: checkpoint.anchorLessonId,
      reinforcementWordIds: anchorWordIds(checkpoint.anchorLessonId),
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
      writeLocalStorage(
        integratedJourneyStorageKey(current.scopeKey),
        JSON.stringify(result.checkpoint),
      );
      return result.checkpoint;
    });
  }, [checkpoint, dueWordIds, state]);

  const recordReceipt = useCallback((receipt: LearningJourneyReceipt) => {
    if (!scopeKey) return;
    setCheckpoint((current) => {
      const base = current ?? createIntegratedJourneyCheckpoint({
        scopeKey,
        goal: state.profile.goal,
        anchorLessonId: receipt.lessonId ?? candidateAnchor,
      });
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
      writeLocalStorage(integratedJourneyStorageKey(scopeKey), JSON.stringify(next));
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
    });
    const completedStages = {
      learn: Boolean(checkpoint.completedStages.learn),
      review: Boolean(checkpoint.completedStages.review),
      transfer: Boolean(checkpoint.completedStages.transfer),
      close: Boolean(checkpoint.completedStages.close),
    };
    if (completedStages.learn && base.steps[1].status === "clear") {
      completedStages.review = true;
    }
    return projectLearningJourneyProgress(base, completedStages);
  }, [checkpoint, dueWordIds, state]);
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
