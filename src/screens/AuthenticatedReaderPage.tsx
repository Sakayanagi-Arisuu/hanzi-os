import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Headphones,
  RefreshCw,
  ShieldCheck,
  Volume2,
  X,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { NormalizedLearningAuthorityGate } from "../components/NormalizedLearningAuthorityGate";
import { ConfirmModal } from "../components/SystemFeedback";
import {
  CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE,
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_VERSION,
} from "../content/currentContentIdentity";
import type {
  ActiveReaderAttemptProjectionV3,
  ActiveReaderSessionProjectionV3,
} from "../learning/projectionProtocol";
import {
  buildNormalizedReaderSessionAbandonmentQueueInput,
  buildNormalizedReaderSessionAttemptQueueInput,
  buildNormalizedReaderSessionOpenQueueInput,
  buildNormalizedReaderSessionSubmissionQueueInput,
  deriveStableNormalizedReaderCommandIds,
  type NormalizedReaderSessionQueueContextV1,
  type StableNormalizedReaderCommandIds,
} from "../learning/normalizedReaderSessionCommands";
import { handleRadioGroupKeyDown } from "../lib/radioGroupKeyboard";
import { speakMandarin } from "../lib/speech";
import {
  deriveExactReaderCoverage,
} from "../reader/normalizedReaderUiCoverage";
import {
  readerAbandonmentReceiptMatchesSessionBinding,
  readerProjectionMatchesSessionBinding,
  readerSessionAuthorityBindingIsExact,
  readerSubmissionReceiptMatchesSessionBinding,
} from "../reader/normalizedReaderUiAuthority";
import type {
  ReaderSessionAuthorityBindingV1,
} from "../reader/readerSessionProtocol";
import type {
  SubmitReaderSessionReceiptV1,
} from "../reader/readerSubmissionProtocol";
import { useLearning } from "../store/LearningStore";
import { useNormalizedLearningProjection } from "../store/NormalizedLearningProjectionStore";
import { sha256Hex } from "../sync/canonicalHash";
import {
  enqueueReaderAttemptCommand,
  enqueueReaderSessionAbandonmentCommand,
  enqueueReaderSessionCommand,
  enqueueReaderSessionSubmissionCommand,
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
  listLearningCommandRecords,
  type LearningCommandOutboxRecord,
  type QueuedReaderAttemptCommand,
  type QueuedReaderSessionAbandonmentCommand,
  type QueuedReaderSessionCommand,
  type QueuedReaderSessionDependency,
  type QueuedReaderSessionSubmissionCommand,
} from "../sync/learningCommandOutbox";
import { readExactNormalizedLessonEnvironment } from "../sync/normalizedLessonEnvironment";
import {
  adoptActiveReaderSessionFromCachedProjection,
  projectedReaderAnchorRefreshDecision,
} from "../sync/projectedReaderSessionAdoption";

type ReaderRuntimePhase =
  | "loading"
  | "briefing"
  | "opening"
  | "exercise"
  | "submitting"
  | "abandoning"
  | "support-transition"
  | "abandoned"
  | "remote-session"
  | "result"
  | "error";

type ReaderAttemptState = "idle" | "pending" | "recorded";
type QueuedReaderTerminal =
  | QueuedReaderSessionSubmissionCommand
  | QueuedReaderSessionAbandonmentCommand;

// Opaque offer metadata only. No presentation, answer, explanation or scoring
// material is bundled into the authenticated Reader surface.
const CURRENT_READER_STORY_ID = "first-day";
const CURRENT_READER_SCRIPT = "simplified" as const;

const newestRecord = <T extends LearningCommandOutboxRecord>(records: T[]) =>
  [...records].sort(
    (left, right) => right.deviceSequence - left.deviceSequence,
  )[0] ?? null;

const authorityBindingForSession = (
  session: QueuedReaderSessionDependency,
): ReaderSessionAuthorityBindingV1 | null =>
  session.kind === "projected-reader-session-anchor"
    ? session.binding
    : session.receipt;

const projectedAttemptsForSession = (
  session: QueuedReaderSessionDependency,
): ActiveReaderAttemptProjectionV3[] =>
  session.kind === "projected-reader-session-anchor"
    ? session.projectedAttempts
    : [];

const commandSeedForSession = (
  session: QueuedReaderSessionDependency,
) => session.kind === "projected-reader-session-anchor"
  ? session.command.adoptionKey
  : session.command.idempotencyKey;

const terminalForSession = (
  records: LearningCommandOutboxRecord[],
  session: QueuedReaderSessionDependency,
): QueuedReaderTerminal | null => newestRecord(records.filter(
  (record): record is QueuedReaderTerminal =>
    (
      record.kind === "reader-session-submit"
      || record.kind === "reader-session-abandon"
    )
    && record.dependencyRecordKey === session.recordKey,
));

const supportSuccessor = (
  records: LearningCommandOutboxRecord[],
  abandonment: QueuedReaderSessionAbandonmentCommand,
) => newestRecord(records.filter(
  (record): record is QueuedReaderSessionCommand =>
    record.kind === "reader-session-open"
    && record.dependencyRecordKey === abandonment.recordKey
    && record.command.supportMode === "assisted",
));

const activeLocalAttempts = (
  records: LearningCommandOutboxRecord[],
  dependency: QueuedReaderSessionDependency,
) => records.filter(
  (record): record is QueuedReaderAttemptCommand =>
    record.kind === "reader-attempt"
    && record.dependencyRecordKey === dependency.recordKey,
);

const localOpenHasUnownedProjectionAttempts = (
  dependency: QueuedReaderSessionCommand,
  session: ActiveReaderSessionProjectionV3,
  localAttempts: readonly QueuedReaderAttemptCommand[],
) => {
  const acknowledgedAttemptIds = new Set(
    localAttempts.flatMap((attempt) =>
      attempt.status === "acknowledged" && attempt.receipt
        ? [attempt.receipt.attemptId]
        : []
    ),
  );
  return session.attempts.some((attempt) =>
    !acknowledgedAttemptIds.has(attempt.attemptId)
  );
};

export function AuthenticatedReaderPage() {
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
    authority.readerProjection?.cursor ?? "missing-reader-cursor",
    authority.projection?.contentVersion ?? "missing-content",
    authority.projection?.manifestSha256 ?? "missing-manifest",
    authority.projection?.enrollment?.enrollmentId ?? "missing-enrollment",
  ].join("\u0000");
  return <AuthenticatedReaderPageScope key={authorityKey} />;
}

function AuthenticatedReaderPageScope() {
  const { actions, sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const refreshProjection = authority.refresh;
  const [records, setRecords] =
    useState<LearningCommandOutboxRecord[] | null>(null);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [phase, setPhase] = useState<ReaderRuntimePhase>("loading");
  const [sessionDependency, setSessionDependency] =
    useState<QueuedReaderSessionDependency | null>(null);
  const [sessionBinding, setSessionBinding] =
    useState<ReaderSessionAuthorityBindingV1 | null>(null);
  const [projectedAttempts, setProjectedAttempts] =
    useState<ActiveReaderAttemptProjectionV3[]>([]);
  const [commandIds, setCommandIds] =
    useState<StableNormalizedReaderCommandIds | null>(null);
  const [result, setResult] =
    useState<SubmitReaderSessionReceiptV1 | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [attemptState, setAttemptState] =
    useState<ReaderAttemptState>("idle");
  const [awaitingPosition, setAwaitingPosition] = useState<number | null>(null);
  const [attemptStartedAt, setAttemptStartedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abandonModalOpen, setAbandonModalOpen] = useState(false);
  const openCommandIdRef = useRef(
    `reader-session-open:${crypto.randomUUID()}`,
  );
  const supportReopenInFlight = useRef(new Set<string>());
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const accountKey = sync.session?.authenticated
    ? sync.session.accountKey
    : null;
  const projection = authority.projection;
  const readerProjection = authority.readerProjection;
  const progress = authority.authoritativeProgress;
  const ownerGeneration = authority.ownerGeneration;
  const resetEpoch = authority.resetEpoch;
  const exactAuthority = Boolean(
    accountKey
    && projection
    && readerProjection
    && progress
    && ownerGeneration
    && resetEpoch !== null
    && ownerGeneration.ownerKey === accountKey
    && projection.resetEpoch === resetEpoch
    && readerProjection.resetEpoch === resetEpoch
    && progress.resetEpoch === resetEpoch
    && projection.contentVersion === CURRENT_CONTENT_VERSION
    && readerProjection.contentVersion === CURRENT_CONTENT_VERSION
    && progress.contentVersion === CURRENT_CONTENT_VERSION
    && projection.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
    && readerProjection.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
    && progress.manifestSha256 === CURRENT_CONTENT_MANIFEST_SHA256
    && readerProjection.enrollment
    && readerProjection.enrollment.enrollmentId === progress.enrollmentId
    && readerProjection.enrollment.contentVersion
      === CURRENT_CONTENT_VERSION
    && readerProjection.enrollment.manifestSha256
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
          "Không thể đọc nhật ký Reader thuộc đúng tài khoản hiện tại.",
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
    try {
      await actions.syncNow();
    } finally {
      refreshRecords();
      refreshProjection();
    }
  }, [actions, refreshProjection, refreshRecords]);

  const queueAssistedReopen = useCallback(async (
    binding: ReaderSessionAuthorityBindingV1,
    abandonmentCommandId: string,
  ) => {
    if (
      supportReopenInFlight.current.has(abandonmentCommandId)
      || binding.supportMode !== "unassisted"
      || !progress
    ) return;
    supportReopenInFlight.current.add(abandonmentCommandId);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      const digest = await sha256Hex({
        schemaVersion: 1,
        scope: "reader-assisted-reopen",
        abandonmentCommandId,
        sessionId: binding.sessionId,
        formHash: binding.formHash,
      });
      const input = await buildNormalizedReaderSessionOpenQueueInput({
        storyId: binding.storyId,
        script: binding.script,
        supportMode: "assisted",
        authoritativeProgress: progress,
        environment,
        openCommandId: `reader-assisted-reopen:${digest}`,
        supportDowngradeDependencyCommandId: abandonmentCommandId,
        enqueuedAt: new Date().toISOString(),
      });
      await enqueueReaderSessionCommand(input);
      setPhase("opening");
      await syncAndRefresh();
    } catch (reopenError) {
      supportReopenInFlight.current.delete(abandonmentCommandId);
      throw reopenError;
    }
  }, [progress, readEnvironment, syncAndRefresh]);

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
      || !readerProjection
      || !progress
      || !ownerGeneration
      || !records
    ) {
      return () => {
        active = false;
      };
    }

    const stopSafely = (message: string) => {
      setSessionDependency(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setCommandIds(null);
      setResult(null);
      setError(message);
      setPhase("error");
    };

    const applySession = async (
      dependency: QueuedReaderSessionDependency,
      binding: ReaderSessionAuthorityBindingV1,
    ): Promise<void> => {
      if (
        !await readerSessionAuthorityBindingIsExact(binding)
        || binding.enrollmentId !== progress.enrollmentId
        || binding.resetEpoch !== progress.resetEpoch
        || binding.contentVersion !== progress.contentVersion
      ) {
        stopSafely(
          "Binding Reader không còn khớp form answer-free của máy chủ.",
        );
        return;
      }

      const terminal = terminalForSession(records, dependency);
      if (terminal) {
        if (terminal.status === "quarantined") {
          stopSafely(
            terminal.quarantineReason
              ?? "Lệnh kết thúc Reader đã bị máy chủ từ chối vĩnh viễn.",
          );
          return;
        }
        if (terminal.status === "pending") {
          setPhase(
            terminal.kind === "reader-session-submit"
              ? "submitting"
              : terminal.command.reason === "support-requested"
                ? "support-transition"
                : "abandoning",
          );
          return;
        }
        if (terminal.kind === "reader-session-submit") {
          if (!readerSubmissionReceiptMatchesSessionBinding(
            terminal.receipt,
            binding,
            terminal.commandId,
          )) {
            stopSafely(
              "Receipt nộp Reader thiếu hoặc không khớp form server.",
            );
            return;
          }
          setResult(terminal.receipt);
          setSessionDependency(dependency);
          setSessionBinding(binding);
          setProjectedAttempts(projectedAttemptsForSession(dependency));
          setError(null);
          setPhase("result");
          return;
        }
        if (!readerAbandonmentReceiptMatchesSessionBinding(
          terminal.receipt,
          binding,
          terminal.commandId,
          terminal.command.reason,
        )) {
          stopSafely(
            "Receipt dừng Reader thiếu hoặc không khớp form server.",
          );
          return;
        }
        if (terminal.command.reason === "support-requested") {
          const successor = supportSuccessor(records, terminal);
          if (successor) {
            if (successor.status === "quarantined") {
              stopSafely(
                successor.quarantineReason
                  ?? "Không thể mở lại Reader ở chế độ hỗ trợ.",
              );
              return;
            }
            if (successor.status === "pending" || !successor.receipt) {
              setPhase("opening");
              return;
            }
            await applySession(successor, successor.receipt);
            return;
          }
          setPhase("support-transition");
          void queueAssistedReopen(binding, terminal.commandId)
            .catch(() => {
              if (active) {
                stopSafely(
                  "Phiên cũ đã dừng nhưng chưa thể mở lại chế độ hỗ trợ.",
                );
              }
            });
          return;
        }
        setSessionDependency(null);
        setSessionBinding(null);
        setProjectedAttempts([]);
        setCommandIds(null);
        setResult(null);
        setError(null);
        setPhase("abandoned");
        return;
      }

      const commandSeed = commandSeedForSession(dependency);
      const ids = await deriveStableNormalizedReaderCommandIds(
        commandSeed,
        binding.expectedItemCount,
      );
      if (!active) return;
      if (ids.sessionAlias !== dependency.sessionAlias) {
        stopSafely(
          "Dependency Reader không còn khớp định danh phiên bền vững.",
        );
        return;
      }

      const localAttempts = activeLocalAttempts(records, dependency);
      const projected = projectedAttemptsForSession(dependency);
      const coverage = deriveExactReaderCoverage({
        binding,
        commandSeed,
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
            ?? "Coverage Reader không còn khớp form server bất biến.",
        );
        return;
      }

      const coveredPositions = new Set(coverage.coveredPositions);
      const pendingPosition = coverage.pendingPositions[0] ?? null;
      setSessionDependency(dependency);
      setSessionBinding(binding);
      setProjectedAttempts(projected);
      setCommandIds(ids);
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
      const firstUnanswered = binding.form.items.findIndex(
        (_item, position) => !coveredPositions.has(position),
      );
      if (firstUnanswered < 0) {
        setIndex(binding.form.items.length - 1);
        setAttemptState("recorded");
      } else {
        setIndex(firstUnanswered);
        setAttemptState("idle");
        setAttemptStartedAt(Date.now());
      }
      setPhase("exercise");
    };

    const activeSession = readerProjection.activeReaderSession;
    if (activeSession) {
      const candidates = records.filter(
        (record): record is QueuedReaderSessionDependency => {
          const binding = record.kind === "reader-session-open"
            ? record.receipt
            : record.kind === "projected-reader-session-anchor"
              ? record.binding
              : null;
          return binding?.sessionId === activeSession.sessionId;
        },
      );
      if (candidates.some((candidate) => {
        const binding = authorityBindingForSession(candidate);
        return !binding
          || !readerProjectionMatchesSessionBinding(activeSession, binding);
      })) {
        stopSafely(
          "Binding cục bộ không còn khớp Reader session trong projection V3.",
        );
        return () => {
          active = false;
        };
      }
      if (candidates.length > 1) {
        stopSafely(
          "Một Reader session server đang gắn với nhiều dependency cục bộ.",
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
          record.kind === "reader-session-open"
          && record.status === "pending"
          && record.resetEpoch === progress.resetEpoch
          && record.command.enrollmentId === progress.enrollmentId
          && record.command.contentVersion === progress.contentVersion
        );
        setSessionDependency(null);
        setSessionBinding(null);
        setProjectedAttempts([]);
        setCommandIds(null);
        setResult(null);
        setError(null);
        setPhase(pendingLocalOpen ? "opening" : "remote-session");
        return () => {
          active = false;
        };
      }
      if (
        dependency.kind === "reader-session-open"
        && localOpenHasUnownedProjectionAttempts(
          dependency,
          activeSession,
          activeLocalAttempts(records, dependency),
        )
      ) {
        stopSafely(
          "Reader session đã nhận attempt từ thiết bị khác; thiết bị này không tự hợp nhất lựa chọn.",
        );
        return () => {
          active = false;
        };
      }
      if (
        dependency.kind === "projected-reader-session-anchor"
        && !terminalForSession(records, dependency)
      ) {
        const refreshDecision = projectedReaderAnchorRefreshDecision({
          anchor: dependency,
          projectionCursor: readerProjection.cursor,
          session: activeSession,
          records,
        });
        if (refreshDecision === "conflict") {
          stopSafely(
            "Projection V3 không còn là phần mở rộng bất biến của Reader session đã nhận.",
          );
          return () => {
            active = false;
          };
        }
        if (refreshDecision === "refresh") {
          setPhase("loading");
          void adoptActiveReaderSessionFromCachedProjection({
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
                "Không thể cập nhật Reader anchor từ projection V3 mới hơn.",
              );
            }
          });
          return () => {
            active = false;
          };
        }
      }
      void applySession(dependency, binding).catch(() => {
        if (active) {
          stopSafely(
            "Không thể kiểm chứng form Reader do máy chủ đóng băng.",
          );
        }
      });
      return () => {
        active = false;
      };
    }

    const currentDependencies = records.filter(
      (record): record is QueuedReaderSessionDependency => {
        if (record.resetEpoch !== progress.resetEpoch) return false;
        if (
          record.kind !== "reader-session-open"
          && record.kind !== "projected-reader-session-anchor"
        ) return false;
        const currentScope = record.kind === "reader-session-open"
          ? record.command.enrollmentId === progress.enrollmentId
            && record.command.contentVersion === progress.contentVersion
          : record.binding.enrollmentId === progress.enrollmentId
            && record.binding.contentVersion === progress.contentVersion;
        if (!currentScope) return false;
        const terminal = terminalForSession(records, record);
        if (!terminal || terminal.status !== "acknowledged") return true;
        return terminal.kind === "reader-session-abandon"
          && terminal.command.reason === "support-requested"
          && supportSuccessor(records, terminal) === null;
      },
    );
    if (currentDependencies.length > 1) {
      stopSafely(
        "Có nhiều Reader dependency chưa kết thúc trong enrollment hiện tại.",
      );
      return () => {
        active = false;
      };
    }
    const dependency = currentDependencies[0] ?? null;
    if (!dependency) {
      const latestTerminal = newestRecord(records.filter(
        (record): record is QueuedReaderTerminal =>
          (
            record.kind === "reader-session-submit"
            || record.kind === "reader-session-abandon"
          )
          && record.resetEpoch === progress.resetEpoch
          && record.status === "acknowledged",
      ));
      if (latestTerminal) {
        const parent = records.find(
          (record): record is QueuedReaderSessionDependency =>
            (
              record.kind === "reader-session-open"
              || record.kind === "projected-reader-session-anchor"
            )
            && record.recordKey === latestTerminal.dependencyRecordKey,
        ) ?? null;
        const binding = parent ? authorityBindingForSession(parent) : null;
        const bindingIsCurrent = Boolean(
          binding
          && binding.enrollmentId === progress.enrollmentId
          && binding.resetEpoch === progress.resetEpoch
          && binding.contentVersion === progress.contentVersion,
        );
        if (
          latestTerminal.kind === "reader-session-submit"
          && parent
          && binding
          && bindingIsCurrent
          && readerSubmissionReceiptMatchesSessionBinding(
            latestTerminal.receipt,
            binding,
            latestTerminal.commandId,
          )
        ) {
          setSessionDependency(parent);
          setSessionBinding(binding);
          setProjectedAttempts(projectedAttemptsForSession(parent));
          setResult(latestTerminal.receipt);
          setError(null);
          setPhase("result");
          return () => {
            active = false;
          };
        }
        if (
          latestTerminal.kind === "reader-session-abandon"
          && latestTerminal.command.reason !== "support-requested"
          && binding
          && bindingIsCurrent
          && readerAbandonmentReceiptMatchesSessionBinding(
            latestTerminal.receipt,
            binding,
            latestTerminal.commandId,
            latestTerminal.command.reason,
          )
        ) {
          setResult(null);
          setError(null);
          setPhase("abandoned");
          return () => {
            active = false;
          };
        }
      }
      setSessionDependency(null);
      setSessionBinding(null);
      setProjectedAttempts([]);
      setCommandIds(null);
      setResult(null);
      setError(null);
      setPhase("briefing");
      return () => {
        active = false;
      };
    }
    if (dependency.status === "quarantined") {
      stopSafely(
        dependency.quarantineReason
          ?? "Lệnh mở Reader đã bị máy chủ từ chối vĩnh viễn.",
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
      stopSafely("Receipt mở Reader bị thiếu hoặc không hợp lệ.");
      return () => {
        active = false;
      };
    }
    void applySession(dependency, binding).catch(() => {
      if (active) {
        stopSafely(
          "Không thể kiểm chứng form Reader do máy chủ đóng băng.",
        );
      }
    });
    return () => {
      active = false;
    };
  }, [
    awaitingPosition,
    exactAuthority,
    ownerGeneration,
    progress,
    queueAssistedReopen,
    readerProjection,
    records,
    refreshRecords,
  ]);

  const startReader = useCallback(async () => {
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
      if (!environment) throw new Error("owner-scope-changed");
      const input = await buildNormalizedReaderSessionOpenQueueInput({
        storyId: CURRENT_READER_STORY_ID,
        script: CURRENT_READER_SCRIPT,
        supportMode: "unassisted",
        authoritativeProgress: progress,
        environment,
        openCommandId: openCommandIdRef.current,
        enqueuedAt: new Date().toISOString(),
      });
      await enqueueReaderSessionCommand(input);
      setPhase("opening");
      await syncAndRefresh();
    } catch {
      setError(
        "Không thể mở Reader trong đúng enrollment hiện tại. Kho nội dung có thể vẫn chưa đủ điều kiện phát hành.",
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
    const activeSession = readerProjection?.activeReaderSession;
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
      await adoptActiveReaderSessionFromCachedProjection({
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
        "Không thể nhận Reader session từ projection V3 đúng owner/reset.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [busy, readEnvironment, readerProjection, refreshRecords]);

  const recordAnswer = useCallback(async () => {
    if (
      busy
      || attemptState !== "idle"
      || !sessionBinding
      || !sessionDependency
      || !commandIds
      || !selected
    ) return;
    const position = index;
    setBusy(true);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      const context: NormalizedReaderSessionQueueContextV1 = {
        schemaVersion: 1,
        commandSeed: commandSeedForSession(sessionDependency),
        binding: sessionBinding,
      };
      if (
        commandIds.commandSeed !== context.commandSeed
        || commandIds.sessionAlias !== sessionDependency.sessionAlias
      ) {
        throw new Error("runtime-binding-changed");
      }
      const input = await buildNormalizedReaderSessionAttemptQueueInput(
        context,
        environment,
        {
          position,
          selectedOption: selected,
          durationMs: Math.min(
            600_000,
            Math.max(0, Date.now() - attemptStartedAt),
          ),
          occurredAt: new Date().toISOString(),
        },
      );
      await enqueueReaderAttemptCommand(input);
      setAwaitingPosition(position);
      setAttemptState("pending");
      setSelected(null);
      await syncAndRefresh();
    } catch {
      setError(
        "Lựa chọn chưa thể gắn vào đúng Reader session. Giao diện không tự chấm kết quả.",
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
    selected,
    sessionBinding,
    sessionDependency,
    syncAndRefresh,
  ]);

  const coverageSnapshot = useMemo(() => {
    if (
      !records
      || !sessionBinding
      || !sessionDependency
      || !commandIds
    ) return null;
    return deriveExactReaderCoverage({
      binding: sessionBinding,
      commandSeed: commandSeedForSession(sessionDependency),
      commandIds,
      sessionAlias: sessionDependency.sessionAlias,
      projectedAttempts,
      localAttempts: activeLocalAttempts(records, sessionDependency),
    });
  }, [
    commandIds,
    projectedAttempts,
    records,
    sessionBinding,
    sessionDependency,
  ]);

  const submitReader = useCallback(async () => {
    if (
      busy
      || !sessionBinding
      || !sessionDependency
      || !records
      || !coverageSnapshot?.ok
      || !coverageSnapshot.complete
    ) return;
    setBusy(true);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      const context: NormalizedReaderSessionQueueContextV1 = {
        schemaVersion: 1,
        commandSeed: commandSeedForSession(sessionDependency),
        binding: sessionBinding,
      };
      const input = await buildNormalizedReaderSessionSubmissionQueueInput(
        context,
        environment,
        new Date().toISOString(),
        coverageSnapshot.localAcknowledgedPositions,
      );
      await enqueueReaderSessionSubmissionCommand(input);
      setAwaitingPosition(null);
      setPhase("submitting");
      await syncAndRefresh();
    } catch {
      setError(
        "Chỉ có thể nộp Reader khi mọi vị trí có receipt server chính xác.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    coverageSnapshot,
    readEnvironment,
    records,
    sessionBinding,
    sessionDependency,
    syncAndRefresh,
  ]);

  const continueReader = useCallback(() => {
    if (
      attemptState !== "recorded"
      || !sessionBinding
      || !coverageSnapshot?.ok
    ) return;
    const covered = new Set(coverageSnapshot.coveredPositions);
    const nextPosition = sessionBinding.form.items.findIndex(
      (_item, position) => !covered.has(position),
    );
    if (nextPosition < 0) {
      void submitReader();
      return;
    }
    setAwaitingPosition(null);
    setSelected(null);
    setIndex(nextPosition);
    setAttemptState("idle");
    setAttemptStartedAt(Date.now());
  }, [
    attemptState,
    coverageSnapshot,
    sessionBinding,
    submitReader,
  ]);

  const abandonReader = useCallback(async (
    reason: "user-exit" | "support-requested",
  ) => {
    if (
      busy
      || !sessionBinding
      || !sessionDependency
    ) return;
    setBusy(true);
    setAbandonModalOpen(false);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      const context: NormalizedReaderSessionQueueContextV1 = {
        schemaVersion: 1,
        commandSeed: commandSeedForSession(sessionDependency),
        binding: sessionBinding,
      };
      const input = await buildNormalizedReaderSessionAbandonmentQueueInput(
        context,
        environment,
        reason,
        new Date().toISOString(),
      );
      await enqueueReaderSessionAbandonmentCommand(input);
      setPhase(
        reason === "support-requested"
          ? "support-transition"
          : "abandoning",
      );
      await syncAndRefresh();
    } catch {
      setError(
        "Không thể dừng đúng Reader session hiện tại; không có trạng thái hoàn tất nào được suy đoán.",
      );
      setPhase("error");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    readEnvironment,
    sessionBinding,
    sessionDependency,
    syncAndRefresh,
  ]);

  if (!CURRENT_CONTENT_CLOSED_ALPHA_ELIGIBLE) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <ShieldCheck size={44} />
        <span>SERVER READER · RELEASE FENCE ACTIVE</span>
        <h1>Reader xác thực chưa được phát hành</h1>
        <p>
          Gói hiện tại chưa qua promotion và linguistic review. Nội dung công
          khai chỉ còn là practice local, không được dùng làm mastery evidence.
        </p>
        <Link className="primary-button" to="/path">
          <ArrowLeft size={17} /> Tiếp tục lộ trình đã mở
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
        <h1>Đang kiểm chứng Reader session</h1>
        <p>
          Hệ thống đang đối chiếu owner, reset epoch, enrollment và projection
          V3 trước khi hiển thị form.
        </p>
      </div>
    );
  }

  if (phase === "briefing") {
    return (
      <div className="assessment-intro authenticated-reader-intro">
        <div className="assessment-core">
          <BookOpenText size={38} />
          <span />
        </div>
        <span className="system-kicker">
          SERVER-AUTHORITATIVE · ANSWER-FREE FORM
        </span>
        <h1>Reader Session V1</h1>
        <p>
          Máy chủ phát đoạn đọc và lựa chọn không kèm đáp án. Mỗi lựa chọn phải
          có receipt trước khi sang câu khác; trình duyệt không tự chấm và không
          tự mở khóa bài học.
        </p>
        <div className="assessment-facts">
          <span>
            <ShieldCheck size={18} />
            <strong>Form đóng băng</strong>
            <small>SHA-256 binding</small>
          </span>
          <span>
            <BookOpenText size={18} />
            <strong>Reading riêng biệt</strong>
            <small>không suy kỹ năng khác</small>
          </span>
          <span>
            <Headphones size={18} />
            <strong>Support minh bạch</strong>
            <small>đổi phiên trước khi nghe</small>
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
            onClick={() => void startReader()}
          >
            Mở phiên không hỗ trợ <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (phase === "remote-session") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <ShieldCheck size={44} />
        <h1>Có Reader session đang mở trên thiết bị khác</h1>
        <p>
          Chỉ projection V3 đã cache cho đúng owner/reset mới được nhận vào
          thiết bị này. Thao tác không mở phiên mới và không tải đáp án.
        </p>
        <div className="assessment-actions">
          <Link className="secondary-button" to="/path">
            Để phiên ở thiết bị kia
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
    || phase === "support-transition"
  ) {
    const copy = phase === "opening"
      ? {
          title: "Đang chờ máy chủ phát form",
          description:
            "Không có nội dung hoặc đáp án local nào được dùng trong lúc chờ.",
        }
      : phase === "submitting"
        ? {
            title: "Đang nộp Reader session",
            description:
              "Máy chủ đang kiểm tra coverage và form hash trước khi trả kết quả.",
          }
        : phase === "support-transition"
          ? {
              title: "Đang chuyển sang phiên có hỗ trợ",
              description:
                "Phiên không hỗ trợ phải được máy chủ xác nhận dừng trước khi TTS trình duyệt được bật.",
            }
          : {
              title: "Đang dừng Reader session",
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
        <h1>Reader session đã dừng</h1>
        <p>
          Máy chủ đã xác nhận dừng phiên. Phần chưa hoàn tất không tạo kết quả,
          XP, mastery hay thay đổi prerequisite.
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
        <h1>Reader session đã dừng an toàn</h1>
        <p>{error ?? "Authority của phiên không còn khớp dữ liệu hiện tại."}</p>
        <div className="assessment-actions">
          <Link className="secondary-button" to="/path">
            Trở lại lộ trình
          </Link>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              supportReopenInFlight.current.clear();
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
    const eligibleCount = result.results.filter(
      (item) => item.masteryEligible,
    ).length;
    return (
      <div className="assessment-result authenticated-reader-result">
        <div className="result-sigil observed">
          <BookOpenText size={38} />
          <span />
        </div>
        <span className="system-kicker">
          SERVER-SCORED · READING ONLY
        </span>
        <h1>Kết quả Reader session</h1>
        <div className="assessment-score">
          <strong>{result.correctCount}/{result.attemptCount}</strong>
          <span> · {result.score}%</span>
        </div>
        <p>
          Máy chủ đã chấm đúng form bất biến. Chỉ {eligibleCount} mục đáp ứng
          policy first-exposure/unassisted; kết quả đọc không được suy thành
          nghe, nói, viết hay tự động mở khóa lộ trình.
        </p>
        <div
          className="assessment-observation-list"
          aria-label="Kết quả từng mục Reader"
        >
          {result.results.map((item) => (
            <div key={item.itemVersion}>
              <span>Mục {item.position + 1}</span>
              <strong>
                {item.correct ? "Đúng" : "Chưa đúng"}
                {" · "}
                {item.masteryEligible
                  ? "đủ điều kiện evidence"
                  : "practice-only"}
              </strong>
            </div>
          ))}
        </div>
        <div className="assessment-actions">
          <Link className="primary-button" to="/path">
            Tiếp tục lộ trình hiện có <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    );
  }

  const currentItem = sessionBinding?.form.items[index] ?? null;
  if (
    phase !== "exercise"
    || !sessionBinding
    || !sessionDependency
    || !commandIds
    || !currentItem
    || !coverageSnapshot?.ok
  ) {
    return (
      <div className="lesson-state-screen" role="alert">
        <AlertTriangle size={44} />
        <h1>Form Reader không còn hợp lệ</h1>
        <p>
          Phiên bị loại khỏi giao diện để tránh ghi lựa chọn vào một form khác.
        </p>
        <Link className="primary-button" to="/path">
          Trở lại lộ trình
        </Link>
      </div>
    );
  }

  const coveredCount = coverageSnapshot.coveredPositions.length;
  const progressPercent = Math.round(
    (coveredCount / sessionBinding.expectedItemCount) * 100,
  );
  const recordedOutcome = coverageSnapshot.outcomes.find(
    (outcome) => outcome.position === index,
  )?.outcome ?? null;
  const allAttemptsRecorded = coverageSnapshot.complete;
  const assisted = sessionBinding.supportMode === "assisted";

  return (
    <>
      <div className="assessment-live authenticated-reader-live">
        <header>
          <button
            className="icon-button"
            type="button"
            aria-label="Dừng Reader session"
            onClick={() => setAbandonModalOpen(true)}
          >
            <X size={20} />
          </button>
          <div
            role="progressbar"
            aria-label="Tiến độ Reader đã được máy chủ ghi nhận"
            aria-valuemin={0}
            aria-valuemax={sessionBinding.expectedItemCount}
            aria-valuenow={coveredCount}
            aria-valuetext={`${coveredCount} trên ${sessionBinding.expectedItemCount} mục đã được ghi nhận`}
          >
            <i style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{coveredCount}/{sessionBinding.expectedItemCount}</span>
        </header>

        <section className="assessment-question authenticated-reader-question">
          <span className="system-kicker">
            <BookOpenText size={15} />
            {" "}
            {assisted
              ? "ASSISTED · PRACTICE-ONLY"
              : "UNASSISTED · SERVER FORM"}
          </span>
          <h1
            className="reader-server-stimulus"
            ref={questionHeadingRef}
            tabIndex={-1}
          >
            {currentItem.chineseStimulus}
          </h1>
          <h2>{currentItem.prompt}</h2>

          <div className="reader-support-control">
            {assisted ? (
              <>
                <button
                  className="secondary-button"
                  disabled={attemptState === "pending" || busy}
                  type="button"
                  onClick={() => speakMandarin(
                    currentItem.chineseStimulus,
                    0.76,
                  )}
                >
                  <Volume2 size={17} /> Nghe TTS trình duyệt
                </button>
                <small>
                  Audio tổng hợp là hỗ trợ; phiên này không đủ điều kiện mastery.
                </small>
              </>
            ) : (
              <>
                <button
                  className="secondary-button"
                  disabled={attemptState === "pending" || busy}
                  type="button"
                  onClick={() => void abandonReader("support-requested")}
                >
                  <Headphones size={17} /> Cần nghe hỗ trợ
                </button>
                <small>
                  Yêu cầu này sẽ dừng phiên hiện tại rồi mở một phiên assisted.
                </small>
              </>
            )}
          </div>

          <div
            className="assessment-options"
            role="radiogroup"
            aria-label={`Các lựa chọn cho mục Reader ${index + 1}`}
          >
            {currentItem.options.map((option, optionIndex) => (
              <button
                className={selected === option ? "selected" : ""}
                disabled={attemptState !== "idle" || busy}
                key={option}
                role="radio"
                aria-checked={selected === option}
                tabIndex={
                  selected === option || (!selected && optionIndex === 0)
                    ? 0
                    : -1
                }
                type="button"
                onClick={() => setSelected(option)}
                onKeyDown={(event) => handleRadioGroupKeyDown(event, {
                  currentIndex: optionIndex,
                  itemCount: currentItem.options.length,
                  onSelect: (nextIndex) => setSelected(
                    currentItem.options[nextIndex]!,
                  ),
                })}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>
                <strong>{option}</strong>
              </button>
            ))}
          </div>
        </section>

        <footer className={
          recordedOutcome === "correct"
            ? "correct"
            : recordedOutcome === "incorrect"
              ? "wrong"
              : ""
        }>
          <div role="status" aria-live="polite" aria-atomic="true">
            {attemptState === "recorded" && recordedOutcome ? (
              <>
                <strong>
                  {recordedOutcome === "correct"
                    ? <><CheckCircle2 size={17} /> Máy chủ ghi nhận đúng</>
                    : <><XCircle size={17} /> Máy chủ ghi nhận chưa đúng</>}
                </strong>
                <p>
                  Receipt không chứa đáp án đúng. Kết quả chỉ thuộc kỹ năng đọc
                  và policy của mục này.
                </p>
              </>
            ) : attemptState === "pending" ? (
              <>
                <strong>Đang chờ receipt</strong>
                <p>
                  Lựa chọn đã vào hàng đợi bền vững; giao diện không tự chấm.
                </p>
              </>
            ) : (
              <p>Chọn phương án rồi gửi để máy chủ chấm đúng form.</p>
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
              if (attemptState === "recorded") continueReader();
              else void recordAnswer();
            }}
          >
            {attemptState === "recorded"
              ? allAttemptsRecorded
                ? "Nộp phiên"
                : "Mục tiếp theo"
              : attemptState === "pending"
                ? "Đang ghi nhận"
                : "Gửi lựa chọn"}
            <ArrowRight size={17} />
          </button>
        </footer>
      </div>

      <ConfirmModal
        open={abandonModalOpen}
        title="Dừng Reader session?"
        description="Máy chủ sẽ đánh dấu đúng phiên này là đã dừng. Phần chưa hoàn tất không tạo kết quả hay mastery."
        eyebrow="SESSION CONTROL"
        cancelLabel="Tiếp tục đọc"
        confirmLabel="Dừng đúng phiên này"
        busy={busy}
        onCancel={() => setAbandonModalOpen(false)}
        onConfirm={() => void abandonReader("user-exit")}
      />
    </>
  );
}
