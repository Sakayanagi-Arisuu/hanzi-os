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
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
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
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { ConfirmModal } from "../components/SystemFeedback";
import { LESSON_BY_ID, WORD_BY_ID } from "../data/curriculum";
import { getLessonGuide } from "../data/lessonGuides";
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
import {
  abandonmentReceiptMatchesSessionBinding,
  activeProjectionMatchesSessionBinding,
  lessonAttemptReceiptMatchesSessionBinding,
  runtimeMatchesSessionBinding,
  submissionReceiptMatchesSessionBinding,
} from "../learning/normalizedLessonUiAuthority";
import {
  isLessonIdAvailableForStartingLevel,
  isLessonReleased,
} from "../lib/adaptive";
import { makeIdempotencyKey } from "../lib/evidence";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import {
  enqueueLessonSessionAbandonmentCommand,
  enqueueLessonSessionCommand,
  enqueueLessonSessionSubmissionCommand,
  enqueueObjectiveAttemptCommand,
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
  listLearningCommandRecords,
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

const displayCharacter = (
  word: VocabularyItem,
  script: "simplified" | "traditional",
) => script === "traditional" ? word.traditional : word.simplified;

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

export function AuthenticatedLessonPage() {
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
  return <AuthenticatedLessonPageScope key={authorityKey} />;
}

function AuthenticatedLessonPageScope() {
  const { lessonId } = useParams();
  const { state, actions, sync } = useLearning();
  const requestedLesson = lessonId ? LESSON_BY_ID.get(lessonId) : undefined;
  const availableForPath = Boolean(
    requestedLesson
    && isLessonReleased(requestedLesson)
    && isLessonIdAvailableForStartingLevel(
      requestedLesson.id,
      state.profile.startingLevel,
    ),
  );
  const unavailableLesson = Boolean(requestedLesson && !availableForPath);
  const lesson = availableForPath ? requestedLesson : undefined;
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
  const [outcome, setOutcome] = useState<AttemptOutcome>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const advanceLockRef = useRef(false);
  const feedbackRef = useRef<HTMLElement | null>(null);

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
  const guide = useMemo(() => getLessonGuide(lesson?.id ?? ""), [lesson?.id]);
  const lessonWords = useMemo(
    () => lesson?.wordIds
      .map((id) => WORD_BY_ID.get(id))
      .filter((word): word is VocabularyItem => Boolean(word)) ?? [],
    [lesson],
  );

  const refreshRecords = useCallback(() => {
    setRecordsVersion((current) => current + 1);
  }, []);

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
        stopSafely(terminal.quarantineReason
          ?? "Lệnh kết thúc phiên bị máy chủ từ chối vĩnh viễn.");
        return true;
      }
      if (terminal.status === "pending") {
        setPhase(terminal.kind === "lesson-session-submit"
          ? "submitting"
          : "abandoning");
        return true;
      }
      if (terminal.kind === "lesson-session-submit") {
        if (!submissionReceiptMatchesSessionBinding(
          terminal.receipt,
          binding,
          terminal.commandId,
        )) {
          stopSafely("Receipt nộp phiên thiếu hoặc không còn khớp form server.");
          return true;
        }
        if (terminal.commandId !== dismissedTerminalId) {
          setResult(terminal.receipt);
          setPhase("result");
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
        stopSafely("Receipt hủy phiên thiếu hoặc không còn khớp form server.");
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
          stopSafely(`Phiên server không thể dựng an toàn (${materialized.code}).`);
          return;
        }
        if (!runtimeMatchesSessionBinding(materialized.runtime, binding)) {
          stopSafely("Runtime trình bày không còn khớp binding của phiên server.");
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
          stopSafely("Dependency cục bộ không còn khớp định danh phiên server.");
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
        stopSafely("Không thể kiểm chứng form bài học do máy chủ đóng băng.");
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
      setError("Máy chủ trả về nhiều phiên đang mở cho cùng một bài.");
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
        stopSafely("Binding cục bộ không còn khớp phiên đang hoạt động trong projection.");
        return () => {
          active = false;
        };
      }
      if (candidates.length > 1) {
        stopSafely("Một phiên server đang bị gắn với nhiều dependency cục bộ.");
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
      stopSafely(latestDependency.quarantineReason
        ?? "Yêu cầu mở phiên bị máy chủ từ chối vĩnh viễn.");
      return () => {
        active = false;
      };
    }

    const binding = authorityBindingForSession(latestDependency);
    if (!binding) {
      stopSafely("Receipt mở phiên đã xác nhận bị thiếu hoặc hỏng.");
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
      "Receipt cục bộ không còn xuất hiện trong projection mạng; hãy tải lại authority trước khi tiếp tục.",
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
    setAttemptStartedAt(Date.now());
    advanceLockRef.current = false;
  }, [index, runtime?.sessionId]);

  useEffect(() => {
    if (outcome === "correct" || outcome === "incorrect") {
      feedbackRef.current?.focus();
    }
  }, [outcome]);

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
    setBusy(true);
    setError(null);
    setResult(null);
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
          usedHint: false,
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

  const submitSession = async () => {
    if (!runtime || !sessionBinding || !commandIds || !records || busy) return;
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
    setPhase("submitting");
    try {
      const environment = await exactEnvironment();
      if (!environment) throw new Error("Owner scope đã thay đổi.");
      const input = await buildNormalizedLessonSubmissionQueueInput(
        runtime,
        environment,
        new Date().toISOString(),
        localAttemptPositions,
      );
      await enqueueLessonSessionSubmissionCommand(input);
      refreshRecords();
      refreshProjection();
      void actions.syncNow().catch(() => undefined).finally(() => {
        refreshRecords();
        refreshProjection();
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể nộp phiên.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

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
        <p>Dữ liệu local không được dùng để mở một bài chưa phát hành.</p>
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
        <span>ACCESS DENIED · SERVER PREREQUISITE REQUIRED</span>
        <h1>Cảnh giới này chưa mở</h1>
        <p>Chỉ session đã được máy chủ chấm và xác nhận đạt mới mở prerequisite.</p>
        <Link className="primary-button" to="/path">
          <ArrowLeft size={17} /> Trở về Thiên Lộ
        </Link>
      </div>
    );
  }

  if (phase === "loading" || records === null) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <BrainCircuit size={44} />
        <h1>Đang kiểm chứng phiên học</h1>
        <p>Hệ thống đang đối chiếu form server với owner và reset epoch hiện tại.</p>
      </div>
    );
  }

  if (phase === "opening" || phase === "submitting" || phase === "abandoning") {
    const copy = phase === "opening"
      ? ["Đang mở phiên có thẩm quyền", "Form và thứ tự câu hỏi phải do máy chủ đóng băng trước khi hiển thị."]
      : phase === "submitting"
        ? ["Đang nộp bằng chứng", "Máy chủ đang kiểm tra đủ attempt, activity version và form hash."]
        : ["Đang hủy phiên", "Phiên chỉ biến mất sau khi máy chủ xác nhận lệnh hủy."];
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <BrainCircuit size={44} />
        <h1>{copy[0]}</h1>
        <p>{copy[1]}</p>
        <Link className="secondary-button" to="/path">Rời trang và đồng bộ sau</Link>
      </div>
    );
  }

  if (phase === "remote-session") {
    return (
      <div className="lesson-state-screen">
        <AlertTriangle size={44} />
        <h1>Phiên đang mở trên thiết bị khác</h1>
        <p>Thiết bị này có thể gắn một dependency cục bộ trực tiếp với form thật trong projection. Các câu máy chủ đã ghi nhận sẽ không được gửi lại.</p>
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
        <p>{error ?? "Một ràng buộc authority không còn khớp."}</p>
        <button className="primary-button" type="button" onClick={() => {
          setError(null);
          refreshRecords();
          refreshProjection();
          setPhase("loading");
        }}>
          <RefreshCw size={17} /> Kiểm tra lại authority
        </button>
        <Link className="secondary-button" to="/path">Trở về Thiên Lộ</Link>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="lesson-result-screen">
        <div className={`result-sigil ${result.passed ? "passed" : "retry"}`}>
          {result.passed ? <CircleCheck size={38} /> : <RotateCcw size={38} />}
          <span />
        </div>
        <span className="system-kicker">SERVER-OBJECTIVE · RECEIPT VERIFIED</span>
        <h1>{result.passed
          ? "Cảnh giới đã khai mở"
          : "Phiên chưa vượt cổng mastery"}</h1>
        <p>{result.passed
          ? "Máy chủ đã tái chấm đủ form và xác nhận prerequisite cho nút kế tiếp."
          : "Kết quả được giữ làm bằng chứng mô tả; bài tiếp theo chưa được mở."}</p>
        <div className="result-metrics">
          <div><small>Điểm thô server</small><strong>{result.rawScore}%</strong></div>
          <div><small>Điểm mở nút</small><strong>{result.gateScore}%</strong></div>
          <div><small>Bằng chứng</small><strong>{result.evidenceCount}</strong></div>
        </div>
        <div className="mastery-threshold">
          <span style={{ width: `${result.gateScore}%` }} />
          <i style={{ left: "70%" }}>70% · KHAI MỞ</i>
        </div>
        <div className="result-actions">
          <button className="secondary-button" type="button" onClick={() => {
            setDismissedTerminalId(result.idempotencyKey);
            setResult(null);
            setPhase("briefing");
          }}>
            <RotateCcw size={17} /> Mở phiên mới
          </button>
          <Link className="primary-button" to="/path" onClick={refreshProjection}>
            Tiếp tục Thiên Lộ <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "briefing") {
    return (
      <div className="lesson-briefing-page">
        <header className="briefing-topbar">
          <Link className="icon-button" to="/path" aria-label="Trở về Thiên Lộ">
            <ArrowLeft size={20} />
          </Link>
          <span>SERVER FORM · 01/02</span>
          <strong>{lesson.minutes} phút · XP chỉ là tương tác</strong>
        </header>
        <section className="briefing-hero">
          <div>
            <span className="system-kicker"><BrainCircuit size={16} /> LĨNH HỘI TRƯỚC · TRUY HỒI SAU</span>
            <h1>{lesson.title}</h1>
            <p className="briefing-chinese">{lesson.chineseTitle}</p>
            <p>{lesson.objective}</p>
          </div>
          <div className="mastery-gate">
            <Target size={26} />
            <span>Ngưỡng khai mở</span>
            <strong>70%</strong>
            <small>Chỉ receipt server đủ form mới được dùng để mở nút.</small>
          </div>
        </section>
        <div className="briefing-grid">
          <section className="briefing-concept">
            <header><span>01 · CỐT LÕI</span><BrainCircuit size={20} /></header>
            <h2>{guide.concept}</h2>
            <p>{guide.rule}</p>
            <div className="guide-examples">
              {guide.examples.map((example) => (
                <button key={example.chinese} type="button" onClick={() => speakMandarin(example.chinese)}>
                  <Volume2 size={17} />
                  <span><strong>{example.chinese}</strong><small>{example.pinyin}</small></span>
                  <em>{example.meaning}</em>
                </button>
              ))}
            </div>
          </section>
          <aside className="briefing-intel">
            <div className="pitfall-panel">
              <span><AlertTriangle size={17} /> ĐIỂM MÙ THƯỜNG GẶP</span>
              <p>{guide.pitfall}</p>
            </div>
            <div className="checkpoint-panel">
              <span><Target size={17} /> TỰ KIỂM</span>
              <p>{guide.checkpoint}</p>
            </div>
          </aside>
        </div>
        <section className="briefing-lexicon">
          <header><span>02 · TÍN HIỆU MỤC TIÊU</span><small>{lessonWords.length} mục</small></header>
          <div>
            {lessonWords.map((word) => {
              const character = displayCharacter(word, state.profile.script);
              return (
                <button key={word.id} type="button" onClick={() => speakMandarin(character)}>
                  <strong>{character}</strong><span>{word.pinyin}</span>
                  <small>{word.meaning}</small><Volume2 size={15} />
                </button>
              );
            })}
          </div>
        </section>
        <footer className="briefing-actions">
          <p><Lightbulb size={17} /> Form chỉ xuất hiện sau khi server xác nhận enrollment và prerequisite.</p>
          <button className="primary-button" disabled={busy} type="button" onClick={() => void startSession()}>
            Mở phiên server <Play size={17} />
          </button>
        </footer>
      </div>
    );
  }

  const current = runtime?.activities[index];
  if (!runtime || !commandIds || !current) {
    return (
      <div className="lesson-state-screen">
        <CircleX size={44} />
        <h1>Form server không còn khả dụng</h1>
        <button className="primary-button" type="button" onClick={refreshRecords}>
          <RefreshCw size={17} /> Kiểm tra lại
        </button>
      </div>
    );
  }

  const checked = outcome === "correct" || outcome === "incorrect";
  const isCorrect = outcome === "correct";
  const ExerciseIcon = exerciseIcon(current.kind);
  const completion = Math.round(((index + 1) / runtime.activities.length) * 100);

  return (
    <>
      <div className="lesson-live-page">
      <header className="lesson-live-header">
        <Link className="icon-button" to="/path" aria-label="Rời trang; giữ phiên để tiếp tục sau">
          <X size={20} />
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
        <button
          className="secondary-button"
          disabled={busy}
          type="button"
          onClick={confirmAbandonSession}
        >
          Hủy phiên
        </button>
      </header>
      <div className="lesson-context">
        <span><ExerciseIcon size={16} /> {current.instruction}</span>
        <strong>{lesson.title} · bằng chứng {current.skill}</strong>
      </div>
      <section className="exercise-stage">
        <div className={`exercise-prompt kind-${current.kind}`}>
          {current.kind === "listening" ? (
            <button className="sound-orb" type="button" onClick={() => current.spokenText && speakMandarin(current.spokenText)} aria-label="Phát âm thanh">
              <Volume2 size={38} /><span aria-hidden="true" />
            </button>
          ) : (
            <>
              <h1>{current.prompt}</h1>
              {current.promptMeta && <p>{current.promptMeta}</p>}
              {current.spokenText && (
                <button className="listen-inline" type="button" onClick={() => speakMandarin(current.spokenText!)}>
                  <Volume2 size={17} /> Nghe
                </button>
              )}
            </>
          )}
          {current.kind === "listening" && <p>{current.promptMeta}</p>}
        </div>
        {current.kind === "recall" ? (
          <div className={`recall-answer ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}>
            <label htmlFor="normalized-recall-input">Hán tự bạn tự gọi lại</label>
            <input
              id="normalized-recall-input"
              value={selected ?? ""}
              disabled={outcome !== "idle" || busy}
              autoComplete="off"
              autoFocus
              inputMode="text"
              placeholder="Nhập chữ Hán..."
              onChange={(event) => setSelected(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && selected?.trim()) {
                  void submitAnswer();
                }
              }}
            />
            <small>Đáp án không được gửi lại trong projection hoặc runtime trình bày.</small>
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
      </section>
      <footer
        className={`answer-console ${checked ? (isCorrect ? "correct" : "wrong") : ""}`}
        ref={feedbackRef}
        tabIndex={-1}
        aria-live="polite"
        aria-busy={outcome === "pending"}
      >
        {outcome === "pending" ? (
          <p><BrainCircuit size={17} /> Đang chờ receipt chấm điểm từ máy chủ; lựa chọn không thể đổi.</p>
        ) : checked ? (
          <div className="answer-explanation">
            {isCorrect ? <CircleCheck size={23} /> : <Lightbulb size={23} />}
            <div>
              <strong>{isCorrect
                ? "Máy chủ xác nhận chính xác"
                : "Máy chủ xác nhận chưa chính xác"}</strong>
              <p>Outcome này gắn với đúng activity version và form hash; answer key không được trả về client.</p>
            </div>
          </div>
        ) : (
          <p><Lightbulb size={17} /> Câu trả lời sẽ được server tái chấm từ activity version đã phát hành.</p>
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
              ? "Nộp phiên cho máy chủ"
              : "Câu tiếp theo"
            : "Gửi để chấm"}
          <ArrowRight size={17} />
        </button>
      </footer>
      </div>

      <ConfirmModal
        open={abandonModalOpen}
        title="Dừng phiên bài học?"
        description="Các câu máy chủ đã chấm vẫn được giữ cho audit. Phiên sẽ được đánh dấu đã dừng và không thể nộp để hoàn tất bài."
        eyebrow="SESSION CONTROL"
        cancelLabel="Tiếp tục bài học"
        confirmLabel="Dừng đúng phiên này"
        busy={busy}
        onCancel={() => setAbandonModalOpen(false)}
        onConfirm={() => void abandonSession()}
      />
    </>
  );
}
