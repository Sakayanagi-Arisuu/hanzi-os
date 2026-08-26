import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  RefreshCw,
  ShieldCheck,
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
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_VERSION,
} from "../content/currentContentIdentity";
import {
  CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE,
} from "../content/clientContentAvailability";
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
import { speakMandarin } from "../lib/speech";
import {
  deriveExactReaderCoverage,
} from "../reader/normalizedReaderUiCoverage";
import {
  ReaderExperience,
  type ReaderJourneyStage,
} from "../reader/ReaderExperience";
import { FIRST_DAY_READER_PRESENTATION } from "../reader/readerPresentationContent";
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
const CURRENT_READER_STORY = FIRST_DAY_READER_PRESENTATION;

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
  const { state, actions, sync } = useLearning();
  const authority = useNormalizedLearningProjection();
  const refreshProjection = authority.refresh;
  const [records, setRecords] =
    useState<LearningCommandOutboxRecord[] | null>(null);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [phase, setPhase] = useState<ReaderRuntimePhase>("loading");
  const [journeyStage, setJourneyStage] =
    useState<ReaderJourneyStage>("shelf");
  const [usedSupport, setUsedSupport] = useState(false);
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
      !CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE
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
          "Không thể khôi phục trang đọc của tài khoản này.",
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
    let active = true;
    if (
      !CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE
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
          "Nội dung trang đọc đã thay đổi. Hãy mở lại để tiếp tục an toàn.",
        );
        return;
      }

      const terminal = terminalForSession(records, dependency);
      if (terminal) {
        if (terminal.status === "quarantined") {
          stopSafely(
            terminal.quarantineReason
              ?? "Lượt đọc này không còn tiếp tục được.",
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
              "Kết quả trả về chưa đủ để xác nhận lượt đọc.",
            );
            return;
          }
          setResult(terminal.receipt);
          setSessionDependency(dependency);
          setSessionBinding(binding);
          setProjectedAttempts(projectedAttemptsForSession(dependency));
          setError(null);
          setJourneyStage("result");
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
            "Trang đọc chưa thể khép lại an toàn.",
          );
          return;
        }
        if (terminal.command.reason === "support-requested") {
          const successor = supportSuccessor(records, terminal);
          if (successor) {
            if (successor.status === "quarantined") {
              stopSafely(
                successor.quarantineReason
                  ?? "Chưa thể mở lại trang đọc với phần hỗ trợ.",
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
          "Phiên đọc hiện tại đã thay đổi. Hãy mở lại câu chuyện.",
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
            ?? "Tiến độ câu chuyện không còn khớp với trang đang mở.",
        );
        return;
      }

      const coveredPositions = new Set(coverage.coveredPositions);
      const pendingPosition = coverage.pendingPositions[0] ?? null;
      if (coveredPositions.size > 0 || pendingPosition !== null) {
        setJourneyStage("checkpoint");
      }
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
          "Trang đọc trên thiết bị này không còn khớp với tiến độ mới nhất.",
        );
        return () => {
          active = false;
        };
      }
      if (candidates.length > 1) {
        stopSafely(
          "Có nhiều trang đọc dở cùng lúc. Hãy kiểm tra lại để chọn đúng trang.",
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
          "Trang đọc đã được trả lời trên thiết bị khác; lựa chọn ở đây chưa được gộp.",
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
            "Tiến độ mới nhất không còn nối tiếp đúng trang đọc đang mở.",
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
                "Chưa thể cập nhật tiến độ đọc mới nhất trên thiết bị này.",
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
            "Chưa thể kiểm tra tính toàn vẹn của trang đọc.",
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
        "Có nhiều lượt đọc dở. Hãy kiểm tra lại trước khi tiếp tục.",
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
          ?? "Câu chuyện này hiện chưa thể mở.",
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
      stopSafely("Trang đọc chưa nhận được dữ liệu xác nhận hợp lệ.");
      return () => {
        active = false;
      };
    }
    void applySession(dependency, binding).catch(() => {
      if (active) {
        stopSafely(
          "Chưa thể kiểm tra tính toàn vẹn của trang đọc.",
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
      || !CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE
      || !exactAuthority
      || !progress
    ) return;
    setJourneyStage("reading");
    setBusy(true);
    setError(null);
    try {
      const environment = await readEnvironment();
      if (!environment) throw new Error("owner-scope-changed");
      const input = await buildNormalizedReaderSessionOpenQueueInput({
        storyId: CURRENT_READER_STORY_ID,
        script: CURRENT_READER_SCRIPT,
        supportMode: "assisted",
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
        "Chưa thể mở câu chuyện cho lộ trình hiện tại. Hãy thử lại sau.",
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
      || !CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE
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
        "Chưa thể tiếp tục trang đọc từ thiết bị khác.",
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
        "Lựa chọn chưa được ghi nhận an toàn nên chưa thể chấm kết quả.",
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
        "Một vài lựa chọn chưa được xác nhận nên chưa thể hiện kết quả.",
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
        "Trang đọc chưa thể khép lại an toàn. Tiến độ hiện có vẫn được giữ nguyên.",
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

  if (!CURRENT_CLIENT_CLOSED_ALPHA_AVAILABLE) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <ShieldCheck size={44} />
        <span>VẠN QUYỂN CÁC</span>
        <h1>Câu chuyện này chưa sẵn sàng</h1>
        <p>
          Bạn vẫn có thể tiếp tục lộ trình hiện tại; câu chuyện sẽ xuất hiện khi
          hoàn tất biên tập.
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

  if (!CURRENT_READER_STORY) {
    return (
      <div className="lesson-state-screen" role="status">
        <BookOpenText size={44} />
        <h1>Chưa có câu chuyện phù hợp</h1>
        <p>Hãy quay lại sau khi thư khố có bản đọc dành cho cấp độ của bạn.</p>
        <Link className="primary-button" to="/path">Tiếp tục Thiên Lộ</Link>
      </div>
    );
  }

  if (phase === "loading" || records === null) {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <RefreshCw className="spin" size={44} />
        <h1>Đang mở cổng Vạn Quyển Các</h1>
        <p>
          Đang khôi phục đúng trang đọc và tiến độ gần nhất của bạn.
        </p>
      </div>
    );
  }

  if (phase === "briefing") {
    return (
      <ReaderExperience
        story={CURRENT_READER_STORY}
        stage={journeyStage === "briefing" ? "briefing" : "shelf"}
        savedWordIds={state.savedWords}
        supportUsed={usedSupport}
        busy={busy}
        scriptPreference={state.profile.script}
        onStageChange={setJourneyStage}
        onStart={() => void startReader()}
        onExit={() => setJourneyStage("shelf")}
        onSupportUsed={() => setUsedSupport(true)}
        onSpeak={speakMandarin}
        onToggleSavedWord={actions.toggleSavedWord}
        onRestart={() => setJourneyStage("briefing")}
      />
    );
  }

  if (phase === "remote-session") {
    return (
      <div className="lesson-state-screen" role="status" aria-live="polite">
        <BookOpenText size={44} />
        <h1>Trang đọc đang mở ở thiết bị khác</h1>
        <p>
          Bạn có thể tiếp tục chính trang đó tại đây mà không mất câu trả lời đã
          ghi nhận.
        </p>
        <div className="assessment-actions">
          <Link className="secondary-button" to="/path">
            Giữ trang ở thiết bị kia
          </Link>
          <button
            className="primary-button"
            disabled={busy}
            type="button"
            onClick={() => void adoptRemoteSession()}
          >
            Tiếp tục đọc tại đây <ArrowRight size={17} />
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
          title: "Đang mở trang thiên thư",
          description:
            "Các câu hỏi đang được chuẩn bị cho lượt đọc của bạn.",
        }
      : phase === "submitting"
        ? {
            title: "Đang đối chiếu lời giải",
            description:
              "Chỉ một khoảnh khắc nữa, kết quả toàn bộ mẩu chuyện sẽ hiện ra.",
          }
        : phase === "support-transition"
          ? {
              title: "Đang bật hỗ trợ nghe",
              description:
                "Trang đọc sẽ tiếp tục với giọng đọc tổng hợp của thiết bị.",
            }
          : {
              title: "Đang khép lại trang đọc",
              description:
                "Những câu chưa trả lời sẽ được để lại cho lượt luyện sau.",
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
        <h1>Trang đọc đã khép lại</h1>
        <p>
          Phần chưa hoàn tất không được tính vào kết quả và không ảnh hưởng tiến
          độ hiện có của bạn.
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
        <h1>Trang đọc tạm thời chưa thể mở</h1>
        <p>{error ?? "Dữ liệu lượt đọc đã thay đổi. Hãy kiểm tra lại để tiếp tục an toàn."}</p>
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
    return (
      <ReaderExperience
        story={CURRENT_READER_STORY}
        stage="result"
        result={{
          correctCount: result.correctCount,
          total: result.attemptCount,
          outcomes: result.results.map((item) => item.correct ? "correct" : "incorrect"),
        }}
        savedWordIds={state.savedWords}
        supportUsed={usedSupport}
        scriptPreference={state.profile.script}
        onStageChange={setJourneyStage}
        onStart={() => void startReader()}
        onExit={() => setJourneyStage("shelf")}
        onSupportUsed={() => setUsedSupport(true)}
        onSpeak={speakMandarin}
        onToggleSavedWord={actions.toggleSavedWord}
        onRestart={() => {
          openCommandIdRef.current =
            `reader-session-open:${crypto.randomUUID()}`;
          setSessionDependency(null);
          setSessionBinding(null);
          setProjectedAttempts([]);
          setCommandIds(null);
          setResult(null);
          setSelected(null);
          setIndex(0);
          setAttemptState("idle");
          setAwaitingPosition(null);
          setError(null);
          setUsedSupport(false);
          setJourneyStage("briefing");
          setPhase("briefing");
        }}
      />
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
        <h1>Trang đọc không còn đồng bộ</h1>
        <p>
          Hãy trở lại Thiên Lộ rồi mở lại để nhận đúng nội dung hiện tại.
        </p>
        <Link className="primary-button" to="/path">
          Trở lại lộ trình
        </Link>
      </div>
    );
  }

  const recordedOutcome = coverageSnapshot.outcomes.find(
    (outcome) => outcome.position === index,
  )?.outcome ?? null;

  return (
    <>
      <ReaderExperience
        story={CURRENT_READER_STORY}
        stage={journeyStage === "checkpoint" ? "checkpoint" : "reading"}
        checkpoint={journeyStage === "checkpoint" ? {
          label: currentItem.itemId.includes("main") ? "Ý chính" : "Chi tiết",
          position: index,
          total: sessionBinding.expectedItemCount,
          prompt: currentItem.prompt,
          options: currentItem.options,
          selected,
          state: attemptState,
          outcome: recordedOutcome,
        } : null}
        savedWordIds={state.savedWords}
        supportUsed={usedSupport}
        busy={busy}
        scriptPreference={state.profile.script}
        onStageChange={setJourneyStage}
        onStart={() => setJourneyStage("reading")}
        onExit={() => setAbandonModalOpen(true)}
        onSupportUsed={() => {
          setUsedSupport(true);
          if (sessionBinding.supportMode === "unassisted") {
            void abandonReader("support-requested");
          }
        }}
        onSpeak={speakMandarin}
        onToggleSavedWord={actions.toggleSavedWord}
        onSelectOption={setSelected}
        onSubmitOption={() => void recordAnswer()}
        onContinueCheckpoint={continueReader}
        onRestart={() => setJourneyStage("reading")}
      />

      <ConfirmModal
        open={abandonModalOpen}
        title="Khép lại trang đọc?"
        description="Những câu chưa trả lời sẽ không được tính vào kết quả. Bạn có thể bắt đầu một lượt mới sau đó."
        eyebrow="VẠN QUYỂN CÁC"
        cancelLabel="Tiếp tục đọc"
        confirmLabel="Khép lại"
        busy={busy}
        onCancel={() => setAbandonModalOpen(false)}
        onConfirm={() => void abandonReader("user-exit")}
      />
    </>
  );
}
