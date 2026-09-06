import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  CircleCheck,
  CircleX,
  Headphones,
  Lightbulb,
  LockKeyhole,
  PenLine,
  RefreshCw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router";
import { LessonQuestResult } from "../components/LessonQuestResult";
import { LessonQuestTransition } from "../components/LessonQuestTransition";
import { LessonTheoryPanel } from "../components/LessonTheoryPanel";
import { HanziPinyinInput } from "../components/HanziPinyinInput";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { ConfirmModal } from "../components/SystemFeedback";
import { LESSON_BY_ID, WORD_BY_ID } from "../data/curriculum";
import { getLessonGuide } from "../data/lessonGuides";
import { getLessonTeachingGuide } from "../learning/lessonPedagogy";
import { learnerFacingCopy } from "../learning/lessonTeachingFlow";
import type {
  PublishedStudioLesson,
  PublishedStudioLessonEnhancement,
} from "../content/publishedStudioLessons";
import {
  buildNormalizedLessonAbandonQueueInput,
  buildNormalizedLessonAttemptQueueInput,
  buildNormalizedLessonOpenQueueInput,
  buildNormalizedLessonSubmissionQueueInput,
  deriveStableNormalizedLessonCommandIds,
  type StableNormalizedLessonCommandIds,
} from "../learning/normalizedLessonCommands";
import {
  materializeNormalizedLessonRuntime,
  materializeNormalizedLessonRuntimeFromAuthorityBinding,
  type NormalizedLessonPresentationActivityV1,
  type NormalizedLessonRuntimeV1,
} from "../learning/normalizedLessonRuntime";
import type { LessonSessionAuthorityBindingV1 } from "../learning/lessonSessionProtocol";
import type { SubmitLessonSessionReceiptV1 } from "../learning/lessonSessionSubmissionProtocol";
import type { ActiveLessonAttemptProjectionV1 } from "../learning/projectionProtocol";
import { resolveExerciseSpeechText } from "../learning/exerciseSpeech";
import { buildLessonAnswerFeedback } from "../learning/lessonFeedback";
import { claimLessonInteractionXp } from "../learning/interactionXpClient";
import {
  abandonmentReceiptMatchesSessionBinding,
  activeProjectionMatchesSessionBinding,
  lessonAttemptReceiptMatchesSessionBinding,
  runtimeMatchesSessionBinding,
  submissionReceiptMatchesSessionBinding,
} from "../learning/normalizedLessonUiAuthority";
import {
  isLessonReleased,
} from "../lib/adaptive";
import { makeIdempotencyKey } from "../lib/evidence";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useInteractionXp } from "../store/InteractionXpStore";
import { useLearningJourney } from "../store/LearningJourneyStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { emitSystemSignal } from "../system/systemSignals";
import {
  enqueueLessonSessionAbandonmentCommand,
  enqueueLessonSessionCommand,
  enqueueLessonSessionSubmissionCommand,
  enqueueObjectiveAttemptCommand,
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
  listLearningCommandRecords,
  releaseLearningCommandRetry,
  type LearningCommandOutboxRecord,
  type QueuedLessonSessionDependency,
} from "../sync/learningCommandOutbox";
import { readExactNormalizedLessonEnvironment } from "../sync/normalizedLessonEnvironment";
import { adoptActiveLessonSessionFromCachedProjection } from "../sync/projectedLessonSessionAdoption";
import type { Lesson, VocabularyItem } from "../types";

type RuntimePhase =
  | "loading"
  | "briefing"
  | "opening"
  | "exercise"
  | "submitting"
  | "abandoning"
  | "remote-session"
  | "result"
  | "error";

type AttemptOutcome = "idle" | "pending" | "correct" | "incorrect";

class LessonTransitionDeadlineError extends Error {
  constructor() {
    super("Lesson transition exceeded its recovery deadline.");
    this.name = "LessonTransitionDeadlineError";
  }
}

const withLessonTransitionDeadline = <T,>(
  operation: Promise<T>,
  timeoutMs = 8_000,
) => new Promise<T>((resolve, reject) => {
  const timeout = window.setTimeout(
    () => reject(new LessonTransitionDeadlineError()),
    timeoutMs,
  );
  operation.then(resolve, reject).finally(() => window.clearTimeout(timeout));
});

const exerciseIcon = (kind: NormalizedLessonPresentationActivityV1["kind"]) => {
  if (kind === "listening") return Headphones;
  if (kind === "sentence") return BookOpenText;
  if (kind === "recall") return PenLine;
  return Sparkles;
};

const newestRecord = <T extends LearningCommandOutboxRecord>(records: T[]) =>
  [...records].sort((left, right) => right.deviceSequence - left.deviceSequence)[0]
    ?? null;

const terminalForSession = (
  records: LearningCommandOutboxRecord[],
  session: QueuedLessonSessionDependency,
) => newestRecord(records.filter((record) =>
  (record.kind === "lesson-session-submit"
    || record.kind === "lesson-session-abandon")
  && record.dependencyRecordKey === session.recordKey
));

const authorityBindingForSession = (
  session: QueuedLessonSessionDependency,
): LessonSessionAuthorityBindingV1 | null =>
  session.kind === "projected-lesson-session-anchor"
    ? session.binding
    : session.receipt;

const projectedAttemptsForSession = (
  session: QueuedLessonSessionDependency,
): ActiveLessonAttemptProjectionV1[] =>
  session.kind === "projected-lesson-session-anchor"
    ? session.projectedAttempts
    : [];

const currentLessonVersion = (lesson: Lesson) =>
  `${lesson.contentVersion}:${lesson.id}:1`;

type PublishedLessonProps = {
  publishedLesson?: PublishedStudioLesson;
  publishedLessonEnhancement?: PublishedStudioLessonEnhancement;
  publishedLessonStatus: "loading" | "ready" | "fallback";
  retryPublishedLesson: () => void;
};

export function AuthenticatedLessonPage(props: PublishedLessonProps) {
  const { lessonId } = useParams();
  const { sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : "identity-pending";
  const authorityKey = [
    lessonId ?? "missing-lesson",
    accountKey,
    authority.ownerGeneration?.ownerKey ?? "missing-owner",
    authority.ownerGeneration?.generation ?? "missing-generation",
    authority.resetEpoch ?? "missing-reset",
    authority.projection?.contentVersion ?? "missing-content",
    authority.projection?.manifestSha256 ?? "missing-manifest",
    authority.projection?.enrollment?.enrollmentId ?? "missing-enrollment",
  ].join("\u0000");
  return <AuthenticatedLessonPageScope key={authorityKey} {...props} />;
}

function AuthenticatedLessonPageScope({
  publishedLesson,
  publishedLessonEnhancement,
  publishedLessonStatus,
  retryPublishedLesson,
}: PublishedLessonProps) {
  const { lessonId } = useParams();
  const { state, actions, sync } = useLearning();
  const interactionXp = useInteractionXp();
  const { currentStep, recordReceipt } = useLearningJourney();
  const requestedLesson = lessonId ? LESSON_BY_ID.get(lessonId) : undefined;
  const availableForPath = Boolean(
    requestedLesson
    && isLessonReleased(requestedLesson)
  );
  const unavailableLesson = Boolean(requestedLesson && !availableForPath);
  const lesson = availableForPath ? requestedLesson : undefined;
  const presentedLesson = lesson && publishedLesson?.lesson.id === lesson.id
    ? publishedLesson.lesson
    : lesson;
  const authority = useNormalizedLearningProjection();
  const refreshProjection = authority.refresh;
  const [records, setRecords] = useState<LearningCommandOutboxRecord[] | null>(
    null,
  );
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [phase, setPhase] = useState<RuntimePhase>("loading");
  const [runtime, setRuntime] = useState<NormalizedLessonRuntimeV1 | null>(null);
  const [commandIds, setCommandIds] =
    useState<StableNormalizedLessonCommandIds | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedUsedHint, setSelectedUsedHint] = useState(false);
  const [outcome, setOutcome] = useState<AttemptOutcome>("idle");
  const [busy, setBusy] = useState(false);
  const [, setError] = useState<string | null>(null);
  const [result, setResult] =
    useState<SubmitLessonSessionReceiptV1 | null>(null);
  const [sessionBinding, setSessionBinding] =
    useState<LessonSessionAuthorityBindingV1 | null>(null);
  const [projectedAttempts, setProjectedAttempts] = useState<
    ActiveLessonAttemptProjectionV1[]
  >([]);
  const [dismissedTerminalId, setDismissedTerminalId] = useState<string | null>(
    null,
  );
  const [abandonModalOpen, setAbandonModalOpen] = useState(false);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const [reviewingTheory, setReviewingTheory] = useState(false);
  const [theoryReady, setTheoryReady] = useState(false);
  const [transitionDelayed, setTransitionDelayed] = useState(false);
  const [transitionRetrying, setTransitionRetrying] = useState(false);
  const [transitionActiveStep, setTransitionActiveStep] = useState<0 | 1 | 2>(0);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardClaimedLocally, setRewardClaimedLocally] = useState(false);

  useEffect(() => {
    if (!result?.passed || !lesson) return;
    recordReceipt({
      stage: "learn",
      source: "lesson",
      lessonId: lesson.id,
      activityId: `${result.idempotencyKey}:journey-learn`,
    });
  }, [lesson, recordReceipt, result]);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const advanceLockRef = useRef(false);
  const submitRecoveryRef = useRef<() => Promise<void>>(async () => undefined);
  const feedbackRef = useRef<HTMLElement | null>(null);
  const lessonPassedBeforeSessionRef = useRef<boolean | null>(null);

  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : null;
  const projection = authority.projection;
  const progress = authority.authoritativeProgress;
  const ownerGeneration = authority.ownerGeneration;
  const resetEpoch = authority.resetEpoch;
  const exactAuthority = Boolean(
    accountKey
    && projection
    && progress
    && ownerGeneration
    && resetEpoch !== null
    && ownerGeneration.ownerKey === accountKey
    && projection.resetEpoch === resetEpoch
    && progress.resetEpoch === resetEpoch,
  );

  const lessonProgress = lesson && progress
    ? progress.lessons.find((entry) => entry.lessonId === lesson.id) ?? null
    : null;
  const lessonUnlocked = Boolean(
    lessonProgress
    && lessonProgress.lessonVersion === currentLessonVersion(lesson!)
    && lessonProgress.unlocked,
  );
  const guide = useMemo(
    () => getLessonTeachingGuide(
      lesson?.id ?? "",
      publishedLesson?.guide ?? getLessonGuide(lesson?.id ?? ""),
    ),
    [lesson?.id, publishedLesson],
  );
  const lessonWords = useMemo(
    () => lesson?.wordIds
      .map((id) => WORD_BY_ID.get(id))
      .filter((word): word is VocabularyItem => Boolean(word)) ?? [],
    [lesson],
  );

  const refreshRecords = useCallback(() => {
    setRecordsVersion((current) => current + 1);
  }, []);

  const retryPendingTransition = useCallback(async () => {
    if (transitionRetrying) return;
    setTransitionRetrying(true);
    try {
      await actions.syncNow();
    } catch {
      setTransitionDelayed(true);
    } finally {
      refreshRecords();
      refreshProjection();
      setTransitionRetrying(false);
    }
  }, [actions, refreshProjection, refreshRecords, transitionRetrying]);

  useEffect(() => {
    const pending = phase === "opening"
      || phase === "submitting"
      || phase === "abandoning";
    if (!pending) {
      setTransitionDelayed(false);
      setTransitionRetrying(false);
      setTransitionActiveStep(0);
      return;
    }

    setTransitionDelayed(false);
    const automaticRetry = window.setTimeout(() => {
      void actions.syncNow().catch(() => undefined).finally(() => {
        refreshRecords();
        refreshProjection();
      });
    }, 3_000);
    const slowConnection = window.setTimeout(() => {
      setTransitionDelayed(true);
      if (phase === "submitting") {
        void submitRecoveryRef.current();
      }
    }, 8_000);
    return () => {
      window.clearTimeout(automaticRetry);
      window.clearTimeout(slowConnection);
    };
  }, [actions, phase, refreshProjection, refreshRecords]);

  useEffect(() => {
    window.addEventListener(
      LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
      refreshRecords,
    );
    window.addEventListener("online", refreshRecords);
    return () => {
      window.removeEventListener(
        LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
        refreshRecords,
      );
      window.removeEventListener("online", refreshRecords);
    };
  }, [refreshRecords]);

  useEffect(() => {
    let active = true;
    if (!exactAuthority || !ownerGeneration) {
      setRecords(null);
      return () => {
        active = false;
      };
    }
    void listLearningCommandRecords(ownerGeneration)
      .then((next) => {
        if (active) setRecords(next);
      })
      .catch(() => {
        if (!active) return;
        setError("Không thể đọc nhật ký lệnh học thuộc đúng tài khoản.");
        setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [exactAuthority, ownerGeneration, recordsVersion, sync.lastSyncedAt]);

  useEffect(() => {
    let active = true;
    if (!lesson || !projection || !progress || !records || !lessonUnlocked) {
      return () => {
        active = false;
      };
    }

    const stopSafely = (message: string) => {
      setRuntime(null);
      setCommandIds(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setError(message);
      setPhase("error");
    };

    const applyTerminal = (
      dependency: QueuedLessonSessionDependency,
      binding: LessonSessionAuthorityBindingV1,
    ) => {
      const terminal = terminalForSession(records, dependency);
      if (!terminal) return false;
      if (terminal.status === "quarantined") {
        stopSafely("Phiên học này không thể tiếp tục. Hãy quay lại Thiên Lộ và mở lại bài.");
        return true;
      }
      if (terminal.status === "pending") {
        if (terminal.kind === "lesson-session-submit") {
          setTransitionActiveStep(2);
          setTransitionDelayed(Boolean(terminal.nextAttemptAt));
          setPhase("submitting");
        } else {
          setPhase("abandoning");
        }
        return true;
      }
      if (terminal.kind === "lesson-session-submit") {
        const receipt = terminal.receipt;
        if (!receipt) {
          stopSafely("Chưa thể đọc kết quả của phiên học này.");
          return true;
        }
        if (!submissionReceiptMatchesSessionBinding(
          receipt,
          binding,
          terminal.commandId,
        )) {
          stopSafely("Kết quả không còn khớp với phiên học hiện tại.");
          return true;
        }
        if (terminal.commandId !== dismissedTerminalId) {
          setResult(receipt);
          setPhase("result");
          emitSystemSignal({
            type: receipt.passed ? "lesson.completed" : "learning.retry",
            sourceId: `lesson:${binding.lessonId}:result`,
            eventId: `${terminal.commandId}:system-result`,
            message: receipt.passed ? "Nhiệm vụ hoàn thành. Tiến độ đã được ghi nhận." : undefined,
          });
          if (receipt.passed) emitSystemSignal({
            type: "path.unlocked",
            sourceId: `lesson:${binding.lessonId}:unlock`,
            eventId: `${terminal.commandId}:system-unlock`,
          });
        } else {
          setResult(null);
          setPhase("briefing");
        }
        return true;
      }
      if (!abandonmentReceiptMatchesSessionBinding(
        terminal.receipt,
        binding,
        terminal.commandId,
      )) {
        stopSafely("Chưa thể xác nhận việc dừng phiên học này.");
        return true;
      }
      setResult(null);
      setRuntime(null);
      setCommandIds(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setPhase("briefing");
      return true;
    };

    const materializeSession = (
      dependency: QueuedLessonSessionDependency,
      binding: LessonSessionAuthorityBindingV1,
    ) => {
      setPhase("loading");
      const materializedPromise = dependency.kind === "lesson-session-open"
        ? materializeNormalizedLessonRuntime({
            lesson,
            script: state.profile.script,
            receipt: dependency.receipt,
            authoritativeProgress: progress,
            expectedOpenCommandId: dependency.command.idempotencyKey,
          })
        : materializeNormalizedLessonRuntimeFromAuthorityBinding({
            lesson,
            script: state.profile.script,
            binding: dependency.binding,
            authoritativeProgress: progress,
            commandSeed: dependency.command.adoptionKey,
          });
      void materializedPromise.then(async (materialized) => {
        if (!active) return;
        if (!materialized.ok) {
          stopSafely("Phiên học không còn phù hợp với nội dung hiện tại.");
          return;
        }
        if (!runtimeMatchesSessionBinding(materialized.runtime, binding)) {
          stopSafely("Nội dung hiển thị không còn khớp với phiên học hiện tại.");
          return;
        }
        const ids = await deriveStableNormalizedLessonCommandIds(
          materialized.runtime.commandSeed,
          materialized.runtime.activities.length,
        );
        if (!active) return;
        if (
          ids.sessionAlias !== dependency.sessionAlias
          || ids.commandSeed !== dependency.commandId
        ) {
          stopSafely("Tiến độ trên máy không còn khớp với phiên học hiện tại.");
          return;
        }
        const projected = projectedAttemptsForSession(dependency);
        const projectedActivityIds = new Set(
          projected.map((attempt) => attempt.activityId),
        );
        const firstUnanswered = ids.attemptCommandIds.findIndex(
          (commandId, position) =>
            !projectedActivityIds.has(
              materialized.runtime.activities[position].activityId,
            )
            && !records.some((record) =>
              record.kind === "objective-attempt"
              && record.commandId === commandId
              && record.status === "acknowledged"
              && lessonAttemptReceiptMatchesSessionBinding(
                record.receipt,
                binding,
                commandId,
                position,
              )
            ),
        );
        setRuntime(materialized.runtime);
        setCommandIds(ids);
        setSessionBinding(binding);
        setProjectedAttempts(projected);
        setIndex(firstUnanswered < 0
          ? materialized.runtime.activities.length - 1
          : firstUnanswered);
        setSelected(null);
        setAttemptStartedAt(Date.now());
        setError(null);
        setPhase("exercise");
      }).catch(() => {
        if (!active) return;
        stopSafely("Chưa thể mở phần luyện tập của bài này.");
      });
    };

    const resumeSession = (
      dependency: QueuedLessonSessionDependency,
      binding: LessonSessionAuthorityBindingV1,
    ) => {
      if (applyTerminal(dependency, binding)) return;
      if (
        runtime
        && commandIds
        && runtime.commandSeed === dependency.commandId
        && commandIds.commandSeed === dependency.commandId
        && commandIds.sessionAlias === dependency.sessionAlias
        && runtimeMatchesSessionBinding(runtime, binding)
      ) {
        setProjectedAttempts(projectedAttemptsForSession(dependency));
        setSessionBinding(binding);
        setError(null);
        setPhase("exercise");
        return;
      }
      materializeSession(dependency, binding);
    };

    const activeSessions = projection.activeLessonSessions.filter((session) =>
      session.lessonId === lesson.id
      && session.lessonVersion === currentLessonVersion(lesson)
      && session.enrollmentId === progress.enrollmentId
      && session.contentVersion === progress.contentVersion
    );
    if (activeSessions.length > 1) {
      setError("Có nhiều phiên đang mở cho cùng một bài. Hãy dừng phiên cũ rồi thử lại.");
      setPhase("error");
      return () => {
        active = false;
      };
    }

    const activeSession = activeSessions[0] ?? null;
    if (activeSession) {
      const candidates = records.filter(
        (record): record is QueuedLessonSessionDependency => {
          const binding = record.kind === "lesson-session-open"
            ? record.receipt
            : record.kind === "projected-lesson-session-anchor"
              ? record.binding
              : null;
          return binding?.sessionId === activeSession.sessionId;
        },
      );
      if (candidates.some((candidate) => {
        const binding = authorityBindingForSession(candidate);
        return !binding
          || !activeProjectionMatchesSessionBinding(projection, binding);
      })) {
        stopSafely("Tiến độ trên máy không còn khớp với phiên đang hoạt động.");
        return () => {
          active = false;
        };
      }
      if (candidates.length > 1) {
        stopSafely("Phiên học đang có dữ liệu trùng lặp. Hãy quay lại và mở bài một lần nữa.");
        return () => {
          active = false;
        };
      }
      const dependency = candidates[0] ?? null;
      const binding = dependency
        ? authorityBindingForSession(dependency)
        : null;
      if (!dependency || !binding) {
        const pendingLocalOpen = records.some((record) =>
          record.kind === "lesson-session-open"
          && record.status === "pending"
          && record.resetEpoch === progress.resetEpoch
          && record.command.enrollmentId === progress.enrollmentId
          && record.command.lessonId === lesson.id
        );
        setRuntime(null);
        setCommandIds(null);
        setSessionBinding(null);
        setProjectedAttempts([]);
        setPhase(pendingLocalOpen ? "opening" : "remote-session");
        return () => {
          active = false;
        };
      }
      resumeSession(dependency, binding);
      return () => {
        active = false;
      };
    }

    const dependencies = records.filter(
      (record): record is QueuedLessonSessionDependency => {
        if (record.resetEpoch !== progress.resetEpoch) return false;
        if (record.kind === "lesson-session-open") {
          return record.command.enrollmentId === progress.enrollmentId
            && record.command.lessonId === lesson.id;
        }
        return record.kind === "projected-lesson-session-anchor"
          && record.binding.enrollmentId === progress.enrollmentId
          && record.binding.lessonId === lesson.id;
      },
    );
    const latestDependency = newestRecord(dependencies);
    if (!latestDependency) {
      setRuntime(null);
      setCommandIds(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setPhase("briefing");
      return () => {
        active = false;
      };
    }
    if (
      latestDependency.kind === "lesson-session-open"
      && latestDependency.status === "pending"
    ) {
      setRuntime(null);
      setCommandIds(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setPhase("opening");
      return () => {
        active = false;
      };
    }
    if (latestDependency.status === "quarantined") {
      stopSafely("Chưa thể mở lại phiên học này. Hãy quay lại Thiên Lộ và thử lại.");
      return () => {
        active = false;
      };
    }

    const binding = authorityBindingForSession(latestDependency);
    if (!binding) {
      stopSafely("Thông tin phiên học bị thiếu hoặc không còn hợp lệ.");
      return () => {
        active = false;
      };
    }
    if (applyTerminal(latestDependency, binding)) {
      return () => {
        active = false;
      };
    }
    if (authority.source === "cache" || authority.phase === "retryable") {
      resumeSession(latestDependency, binding);
      return () => {
        active = false;
      };
    }
    stopSafely(
      "Phiên học đã thay đổi trên thiết bị khác. Hãy tải lại trước khi tiếp tục.",
    );
    return () => {
      active = false;
    };
  }, [
    refreshProjection,
    commandIds,
    dismissedTerminalId,
    lesson,
    lessonUnlocked,
    progress,
    projection,
    records,
    runtime,
    state.profile.script,
    authority.phase,
    authority.source,
  ]);

  useEffect(() => {
    if (
      !runtime
      || !sessionBinding
      || !commandIds
      || !records
      || phase !== "exercise"
    ) return;
    const commandId = commandIds.attemptCommandIds[index];
    const activity = runtime.activities[index];
    if (!commandId || !activity) {
      setError("Vị trí activity không còn khớp form server.");
      setPhase("error");
      return;
    }
    const attempt = records.find((record) =>
      record.kind === "objective-attempt" && record.commandId === commandId
    );
    const projectedAttempt = projectedAttempts.find((candidate) =>
      candidate.activityId === activity.activityId
    );
    if (attempt && projectedAttempt) {
      setError("Một activity đang bị ghi nhận đồng thời bởi projection và outbox cục bộ.");
      setPhase("error");
      return;
    }
    if (projectedAttempt) {
      setOutcome(projectedAttempt.outcome);
      return;
    }
    if (!attempt || attempt.kind !== "objective-attempt") {
      setOutcome("idle");
      return;
    }
    if (attempt.status === "pending") {
      setOutcome("pending");
      return;
    }
    if (
      attempt.status === "quarantined"
      || !lessonAttemptReceiptMatchesSessionBinding(
        attempt.receipt,
        sessionBinding,
        commandId,
        index,
      )
    ) {
      setError(attempt.quarantineReason
        ?? "Receipt câu trả lời thiếu hoặc không khớp form server.");
      setPhase("error");
      return;
    }
    setOutcome(attempt.receipt!.outcome);
  }, [
    commandIds,
    index,
    phase,
    projectedAttempts,
    records,
    runtime,
    sessionBinding,
  ]);

  useEffect(() => {
    setSelected(null);
    setSelectedUsedHint(false);
    setAttemptStartedAt(Date.now());
    advanceLockRef.current = false;
  }, [index, runtime?.sessionId]);

  useEffect(() => {
    if (outcome === "correct" || outcome === "incorrect") {
      feedbackRef.current?.focus();
      const activity = runtime?.activities[index];
      if (activity) emitSystemSignal({
        type: outcome === "correct" ? "learning.correct" : "learning.retry",
        sourceId: `lesson:${runtime.lessonId}:activity:${activity.activityId}`,
        eventId: `${runtime.sessionId}:feedback:${activity.activityId}`,
      });
    }
  }, [index, outcome, runtime]);

  const exactEnvironment = useCallback(async () => {
    if (
      !accountKey
      || !ownerGeneration
      || resetEpoch === null
      || !exactAuthority
    ) return null;
    return readExactNormalizedLessonEnvironment({
      accountKey,
      expectedOwnerGeneration: ownerGeneration,
      expectedResetEpoch: resetEpoch,
    });
  }, [accountKey, exactAuthority, ownerGeneration, resetEpoch]);

  const continueRemoteSession = async () => {
    if (
      !lesson
      || !projection
      || !ownerGeneration
      || resetEpoch === null
      || busy
    ) return;
    const remoteSessions = projection.activeLessonSessions.filter((session) =>
      session.lessonId === lesson.id
      && session.lessonVersion === currentLessonVersion(lesson)
      && session.enrollmentId === progress?.enrollmentId
      && session.contentVersion === progress?.contentVersion
    );
    if (remoteSessions.length !== 1) {
      setError("Projection không còn đúng một phiên có thể tiếp tục.");
      setPhase("error");
      return;
    }
    setBusy(true);
    setError(null);
    setPhase("loading");
    try {
      const environment = await exactEnvironment();
      if (!environment) throw new Error("Owner scope đã thay đổi.");
      await adoptActiveLessonSessionFromCachedProjection({
        ownerGeneration,
        resetEpoch,
        sessionId: remoteSessions[0].sessionId,
        installationId: environment.installationId,
        deviceId: environment.deviceId,
      });
      refreshRecords();
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : "Không thể tiếp tục phiên từ projection đã xác minh.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

  const startSession = async () => {
    if (!lesson || !progress || !lessonUnlocked || busy) return;
    lessonPassedBeforeSessionRef.current = lessonProgress?.passed ?? null;
    setBusy(true);
    setError(null);
    setResult(null);
    setRewardClaimedLocally(false);
    setRewardError(null);
    setPhase("opening");
    try {
      const environment = await exactEnvironment();
      if (!environment) throw new Error("Owner scope đã thay đổi.");
      const input = await buildNormalizedLessonOpenQueueInput({
        lesson,
        authoritativeProgress: progress,
        environment,
        openCommandId: makeIdempotencyKey(
          `normalized-lesson-open:${lesson.id}`,
        ),
        enqueuedAt: new Date().toISOString(),
      });
      await enqueueLessonSessionCommand(input);
      emitSystemSignal({ type: "lesson.started", sourceId: `lesson:${lesson.id}` });
      refreshRecords();
      refreshProjection();
      void actions.syncNow().catch(() => undefined).finally(() => {
        refreshRecords();
        refreshProjection();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể mở phiên.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    if (!runtime || !selected?.trim() || outcome !== "idle" || busy) return;
    setBusy(true);
    setError(null);
    setOutcome("pending");
    try {
      const environment = await exactEnvironment();
      if (!environment) throw new Error("Owner scope đã thay đổi.");
      const input = await buildNormalizedLessonAttemptQueueInput(
        runtime,
        environment,
        {
          position: index,
          selectedAnswer: selected,
          usedHint: selectedUsedHint,
          durationMs: Math.min(600_000, Math.max(0, Date.now() - attemptStartedAt)),
          occurredAt: new Date().toISOString(),
        },
      );
      await enqueueObjectiveAttemptCommand(input);
      refreshRecords();
      refreshProjection();
      void actions.syncNow().catch(() => undefined).finally(() => {
        refreshRecords();
        refreshProjection();
      });
    } catch (cause) {
      setOutcome("idle");
      setError(cause instanceof Error
        ? cause.message
        : "Không thể ghi câu trả lời.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

  const submitSession = async (recoveryAttempt = false) => {
    if (
      !runtime
      || !sessionBinding
      || !commandIds
      || !records
      || (busy && !recoveryAttempt)
    ) return;
    const projectedActivityIds = new Set(
      projectedAttempts.map((attempt) => attempt.activityId),
    );
    const localAttemptPositions = runtime.activities
      .map((_activity, position) => position)
      .filter((position) =>
        !projectedActivityIds.has(runtime.activities[position].activityId)
      );
    const allAcknowledged = localAttemptPositions.every((position) => {
      const commandId = commandIds.attemptCommandIds[position];
      return records.some((record) =>
        record.kind === "objective-attempt"
        && record.commandId === commandId
        && record.status === "acknowledged"
        && lessonAttemptReceiptMatchesSessionBinding(
          record.receipt,
          sessionBinding,
          commandId,
          position,
        )
      );
    });
    if (!allAcknowledged) {
      setError("Hãy chờ máy chủ xác nhận đủ mọi câu trước khi nộp phiên.");
      setPhase("error");
      return;
    }
    setBusy(true);
    setError(null);
    setTransitionDelayed(false);
    if (!recoveryAttempt) setTransitionActiveStep(0);
    setPhase("submitting");
    try {
      await withLessonTransitionDeadline((async () => {
        const environment = await exactEnvironment();
        if (!environment) throw new Error("Owner scope đã thay đổi.");
        const input = await buildNormalizedLessonSubmissionQueueInput(
          runtime,
          environment,
          new Date().toISOString(),
          localAttemptPositions,
        );
        setTransitionActiveStep(1);
        // The command key is stable. Re-enqueuing after a timeout returns the
        // existing record instead of creating a second completion/reward.
        await enqueueLessonSessionSubmissionCommand(input);
        setTransitionActiveStep(2);
        refreshRecords();
        refreshProjection();
        void actions.syncNow().catch(() => undefined).finally(() => {
          refreshRecords();
          refreshProjection();
        });
      })());
    } catch (cause) {
      if (cause instanceof LessonTransitionDeadlineError) {
        setTransitionDelayed(true);
        return;
      }
      setError(cause instanceof Error ? cause.message : "Không thể nộp phiên.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

  const retrySubmissionTransition = async () => {
    if (transitionRetrying) return;
    setTransitionRetrying(true);
    try {
      const pendingSubmission = commandIds && records?.find((record) =>
        record.kind === "lesson-session-submit"
        && record.commandId === commandIds.submitCommandId
        && record.status === "pending"
      );
      if (pendingSubmission && ownerGeneration) {
        await releaseLearningCommandRetry(
          pendingSubmission.recordKey,
          ownerGeneration,
        );
        setTransitionActiveStep(2);
        setTransitionDelayed(false);
      } else {
        await submitSession(true);
      }
      await actions.syncNow();
    } catch {
      setTransitionDelayed(true);
    } finally {
      refreshRecords();
      refreshProjection();
      setTransitionRetrying(false);
    }
  };
  submitRecoveryRef.current = retrySubmissionTransition;

  const abandonSession = async () => {
    if (!runtime || busy) return;
    setAbandonModalOpen(false);
    setBusy(true);
    setError(null);
    setPhase("abandoning");
    try {
      const environment = await exactEnvironment();
      if (!environment) throw new Error("Owner scope đã thay đổi.");
      const input = await buildNormalizedLessonAbandonQueueInput(
        runtime,
        environment,
        new Date().toISOString(),
      );
      await enqueueLessonSessionAbandonmentCommand(input);
      refreshRecords();
      refreshProjection();
      void actions.syncNow().catch(() => undefined).finally(() => {
        refreshRecords();
        refreshProjection();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể hủy phiên.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

  const claimLessonReward = async () => {
    if (!lesson || resetEpoch === null || claimingReward) return;
    setClaimingReward(true);
    setRewardError(null);
    const receipt = await claimLessonInteractionXp(lesson.id, resetEpoch)
      .catch(() => null);
    setClaimingReward(false);
    if (!receipt) {
      setRewardError("Chưa thể mở rương lúc này. Hãy thử lại sau.");
      return;
    }
    setRewardClaimedLocally(true);
  };

  const confirmAbandonSession = () => {
    if (!busy) setAbandonModalOpen(true);
  };

  if (!lesson) {
    return (
      <div className="lesson-state-screen">
        {unavailableLesson ? <LockKeyhole size={44} /> : <CircleX size={44} />}
        <h1>{unavailableLesson
          ? "Nội dung này chưa được phát hành"
          : "Không tìm thấy thử luyện"}</h1>
            <p>Bài này đang được chuẩn bị. Tiến độ trên máy của bạn vẫn được giữ nguyên.</p>
        <Link className="primary-button" to="/path">
          <ArrowLeft size={17} /> Trở về Thiên Lộ
        </Link>
      </div>
    );
  }

  if (!exactAuthority) {
    return (
      <NormalizedLearningAuthorityGate
        phase={authority.phase}
        reason={authority.reason}
        refresh={refreshProjection}
      />
    );
  }

  if (!lessonUnlocked) {
    return (
      <div className="lesson-state-screen locked-screen">
        <LockKeyhole size={44} />
          <span>CẢNH GIỚI CHƯA KHAI MỞ</span>
          <h1>Cảnh giới này chưa mở</h1>
          <p>Hãy hoàn thành bài tiên quyết trên Thiên Lộ trước khi tiếp tục.</p>
        <Link className="primary-button" to="/path">
          <ArrowLeft size={17} /> Trở về Thiên Lộ
        </Link>
      </div>
    );
  }

  if (phase === "loading" || records === null) {
    return (
      <LessonQuestTransition
        kind="restoring"
        lessonTitle={presentedLesson?.title ?? lesson.title}
        itemCount={runtime?.activities.length}
      />
    );
  }

  if (phase === "opening" || phase === "submitting" || phase === "abandoning") {
    return (
      <LessonQuestTransition
        kind={phase}
        lessonTitle={presentedLesson?.title ?? lesson.title}
        itemCount={runtime?.activities.length}
        activeStep={phase === "submitting" ? transitionActiveStep : undefined}
        delayed={transitionDelayed}
        retrying={transitionRetrying}
        onRetry={() => void (
          phase === "submitting"
            ? retrySubmissionTransition()
            : retryPendingTransition()
        )}
      />
    );
  }

  if (phase === "remote-session") {
    return (
      <div className="lesson-state-screen">
        <AlertTriangle size={44} />
          <h1>Phiên đang mở trên thiết bị khác</h1>
          <p>Hãy tiếp tục trên thiết bị đã mở phiên, hoặc dừng phiên đó trước khi học tại đây. Các câu đã lưu sẽ không bị gửi lặp.</p>
        <button
          className="primary-button"
          disabled={busy}
          type="button"
          onClick={() => void continueRemoteSession()}
        >
          <RefreshCw size={17} /> Tiếp tục an toàn trên thiết bị này
        </button>
        <Link className="secondary-button" to="/path">Trở về Thiên Lộ</Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="lesson-state-screen" role="alert">
        <CircleX size={44} />
        <h1>Phiên học đã dừng an toàn</h1>
        <p>Hệ thống chưa thể tiếp tục phiên này. Tiến độ đã ghi nhận vẫn được giữ an toàn.</p>
        <button className="primary-button" type="button" onClick={() => {
          setError(null);
          refreshRecords();
          refreshProjection();
          setPhase("loading");
        }}>
          <RefreshCw size={17} /> Thử lại
        </button>
        <Link className="secondary-button" to="/path">Trở về Thiên Lộ</Link>
      </div>
    );
  }

  if (phase === "result" && result) {
    const rawCorrectCount = Math.round(
      (result.rawScore / 100) * result.evidenceCount,
    );
    const requiredPassed = result.requiredEvidenceCount === 0
      || result.requiredCorrectCount / result.requiredEvidenceCount >= 0.7;
    const projectedReward = interactionXp.lessonRewards?.find(
      (reward) => reward.lessonId === lesson.id,
    );
    const rewardState = !result.passed
      ? "unavailable" as const
      : rewardClaimedLocally || projectedReward?.status === "claimed"
        ? "claimed" as const
        : claimingReward
          ? "claiming" as const
          : projectedReward?.status === "pending"
            || lessonPassedBeforeSessionRef.current === false
            ? "claimable" as const
            : "claimed" as const;
    return (
      <LessonQuestResult
        lessonId={lesson.id}
        lessonTitle={presentedLesson?.title ?? lesson.title}
        chineseTitle={presentedLesson?.chineseTitle ?? lesson.chineseTitle}
        passed={result.passed}
        correctCount={rawCorrectCount}
        totalCount={result.evidenceCount}
        gateScore={result.gateScore}
        requiredPassed={requiredPassed}
        rewardXp={lesson.xp}
        rewardState={rewardState}
        rewardError={rewardError}
        onClaimReward={() => void claimLessonReward()}
        onRetry={() => {
            setDismissedTerminalId(result.idempotencyKey);
            setResult(null);
            lessonPassedBeforeSessionRef.current = null;
            setRewardClaimedLocally(false);
            setRewardError(null);
            setPhase("briefing");
        }}
        onNavigate={refreshProjection}
        continueDestination={currentStep?.stage === "learn"
          ? undefined
          : currentStep?.to}
        continueDestinationLabel={currentStep?.stage === "learn"
          ? undefined
          : currentStep ? `Tiếp tục bước ${currentStep.stageLabel}` : undefined}
      />
    );
  }

  if (phase === "briefing") {
    return (
      <div className="lesson-briefing-page">
        <div className="lesson-briefing-scroll">
          <section className="briefing-hero">
            <header className="lesson-briefing-masthead">
              <Link className="lesson-briefing-back" to="/path" aria-label="Trở về Thiên Lộ">
                <ArrowLeft size={18} /><span>Thiên Lộ</span>
              </Link>
              <strong>{lesson.minutes} phút</strong>
            </header>
            <div className="briefing-hero-copy">
              <span className="system-kicker"><BrainCircuit size={16} /> MỤC TIÊU BÀI HỌC</span>
              <h1>{presentedLesson?.title ?? lesson.title}</h1>
              <p className="briefing-chinese">{presentedLesson?.chineseTitle ?? lesson.chineseTitle}</p>
              <p>{learnerFacingCopy(presentedLesson?.objective ?? lesson.objective)}</p>
            </div>
          </section>
          <LessonTheoryPanel
            guide={guide}
            lessonId={lesson.id}
            lessonObjective={presentedLesson?.objective ?? lesson.objective}
            preferGuide={Boolean(publishedLesson?.guide)}
            lessonWords={lessonWords}
            script={state.profile.script}
            practiceKinds={runtime?.activities.map((activity) => activity.kind)}
            practiceWordIds={runtime?.activities.map((activity) => activity.wordId)}
            contentOverride={publishedLesson?.richContent}
            enhancement={publishedLessonEnhancement}
            ready={theoryReady || Boolean(runtime)}
            onReadinessChange={setTheoryReady}
            onComplete={() => void startSession()}
            completionLabel={busy ? "Đang mở phiên…" : runtime ? "Tiếp tục Thử Luyện" : "Bắt đầu luyện tập"}
            completionDisabled={busy}
          />
          {publishedLessonStatus === "fallback" && <p className="synthetic-audio-note" role="status">Bản biên soạn mới chưa tải được; bài cốt lõi và tiến độ tài khoản vẫn hoạt động. <button className="secondary-button" type="button" onClick={retryPublishedLesson}>Thử tải lại</button></p>}
          <p className="synthetic-audio-note">
            Âm thanh trong bài là TTS tổng hợp của trình duyệt, chỉ dùng để luyện nghe và nhại; không phải audio bản ngữ hay bằng chứng phát âm.
          </p>
        </div>
      </div>
    );
  }

  const current = runtime?.activities[index];
  if (!runtime || !commandIds || !current) {
    return (
      <div className="lesson-state-screen">
        <CircleX size={44} />
          <h1>Phần luyện tập không còn khả dụng</h1>
        <button className="primary-button" type="button" onClick={refreshRecords}>
          <RefreshCw size={17} /> Kiểm tra lại
        </button>
      </div>
    );
  }
  const currentSpeechText = resolveExerciseSpeechText(
    current,
    current.wordId ? WORD_BY_ID.get(current.wordId) : undefined,
    runtime.script,
  );

  const checked = outcome === "correct" || outcome === "incorrect";
  const isCorrect = outcome === "correct";
  const currentCommandId = commandIds.attemptCommandIds[index];
  const currentUsedHint = selectedUsedHint
    || projectedAttempts.some((attempt) =>
      attempt.activityId === current.activityId && attempt.usedHint
    )
    || Boolean(records?.some((record) =>
      record.kind === "objective-attempt"
      && record.commandId === currentCommandId
      && record.command.response.usedHint
    ));
  const ExerciseIcon = exerciseIcon(current.kind);
  const completion = Math.round(((index + 1) / runtime.activities.length) * 100);

  return (
    <>
      <div className="lesson-live-page">
      <header className="lesson-live-header">
        <Link className="lesson-return-link" to="/path" aria-label="Rời bài và trở về Thiên Lộ; tiến độ đã được tự lưu">
          <ArrowLeft size={18} /><span>Thiên Lộ</span>
        </Link>
        <div
          className="lesson-progress-track"
          role="progressbar"
          aria-label="Tiến độ form bài học"
          aria-valuemin={0}
          aria-valuemax={runtime.activities.length}
          aria-valuenow={index + 1}
        ><i style={{ width: `${completion}%` }} /></div>
        <span>{index + 1} / {runtime.activities.length}</span>
        <button className="lesson-theory-button" type="button" onClick={() => {
          if (outcome === "idle") setSelectedUsedHint(true);
          setReviewingTheory(true);
        }} aria-pressed={reviewingTheory}>
          <BookOpenText size={17} /><span>Lý thuyết</span>
        </button>
        <button
          className="secondary-button lesson-abandon-button"
          disabled={busy}
          type="button"
          onClick={confirmAbandonSession}
          aria-label="Dừng lượt học hiện tại"
        >
          <X size={16} /><span>Dừng lượt</span>
        </button>
      </header>
      <div className="lesson-context">
        <span><ExerciseIcon size={16} /> {current.instruction}</span>
        <strong>{presentedLesson?.title ?? lesson.title} · kỹ năng {current.skill}</strong>
      </div>
      <section className={`exercise-stage ${reviewingTheory ? "is-theory-review" : ""}`}>
        {reviewingTheory ? (
          <LessonTheoryPanel
            compact
            guide={guide}
            lessonId={lesson.id}
            lessonObjective={presentedLesson?.objective ?? lesson.objective}
            preferGuide={Boolean(publishedLesson?.guide)}
            lessonWords={lessonWords}
            script={state.profile.script}
            practiceKinds={runtime.activities.map((activity) => activity.kind)}
            practiceWordIds={runtime.activities.map((activity) => activity.wordId)}
            contentOverride={publishedLesson?.richContent}
            enhancement={publishedLessonEnhancement}
          />
        ) : (
          <>
        <div className={`exercise-prompt kind-${current.kind}`}>
          {current.kind === "listening" ? (
            <button className="sound-orb" type="button" onClick={() => currentSpeechText && speakMandarin(currentSpeechText)} aria-label="Phát âm thanh">
              <Volume2 size={38} /><span aria-hidden="true" />
            </button>
          ) : (
            <>
              <h1>{current.prompt}</h1>
              {current.promptMeta && <p>{current.promptMeta}</p>}
              {currentSpeechText && (
                <button className="listen-inline" type="button" onClick={() => speakMandarin(currentSpeechText)}>
                  <Volume2 size={17} /> Nghe
                </button>
              )}
            </>
          )}
          {current.kind === "listening" && <p>{current.promptMeta}</p>}
          {current.spokenText && (
            <small className="synthetic-audio-note compact">
              TTS tổng hợp · chỉ dùng luyện tập
            </small>
          )}
        </div>
        {current.kind === "recall" ? (
          <div className={`recall-answer ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
            <label htmlFor="normalized-recall-input">Hán tự bạn tự gọi lại</label>
            <HanziPinyinInput
              key={current.activityId}
              inputId="normalized-recall-input"
              value={selected ?? ""}
              disabled={outcome !== "idle" || busy}
              script={state.profile.script}
              onChange={setSelected}
              onAssistanceUsed={() => setSelectedUsedHint(true)}
              onSubmit={() => void submitAnswer()}
            />
            <small>Gõ trực tiếp để được tính vào ngưỡng. Bàn phím pinyin nội bộ là hỗ trợ nhập; câu đúng có hỗ trợ vẫn được lưu nhưng không mở khóa bài.</small>
          </div>
        ) : (
          <div className="answer-grid" role="radiogroup" aria-label={current.instruction}>
            {current.options.map((option, optionIndex) => {
              const chosen = selected === option;
              return (
                <button
                  className={`${chosen ? "selected" : ""} ${checked && chosen ? (isCorrect ? "correct" : "wrong") : ""}`}
                  disabled={outcome !== "idle" || busy}
                  key={option}
                  role="radio"
                  aria-checked={chosen}
                  type="button"
                  onClick={() => setSelected(option)}
                >
                  <span>{String.fromCharCode(65 + optionIndex)}</span>
                  <strong>{option}</strong>
                  {checked && chosen && (isCorrect
                    ? <CircleCheck size={19} />
                    : <CircleX size={19} />)}
                </button>
              );
            })}
          </div>
        )}
          </>
        )}
      </section>
      <footer
        className={`answer-console ${reviewingTheory ? "lesson-theory-console" : checked ? (isCorrect ? "correct" : "wrong") : ""}`}
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
        aria-busy={outcome === "pending"}
      >
        {reviewingTheory ? (
          <>
            <p><BookOpenText size={17} /> Phiên vẫn được giữ; câu hiện tại được ghi là đã dùng trợ giúp.</p>
            <button className="primary-button" type="button" onClick={() => setReviewingTheory(false)}>
              Quay lại câu {index + 1} <ArrowRight size={17} />
            </button>
          </>
        ) : (
          <>
        {outcome === "pending" ? (
              <p><BrainCircuit size={17} /> Đang ghi nhận câu trả lời; lựa chọn tạm thời không thể đổi.</p>
        ) : checked ? (
          <div className="answer-explanation">
            {isCorrect ? <CircleCheck size={23} /> : <Lightbulb size={23} />}
            <div>
              <strong>{isCorrect
                ? currentUsedHint
                  ? "Đúng với hỗ trợ · không tính vào ngưỡng"
                  : "Chính xác"
                : "Chưa chính xác"}</strong>
              <p>{buildLessonAnswerFeedback({
                activity: current,
                selected,
                correct: isCorrect,
              })}</p>
            </div>
          </div>
        ) : (
            <p><Lightbulb size={17} /> Chọn hoặc nhập câu trả lời rồi gửi để kiểm tra.</p>
        )}
        <button
          className="primary-button"
          disabled={busy || outcome === "pending" || (!checked && !selected?.trim())}
          type="button"
          onClick={() => {
            if (!checked) {
              void submitAnswer();
            } else {
              if (advanceLockRef.current) return;
              advanceLockRef.current = true;
              if (index < runtime.activities.length - 1) {
                setOutcome("idle");
                setSelected(null);
                setSelectedUsedHint(false);
                setAttemptStartedAt(Date.now());
                setIndex((currentIndex) => currentIndex + 1);
              } else {
                void submitSession().finally(() => {
                  advanceLockRef.current = false;
                });
              }
            }
          }}
        >
          {checked
            ? index === runtime.activities.length - 1
              ? "Hoàn thành bài"
              : "Câu tiếp theo"
            : "Gửi để chấm"}
          <ArrowRight size={17} />
        </button>
          </>
        )}
      </footer>
      </div>

      <ConfirmModal
        open={abandonModalOpen}
        title="Dừng phiên bài học?"
        description="Các câu đã hoàn thành vẫn được giữ lại. Bạn có thể bắt đầu một lượt mới sau khi dừng."
        eyebrow="DỪNG LUYỆN TẬP"
        cancelLabel="Tiếp tục bài học"
        confirmLabel="Dừng phiên học"
        busy={busy}
        onCancel={() => setAbandonModalOpen(false)}
        onConfirm={() => void abandonSession()}
      />
    </>
  );
}
