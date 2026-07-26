import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Gauge,
  Headphones,
  RefreshCw,
  ShieldCheck,
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
import { Link } from "react-router";
import {
  buildNormalizedAssessmentAbandonQueueInput,
  buildNormalizedAssessmentAttemptQueueInput,
  buildNormalizedAssessmentOpenQueueInput,
  buildNormalizedAssessmentSubmissionQueueInput,
  deriveStableNormalizedAssessmentCommandIds,
  type StableNormalizedAssessmentCommandIds,
} from "../assessment/normalizedAssessmentCommands";
import {
  materializeNormalizedAssessmentRuntime,
  materializeNormalizedAssessmentRuntimeFromAuthorityBinding,
  type NormalizedAssessmentRuntimeV1,
} from "../assessment/normalizedAssessmentRuntime";
import {
  assessmentAbandonmentReceiptMatchesSessionBinding,
  assessmentRuntimeMatchesSessionBinding,
  assessmentSubmissionReceiptMatchesSessionBinding,
} from "../assessment/normalizedAssessmentUiAuthority";
import {
  deriveExactAssessmentCoverage,
} from "../assessment/normalizedAssessmentUiCoverage";
import type {
  AssessmentSessionAuthorityBindingV1,
} from "../assessment/assessmentSessionProtocol";
import type {
  SubmitAssessmentSessionReceiptV1,
} from "../assessment/assessmentSubmissionProtocol";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { ConfirmModal } from "../components/SystemFeedback";
import {
  CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
  CURRENT_CONTENT_MANIFEST_SHA256,
} from "../content/currentPackage";
import type {
  ActiveAssessmentAttemptProjectionV2,
  ActiveAssessmentSessionProjectionV2,
  LatestAssessmentResultProjectionV2,
} from "../learning/projectionProtocol";
import { makeIdempotencyKey } from "../lib/evidence";
import { speakMandarin } from "../lib/speech";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import {
  enqueueAssessmentAttemptCommand,
  enqueueAssessmentSessionAbandonmentCommand,
  enqueueAssessmentSessionCommand,
  enqueueAssessmentSessionSubmissionCommand,
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
  listLearningCommandRecords,
  type LearningCommandOutboxRecord,
  type QueuedAssessmentAttemptCommand,
  type QueuedAssessmentSessionDependency,
} from "../sync/learningCommandOutbox";
import { readExactNormalizedLessonEnvironment } from "../sync/normalizedLessonEnvironment";
import {
  adoptActiveAssessmentSessionFromCachedProjection,
  projectedAssessmentAnchorRefreshDecision,
} from "../sync/projectedAssessmentSessionAdoption";
import type { Skill } from "../types";

type RuntimePhase =
  | "loading"
  | "briefing"
  | "opening"
  | "exercise"
  | "submitting"
  | "abandoning"
  | "abandoned"
  | "remote-session"
  | "result"
  | "error";

type AttemptState = "idle" | "pending" | "recorded";
type DisplayedAssessmentResult =
  | SubmitAssessmentSessionReceiptV1
  | LatestAssessmentResultProjectionV2;

const SKILL_LABELS: Record<Skill, string> = {
  pronunciation: "Nhận diện âm / Pinyin",
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
};

const newestRecord = <T extends LearningCommandOutboxRecord>(records: T[]) =>
  [...records].sort(
    (left, right) => right.deviceSequence - left.deviceSequence,
  )[0] ?? null;

const authorityBindingForSession = (
  session: QueuedAssessmentSessionDependency,
): AssessmentSessionAuthorityBindingV1 | null =>
  session.kind === "projected-assessment-session-anchor"
    ? session.binding
    : session.receipt;

const projectedAttemptsForSession = (
  session: QueuedAssessmentSessionDependency,
): ActiveAssessmentAttemptProjectionV2[] =>
  session.kind === "projected-assessment-session-anchor"
    ? session.projectedAttempts
    : [];

const terminalForSession = (
  records: LearningCommandOutboxRecord[],
  session: QueuedAssessmentSessionDependency,
) => newestRecord(records.filter((record) =>
  (
    record.kind === "assessment-session-submit"
    || record.kind === "assessment-session-abandon"
  )
  && record.dependencyRecordKey === session.recordKey
));

const projectionMatchesSessionBinding = (
  session: ActiveAssessmentSessionProjectionV2,
  binding: AssessmentSessionAuthorityBindingV1,
) =>
  session.sessionId === binding.sessionId
  && session.enrollmentId === binding.enrollmentId
  && session.resetEpoch === binding.resetEpoch
  && session.contentVersion === binding.contentVersion
  && session.blueprintId === binding.blueprintId
  && session.formVersion === binding.formVersion
  && session.scoringPolicyVersion === binding.scoringPolicyVersion
  && session.expectedItemCount === binding.expectedItemCount
  && session.formHash === binding.formHash
  && session.status === binding.status
  && session.startedAt === binding.startedAt;

const resultStatusLabel = (
  status: "unassessed" | "insufficient" | "observed",
) => {
  if (status === "observed") return "Đã quan sát";
  if (status === "insufficient") return "Chưa đủ mẫu";
  return "Chưa đo";
};

const formatObservedAccuracy = (
  result: DisplayedAssessmentResult["overall"],
) => {
  if (result.observedAccuracy === null || !result.confidence95) {
    return `${result.correct}/${result.n} mục đo được`;
  }
  return `${result.correct}/${result.n} · ${result.observedAccuracy}% · khoảng 95% ${result.confidence95.lower}–${result.confidence95.upper}%`;
};

export function AuthenticatedAssessmentPage() {
  const { sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : "identity-pending";
  const authorityKey = [
    accountKey,
    authority.ownerGeneration?.ownerKey ?? "missing-owner",
    authority.ownerGeneration?.generation ?? "missing-generation",
    authority.resetEpoch ?? "missing-reset",
    authority.projection?.contentVersion ?? "missing-content",
    authority.projection?.manifestSha256 ?? "missing-manifest",
    authority.projection?.enrollment?.enrollmentId ?? "missing-enrollment",
  ].join("\u0000");
  return <AuthenticatedAssessmentPageScope key={authorityKey} />;
}

function AuthenticatedAssessmentPageScope() {
  const { actions, sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const refreshProjection = authority.refresh;
  const [records, setRecords] =
    useState<LearningCommandOutboxRecord[] | null>(null);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [phase, setPhase] = useState<RuntimePhase>("loading");
  const [runtime, setRuntime] =
    useState<NormalizedAssessmentRuntimeV1 | null>(null);
  const [commandIds, setCommandIds] =
    useState<StableNormalizedAssessmentCommandIds | null>(null);
  const [sessionDependency, setSessionDependency] =
    useState<QueuedAssessmentSessionDependency | null>(null);
  const [sessionBinding, setSessionBinding] =
    useState<AssessmentSessionAuthorityBindingV1 | null>(null);
  const [projectedAttempts, setProjectedAttempts] = useState<
    ActiveAssessmentAttemptProjectionV2[]
  >([]);
  const [result, setResult] =
    useState<DisplayedAssessmentResult | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [attemptState, setAttemptState] = useState<AttemptState>("idle");
  const [awaitingPosition, setAwaitingPosition] = useState<number | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abandonModalOpen, setAbandonModalOpen] = useState(false);
  const openCommandIdRef = useRef(makeIdempotencyKey(
    "assessment-session-open",
  ));
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : null;
  const projection = authority.projection;
  const assessmentProjection = authority.assessmentProjection;
  const progress = authority.authoritativeProgress;
  const ownerGeneration = authority.ownerGeneration;
  const resetEpoch = authority.resetEpoch;
  const exactAuthority = Boolean(
    accountKey
    && projection
    && assessmentProjection
    && progress
    && ownerGeneration
    && resetEpoch !== null
    && ownerGeneration.ownerKey === accountKey
    && projection.resetEpoch === resetEpoch
    && assessmentProjection.resetEpoch === resetEpoch
    && progress.resetEpoch === resetEpoch
    && assessmentProjection.contentVersion === progress.contentVersion
    && assessmentProjection.manifestSha256
      === CURRENT_CONTENT_MANIFEST_SHA256
    && assessmentProjection.enrollment
    && assessmentProjection.enrollment.enrollmentId === progress.enrollmentId
    && assessmentProjection.enrollment.contentVersion
      === progress.contentVersion
    && assessmentProjection.enrollment.manifestSha256
      === CURRENT_CONTENT_MANIFEST_SHA256,
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
    if (
      !CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE
      || !exactAuthority
      || !ownerGeneration
    ) {
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
        setError(
          "Không thể đọc nhật ký phiên khảo sát thuộc đúng tài khoản này.",
        );
        setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [
    exactAuthority,
    ownerGeneration,
    recordsVersion,
    sync.lastSyncedAt,
  ]);

  useEffect(() => {
    if (phase === "exercise" && attemptState === "idle") {
      questionHeadingRef.current?.focus();
    }
  }, [attemptState, index, phase]);

  useEffect(() => {
    let active = true;
    if (
      !CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE
      || !exactAuthority
      || !assessmentProjection
      || !progress
      || !ownerGeneration
      || !records
    ) {
      return () => {
        active = false;
      };
    }

    const stopSafely = (message: string) => {
      setRuntime(null);
      setCommandIds(null);
      setSessionDependency(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setResult(null);
      setError(message);
      setPhase("error");
    };

    const applyTerminal = (
      dependency: QueuedAssessmentSessionDependency,
      binding: AssessmentSessionAuthorityBindingV1,
    ) => {
      const terminal = terminalForSession(records, dependency);
      if (!terminal) return false;
      if (terminal.status === "quarantined") {
        stopSafely(
          terminal.quarantineReason
            ?? "Lệnh kết thúc phiên đã bị máy chủ từ chối vĩnh viễn.",
        );
        return true;
      }
      if (terminal.status === "pending") {
        setPhase(
          terminal.kind === "assessment-session-submit"
            ? "submitting"
            : "abandoning",
        );
        return true;
      }
      if (terminal.kind === "assessment-session-submit") {
        if (!assessmentSubmissionReceiptMatchesSessionBinding(
          terminal.receipt,
          binding,
          terminal.commandId,
        )) {
          stopSafely(
            "Receipt nộp khảo sát thiếu hoặc không còn khớp form server.",
          );
          return true;
        }
        setResult(terminal.receipt);
        setError(null);
        setPhase("result");
        return true;
      }
      if (!assessmentAbandonmentReceiptMatchesSessionBinding(
        terminal.receipt,
        binding,
        terminal.commandId,
      )) {
        stopSafely(
          "Receipt dừng khảo sát thiếu hoặc không còn khớp form server.",
        );
        return true;
      }
      setResult(null);
      setRuntime(null);
      setCommandIds(null);
      setSessionDependency(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setError(null);
      setPhase("abandoned");
      return true;
    };

    const applyMaterializedSession = async (
      dependency: QueuedAssessmentSessionDependency,
      binding: AssessmentSessionAuthorityBindingV1,
    ) => {
      if (applyTerminal(dependency, binding)) return;
      const materialized = dependency.kind === "assessment-session-open"
        ? await materializeNormalizedAssessmentRuntime({
            receipt: dependency.receipt,
            authoritativeProgress: progress,
            expectedOpenCommandId: dependency.command.idempotencyKey,
          })
        : await materializeNormalizedAssessmentRuntimeFromAuthorityBinding({
            binding: dependency.binding,
            authoritativeProgress: progress,
            commandSeed: dependency.command.adoptionKey,
          });
      if (!active) return;
      if (!materialized.ok) {
        stopSafely(
          `Phiên khảo sát không thể dựng an toàn (${materialized.code}).`,
        );
        return;
      }
      if (!assessmentRuntimeMatchesSessionBinding(
        materialized.runtime,
        binding,
      )) {
        stopSafely(
          "Runtime trình bày không còn khớp binding của phiên server.",
        );
        return;
      }
      const ids = await deriveStableNormalizedAssessmentCommandIds(
        materialized.runtime.commandSeed,
        materialized.runtime.items.length,
      );
      if (!active) return;
      if (
        ids.sessionAlias !== dependency.sessionAlias
        || ids.commandSeed !== dependency.commandId
      ) {
        stopSafely(
          "Dependency cục bộ không còn khớp định danh phiên server.",
        );
        return;
      }

      const projected = projectedAttemptsForSession(dependency);
      const localAttempts = records.filter(
        (record): record is QueuedAssessmentAttemptCommand =>
          record.kind === "assessment-attempt"
          && record.dependencyRecordKey === dependency.recordKey,
      );
      const coverage = deriveExactAssessmentCoverage({
        runtime: materialized.runtime,
        binding,
        commandIds: ids,
        sessionAlias: dependency.sessionAlias,
        projectedAttempts: projected,
        localAttempts,
      });
      if (!coverage.ok) {
        const quarantined = localAttempts.find((attempt) =>
          attempt.status === "quarantined"
        );
        stopSafely(
          quarantined?.quarantineReason
            ?? "Coverage câu trả lời không còn khớp form server bất biến.",
        );
        return;
      }
      const coveredPositions = new Set(coverage.coveredPositions);
      const pendingPosition = coverage.pendingPositions[0] ?? null;

      setRuntime(materialized.runtime);
      setCommandIds(ids);
      setSessionDependency(dependency);
      setSessionBinding(binding);
      setProjectedAttempts(projected);
      setResult(null);
      setError(null);
      setSelected(null);

      if (awaitingPosition !== null) {
        if (coveredPositions.has(awaitingPosition)) {
          setIndex(awaitingPosition);
          setAttemptState("recorded");
          setPhase("exercise");
          return;
        }
        if (pendingPosition === awaitingPosition) {
          setIndex(awaitingPosition);
          setAttemptState("pending");
          setPhase("exercise");
          return;
        }
      }

      if (pendingPosition !== null) {
        setAwaitingPosition(pendingPosition);
        setIndex(pendingPosition);
        setAttemptState("pending");
        setPhase("exercise");
        return;
      }
      const firstUnanswered = materialized.runtime.items.findIndex(
        (_item, position) => !coveredPositions.has(position),
      );
      if (firstUnanswered < 0) {
        setIndex(materialized.runtime.items.length - 1);
        setAttemptState("recorded");
      } else {
        setIndex(firstUnanswered);
        setAttemptState("idle");
        setAttemptStartedAt(Date.now());
      }
      setPhase("exercise");
    };

    const activeSession = assessmentProjection.activeAssessmentSession;
    if (activeSession) {
      const candidates = records.filter(
        (record): record is QueuedAssessmentSessionDependency => {
          const binding = record.kind === "assessment-session-open"
            ? record.receipt
            : record.kind === "projected-assessment-session-anchor"
              ? record.binding
              : null;
          return binding?.sessionId === activeSession.sessionId;
        },
      );
      if (candidates.some((candidate) => {
        const binding = authorityBindingForSession(candidate);
        return !binding
          || !projectionMatchesSessionBinding(activeSession, binding);
      })) {
        stopSafely(
          "Binding cục bộ không còn khớp phiên khảo sát trong projection.",
        );
        return () => {
          active = false;
        };
      }
      if (candidates.length > 1) {
        stopSafely(
          "Một phiên khảo sát server đang gắn với nhiều dependency cục bộ.",
        );
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
          record.kind === "assessment-session-open"
          && record.status === "pending"
          && record.resetEpoch === progress.resetEpoch
          && record.command.enrollmentId === progress.enrollmentId
          && record.command.contentVersion === progress.contentVersion
        );
        setRuntime(null);
        setCommandIds(null);
        setSessionDependency(null);
        setSessionBinding(null);
        setProjectedAttempts([]);
        setResult(null);
        setError(null);
        setPhase(pendingLocalOpen ? "opening" : "remote-session");
        return () => {
          active = false;
        };
      }
      if (
        dependency.kind === "projected-assessment-session-anchor"
        && !terminalForSession(records, dependency)
      ) {
        const refreshDecision = projectedAssessmentAnchorRefreshDecision({
          anchor: dependency,
          projectionCursor: assessmentProjection.cursor,
          session: activeSession,
          records,
        });
        if (refreshDecision === "conflict") {
          stopSafely(
            "Projection V2 không còn là phần mở rộng bất biến của phiên đã nhận.",
          );
          return () => {
            active = false;
          };
        }
        if (refreshDecision === "refresh") {
          setPhase("loading");
          void adoptActiveAssessmentSessionFromCachedProjection({
            ownerGeneration,
            resetEpoch: progress.resetEpoch,
            sessionId: activeSession.sessionId,
            installationId: dependency.command.installationId,
            deviceId: dependency.command.deviceId,
            adoptedAt: new Date().toISOString(),
          }).then(() => {
            if (active) refreshRecords();
          }).catch(() => {
            if (active) {
              stopSafely(
                "Không thể cập nhật anchor từ projection V2 mới hơn một cách an toàn.",
              );
            }
          });
          return () => {
            active = false;
          };
        }
      }
      void applyMaterializedSession(dependency, binding).catch(() => {
        if (active) {
          stopSafely(
            "Không thể kiểm chứng form khảo sát do máy chủ đóng băng.",
          );
        }
      });
      return () => {
        active = false;
      };
    }

    const dependencies = records.filter(
      (record): record is QueuedAssessmentSessionDependency => {
        if (record.resetEpoch !== progress.resetEpoch) return false;
        if (record.kind === "assessment-session-open") {
          return record.command.enrollmentId === progress.enrollmentId
            && record.command.contentVersion === progress.contentVersion;
        }
        if (record.kind === "projected-assessment-session-anchor") {
          return record.binding.enrollmentId === progress.enrollmentId
            && record.binding.contentVersion === progress.contentVersion;
        }
        return false;
      },
    );
    if (dependencies.length > 1) {
      stopSafely(
        "Có nhiều dependency khảo sát cho cùng enrollment hiện tại.",
      );
      return () => {
        active = false;
      };
    }
    const dependency = dependencies[0] ?? null;
    if (!dependency) {
      setRuntime(null);
      setCommandIds(null);
      setSessionDependency(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setError(null);
      if (assessmentProjection.latestAssessmentResult) {
        setResult(assessmentProjection.latestAssessmentResult);
        setPhase("result");
      } else {
        setResult(null);
        setPhase("briefing");
      }
      return () => {
        active = false;
      };
    }
    if (dependency.status === "quarantined") {
      stopSafely(
        dependency.quarantineReason
          ?? "Lệnh mở khảo sát đã bị máy chủ từ chối vĩnh viễn.",
      );
      return () => {
        active = false;
      };
    }
    if (dependency.status === "pending") {
      setPhase("opening");
      return () => {
        active = false;
      };
    }
    const binding = authorityBindingForSession(dependency);
    if (!binding) {
      stopSafely("Receipt mở khảo sát bị thiếu hoặc không hợp lệ.");
      return () => {
        active = false;
      };
    }
    void applyMaterializedSession(dependency, binding).catch(() => {
      if (active) {
        stopSafely(
          "Không thể kiểm chứng form khảo sát do máy chủ đóng băng.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [
    assessmentProjection,
    awaitingPosition,
    exactAuthority,
    ownerGeneration,
    progress,
    records,
    refreshRecords,
  ]);

  const readEnvironment = useCallback(async () => {
    if (
      !accountKey
      || !ownerGeneration
      || resetEpoch === null
    ) return null;
    return readExactNormalizedLessonEnvironment({
      accountKey,
      expectedOwnerGeneration: ownerGeneration,
      expectedResetEpoch: resetEpoch,
    });
  }, [accountKey, ownerGeneration, resetEpoch]);

  const syncAndRefresh = useCallback(async () => {
    await actions.syncNow();
    refreshRecords();
    refreshProjection();
  }, [actions, refreshProjection, refreshRecords]);

  const startAssessment = useCallback(async () => {
    if (
      busy
      || !CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE
      || !exactAuthority
      || !progress
    ) return;
    setBusy(true);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) {
        throw new Error("owner-scope-changed");
      }
      const input = await buildNormalizedAssessmentOpenQueueInput({
        authoritativeProgress: progress,
        environment,
        openCommandId: openCommandIdRef.current,
        enqueuedAt: new Date().toISOString(),
      });
      await enqueueAssessmentSessionCommand(input);
      setPhase("opening");
      await syncAndRefresh();
    } catch {
      setError(
        "Không thể mở khảo sát trong đúng phạm vi tài khoản hiện tại. Hãy đồng bộ rồi thử lại.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    exactAuthority,
    progress,
    readEnvironment,
    syncAndRefresh,
  ]);

  const adoptRemoteSession = useCallback(async () => {
    const activeSession = assessmentProjection?.activeAssessmentSession;
    if (
      busy
      || !CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE
      || !activeSession
    ) return;
    setBusy(true);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      await adoptActiveAssessmentSessionFromCachedProjection({
        ownerGeneration: environment.ownerGeneration,
        resetEpoch: environment.resetEpoch,
        sessionId: activeSession.sessionId,
        installationId: environment.installationId,
        deviceId: environment.deviceId,
        adoptedAt: new Date().toISOString(),
      });
      refreshRecords();
    } catch {
      setError(
        "Không thể nhận phiên từ projection V2 đúng owner/reset hiện tại.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [
    assessmentProjection,
    busy,
    readEnvironment,
    refreshRecords,
  ]);

  const recordAnswer = useCallback(async () => {
    if (
      busy
      || attemptState !== "idle"
      || !runtime
      || !commandIds
      || !sessionBinding
      || !sessionDependency
      || !selected
    ) return;
    const position = index;
    setBusy(true);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      if (
        !assessmentRuntimeMatchesSessionBinding(runtime, sessionBinding)
        || commandIds.commandSeed !== runtime.commandSeed
        || commandIds.sessionAlias !== sessionDependency.sessionAlias
      ) {
        throw new Error("runtime-binding-changed");
      }
      const input = await buildNormalizedAssessmentAttemptQueueInput(
        runtime,
        environment,
        {
          position,
          selectedAnswer: selected,
          durationMs: Math.min(
            600_000,
            Math.max(0, Date.now() - attemptStartedAt),
          ),
          occurredAt: new Date().toISOString(),
        },
      );
      await enqueueAssessmentAttemptCommand(input);
      setAwaitingPosition(position);
      setAttemptState("pending");
      setSelected(null);
      await syncAndRefresh();
    } catch {
      setError(
        "Câu trả lời chưa thể ghi vào đúng phiên server. Không có kết quả nào được suy đoán cục bộ.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [
    attemptStartedAt,
    attemptState,
    busy,
    commandIds,
    index,
    readEnvironment,
    runtime,
    selected,
    sessionBinding,
    sessionDependency,
    syncAndRefresh,
  ]);

  const submitAssessment = useCallback(async () => {
    if (
      busy
      || !runtime
      || !commandIds
      || !sessionBinding
      || !sessionDependency
      || !records
    ) return;
    setBusy(true);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      const localAttempts = records.filter(
        (record): record is QueuedAssessmentAttemptCommand =>
          record.kind === "assessment-attempt"
          && record.dependencyRecordKey === sessionDependency.recordKey,
      );
      const coverage = deriveExactAssessmentCoverage({
        runtime,
        binding: sessionBinding,
        commandIds,
        sessionAlias: sessionDependency.sessionAlias,
        projectedAttempts,
        localAttempts,
      });
      if (!coverage.ok || !coverage.complete) {
        throw new Error("attempt-coverage-incomplete");
      }
      const input = await buildNormalizedAssessmentSubmissionQueueInput(
        runtime,
        environment,
        new Date().toISOString(),
        coverage.localAcknowledgedPositions,
      );
      await enqueueAssessmentSessionSubmissionCommand(input);
      setAwaitingPosition(null);
      setPhase("submitting");
      await syncAndRefresh();
    } catch {
      setError(
        "Chỉ có thể nộp khi mọi vị trí trong form đã có receipt ghi nhận chính xác.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    commandIds,
    projectedAttempts,
    readEnvironment,
    records,
    runtime,
    sessionBinding,
    sessionDependency,
    syncAndRefresh,
  ]);

  const continueAssessment = useCallback(() => {
    if (
      attemptState !== "recorded"
      || !runtime
      || !commandIds
      || !sessionBinding
      || !sessionDependency
      || !records
    ) return;
    const localAttempts = records.filter(
      (record): record is QueuedAssessmentAttemptCommand =>
        record.kind === "assessment-attempt"
        && record.dependencyRecordKey === sessionDependency.recordKey,
    );
    const coverage = deriveExactAssessmentCoverage({
      runtime,
      binding: sessionBinding,
      commandIds,
      sessionAlias: sessionDependency.sessionAlias,
      projectedAttempts,
      localAttempts,
    });
    if (!coverage.ok) {
      setError(
        "Coverage câu trả lời không còn khớp form server bất biến.",
      );
      setPhase("error");
      return;
    }
    const covered = new Set(
      coverage.coveredPositions,
    );
    const nextPosition = runtime.items.findIndex(
      (_item, position) => !covered.has(position),
    );
    if (nextPosition < 0) {
      void submitAssessment();
      return;
    }
    setAwaitingPosition(null);
    setSelected(null);
    setIndex(nextPosition);
    setAttemptState("idle");
    setAttemptStartedAt(Date.now());
  }, [
    attemptState,
    commandIds,
    projectedAttempts,
    records,
    runtime,
    sessionBinding,
    sessionDependency,
    submitAssessment,
  ]);

  const abandonAssessment = useCallback(async () => {
    if (
      busy
      || !runtime
      || !sessionBinding
      || !sessionDependency
    ) return;
    setBusy(true);
    setAbandonModalOpen(false);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      if (!assessmentRuntimeMatchesSessionBinding(runtime, sessionBinding)) {
        throw new Error("runtime-binding-changed");
      }
      const input = await buildNormalizedAssessmentAbandonQueueInput(
        runtime,
        environment,
        new Date().toISOString(),
      );
      await enqueueAssessmentSessionAbandonmentCommand(input);
      setPhase("abandoning");
      await syncAndRefresh();
    } catch {
      setError(
        "Không thể dừng đúng phiên server hiện tại. Phiên không bị đánh dấu hoàn tất.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    readEnvironment,
    runtime,
    sessionBinding,
    sessionDependency,
    syncAndRefresh,
  ]);

  const currentItem = runtime?.items[index] ?? null;
  const coverageSnapshot = useMemo(() => {
    if (
      !runtime
      || !commandIds
      || !sessionBinding
      || !sessionDependency
      || !records
    ) return null;
    return deriveExactAssessmentCoverage({
      runtime,
      binding: sessionBinding,
      commandIds,
      sessionAlias: sessionDependency.sessionAlias,
      projectedAttempts,
      localAttempts: records.filter(
        (record): record is QueuedAssessmentAttemptCommand =>
          record.kind === "assessment-attempt"
          && record.dependencyRecordKey === sessionDependency.recordKey,
      ),
    });
  }, [
    commandIds,
    projectedAttempts,
    records,
    runtime,
    sessionBinding,
    sessionDependency,
  ]);
  const coveredCount = coverageSnapshot?.ok
    ? coverageSnapshot.coveredPositions.length
    : 0;
  const allAttemptsRecorded = coverageSnapshot?.ok
    ? coverageSnapshot.complete
    : false;

  if (!CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <ShieldCheck size={44} />
        <span>SERVER SCREENING · RELEASE FENCE ACTIVE</span>
        <h1>Khảo sát server chưa thể phát hành</h1>
        <p>
          Gói nội dung hiện tại chưa đạt cổng closed-alpha và kho item vẫn chờ
          linguistic review. HANZI.OS không mở phiên, không dùng form local thay
          thế, và không biến điểm trò chơi thành bằng chứng năng lực.
        </p>
        <Link className="primary-button" to="/path">
          <BrainCircuit size={17} /> Tiếp tục lộ trình đã mở
        </Link>
      </div>
    );
  }

  if (!exactAuthority) {
    return (
      <NormalizedLearningAuthorityGate
        phase={authority.phase}
        reason={authority.reason}
        refresh={authority.refresh}
      />
    );
  }

  if (phase === "loading" || records === null) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <RefreshCw className="spin" size={44} />
        <h1>Đang kiểm chứng phiên khảo sát</h1>
        <p>
          Hệ thống đang đối chiếu owner, reset epoch, enrollment và projection
          V2 trước khi hiển thị form.
        </p>
      </div>
    );
  }

  if (phase === "briefing") {
    return (
      <div className="assessment-intro">
        <div className="assessment-core">
          <BrainCircuit size={38} />
          <span />
        </div>
        <span className="system-kicker">
          SERVER-AUTHORITATIVE · UNCALIBRATED
        </span>
        <h1>Khảo sát năng lực nền tảng</h1>
        <p>
          Máy chủ phát một form không kèm đáp án, ghi nhận từng lựa chọn và chỉ
          trả về thống kê tổng hợp. Kết quả không mở khóa prerequisite, không
          thay đổi lộ trình và không được tính là mastery.
        </p>
        <div className="assessment-facts">
          <span>
            <Gauge size={18} />
            <strong>Form đóng băng</strong>
            <small>hash kiểm chứng</small>
          </span>
          <span>
            <ShieldCheck size={18} />
            <strong>Server ghi nhận</strong>
            <small>không chấm trên client</small>
          </span>
          <span>
            <Sparkles size={18} />
            <strong>Uncalibrated</strong>
            <small>chỉ số quan sát</small>
          </span>
        </div>
        <div className="assessment-actions">
          <Link className="secondary-button" to="/path">
            Quay lại lộ trình
          </Link>
          <button
            className="primary-button"
            disabled={busy}
            type="button"
            onClick={() => void startAssessment()}
          >
            Bắt đầu khảo sát <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (phase === "remote-session") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <ShieldCheck size={44} />
        <h1>Có một phiên đang mở trên thiết bị khác</h1>
        <p>
          Chỉ projection V2 đã cache cho đúng owner/reset mới có thể được nhận
          vào thiết bị này. Thao tác này không mở lại phiên và không tải đáp án.
        </p>
        <div className="assessment-actions">
          <Link className="secondary-button" to="/path">
            Để phiên tiếp tục ở thiết bị kia
          </Link>
          <button
            className="primary-button"
            disabled={busy}
            type="button"
            onClick={() => void adoptRemoteSession()}
          >
            Tiếp tục trên thiết bị này <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  if (
    phase === "opening"
    || phase === "submitting"
    || phase === "abandoning"
  ) {
    const copy = phase === "opening"
      ? {
          title: "Đang chờ máy chủ phát form",
          description:
            "Không có câu hỏi local nào được dùng trong lúc chờ receipt.",
        }
      : phase === "submitting"
        ? {
            title: "Đang nộp thống kê phiên",
            description:
              "Máy chủ đang kiểm tra coverage đầy đủ trước khi trả kết quả tổng hợp.",
          }
        : {
            title: "Đang dừng phiên khảo sát",
            description:
              "Hệ thống đang chờ receipt dừng đúng session và form hash.",
          };
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <RefreshCw className="spin" size={44} />
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
    );
  }

  if (phase === "abandoned") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <ShieldCheck size={44} />
        <h1>Phiên khảo sát đã dừng</h1>
        <p>
          Máy chủ đã xác nhận dừng phiên. Không có kết quả, mastery hay thay đổi
          lộ trình nào được tạo từ phần trả lời chưa hoàn tất.
        </p>
        <Link className="primary-button" to="/path">
          <ArrowLeft size={17} /> Trở lại lộ trình
        </Link>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="lesson-state-screen" role="alert">
        <AlertTriangle size={44} />
        <h1>Phiên khảo sát đã dừng an toàn</h1>
        <p>
          {error ?? "Authority của phiên không còn khớp dữ liệu hiện tại."}
        </p>
        <div className="assessment-actions">
          <Link className="secondary-button" to="/path">
            Trở lại lộ trình
          </Link>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setError(null);
              setPhase("loading");
              refreshRecords();
              refreshProjection();
            }}
          >
            <RefreshCw size={17} /> Kiểm tra lại
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    return (
      <div className="assessment-result uncalibrated-result">
        <div className="result-sigil observed">
          <Gauge size={38} />
          <span />
        </div>
        <span className="system-kicker">
          SERVER OBSERVATION · UNCALIBRATED
        </span>
        <h1>Thống kê mô tả của form này</h1>
        <div className="assessment-score">
          <strong>{result.overall.correct}/{result.overall.n}</strong>
          <span>mục có dữ liệu</span>
        </div>
        <p>
          {formatObservedAccuracy(result.overall)}. Đây chỉ là thống kê của
          form hiện tại, không phải điểm đạt, chứng nhận trình độ hay quyền mở
          khóa.
        </p>
        <div
          className="assessment-observation-list"
          aria-label="Thống kê mô tả theo kỹ năng"
        >
          {result.skills.map((skillResult) => (
            <div key={skillResult.skill}>
              <span>{SKILL_LABELS[skillResult.skill]}</span>
              <strong>
                {resultStatusLabel(skillResult.status)}
                {" · "}
                {skillResult.n > 0
                  ? `${skillResult.correct}/${skillResult.n}`
                  : "0 mục đo được"}
              </strong>
            </div>
          ))}
        </div>
        <p>
          Khoảng bất định dùng mức 95%. Calibration vẫn đang chờ pilot; kết
          quả này không khuyến nghị bài học, không thay đổi mastery và không
          thay thế prerequisite.
        </p>
        <div className="assessment-actions">
          <Link className="primary-button" to="/path">
            Tiếp tục lộ trình hiện có <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    );
  }

  if (
    phase !== "exercise"
    || !runtime
    || !currentItem
    || !sessionBinding
  ) {
    return (
      <div className="lesson-state-screen" role="alert">
        <AlertTriangle size={44} />
        <h1>Form khảo sát không còn hợp lệ</h1>
        <p>
          Phiên bị loại khỏi giao diện để tránh ghi câu trả lời vào một form
          khác.
        </p>
        <Link className="primary-button" to="/path">
          Trở lại lộ trình
        </Link>
      </div>
    );
  }

  const progressPercent = Math.round(
    (coveredCount / runtime.items.length) * 100,
  );
  return (
    <>
      <div className="assessment-live">
        <header>
          <button
            className="icon-button"
            type="button"
            aria-label="Dừng phiên khảo sát"
            onClick={() => setAbandonModalOpen(true)}
          >
            <X size={20} />
          </button>
          <div
            role="progressbar"
            aria-label="Tiến độ câu trả lời đã được máy chủ ghi nhận"
            aria-valuemin={0}
            aria-valuemax={runtime.items.length}
            aria-valuenow={coveredCount}
            aria-valuetext={`${coveredCount} trên ${runtime.items.length} câu đã được ghi nhận`}
          >
            <i style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{coveredCount}/{runtime.items.length}</span>
        </header>
        <section className="assessment-question">
          <span className="system-kicker">
            {currentItem.modality === "synthetic-tts-selection"
              ? <Headphones size={15} />
              : <Sparkles size={15} />}
            {" "}
            {currentItem.meta}
          </span>
          <h1 ref={questionHeadingRef} tabIndex={-1}>
            {currentItem.prompt}
          </h1>
          {currentItem.modality === "synthetic-tts-selection"
            && currentItem.stimulusText && (
            <>
              <button
                className="sound-orb"
                type="button"
                disabled={attemptState !== "idle"}
                onClick={() => speakMandarin(currentItem.stimulusText!)}
                aria-label="Nghe stimulus tổng hợp"
              >
                <Volume2 size={37} />
                <span />
              </button>
              <p>
                TTS tổng hợp chỉ là stimulus luyện tập và không được tính vào
                chỉ số đo.
              </p>
            </>
          )}
          <div
            className="assessment-options"
            role="radiogroup"
            aria-label={`Các lựa chọn cho câu ${index + 1}`}
          >
            {currentItem.options.map((option, optionIndex) => (
              <button
                className={selected === option ? "selected" : ""}
                disabled={attemptState !== "idle" || busy}
                key={option}
                role="radio"
                aria-checked={selected === option}
                type="button"
                onClick={() => setSelected(option)}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>
                <strong>{option}</strong>
              </button>
            ))}
          </div>
        </section>
        <footer>
          <div role="status" aria-live="polite" aria-atomic="true">
            {attemptState === "recorded" ? (
              <>
                <strong>Đã ghi nhận</strong>
                <p>
                  Receipt chỉ xác nhận vị trí này đã được lưu; máy chủ không trả
                  về kết quả từng câu.
                </p>
              </>
            ) : attemptState === "pending" ? (
              <>
                <strong>Đang chờ receipt</strong>
                <p>
                  Lựa chọn đang được đồng bộ. Giao diện không tự chấm trong lúc
                  chờ.
                </p>
              </>
            ) : (
              <p>
                Chọn phương án gần nhất với hiểu biết hiện tại của bạn.
              </p>
            )}
          </div>
          <button
            className="primary-button"
            disabled={
              busy
              || attemptState === "pending"
              || (attemptState === "idle" && !selected)
            }
            type="button"
            onClick={() => {
              if (attemptState === "recorded") continueAssessment();
              else void recordAnswer();
            }}
          >
            {attemptState === "recorded"
              ? allAttemptsRecorded
                ? "Nộp thống kê"
                : "Câu tiếp theo"
              : attemptState === "pending"
                ? "Đang ghi nhận"
                : "Gửi lựa chọn"}
            <ArrowRight size={17} />
          </button>
        </footer>
      </div>

      <ConfirmModal
        open={abandonModalOpen}
        title="Dừng phiên khảo sát?"
        description="Máy chủ sẽ đánh dấu phiên này là đã dừng. Phần trả lời chưa hoàn tất không tạo kết quả tổng hợp."
        eyebrow="SESSION CONTROL"
        cancelLabel="Tiếp tục khảo sát"
        confirmLabel="Dừng đúng phiên này"
        busy={busy}
        onCancel={() => setAbandonModalOpen(false)}
        onConfirm={() => void abandonAssessment()}
      />
    </>
  );
}
