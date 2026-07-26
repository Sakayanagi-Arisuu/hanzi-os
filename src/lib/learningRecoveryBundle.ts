import type { LearningState } from "../types";
import type { SyncPhase } from "../sync/coordinator";

export type LearningRecoveryBundle = {
  exportSchemaVersion: 2;
  product: "HANZI.OS";
  source: "client-recovery";
  exportedAt: string;
  learning: {
    document: {
      state: LearningState;
    };
  };
  recovery: {
    syncPhase: SyncPhase;
    pendingChanges: number;
    normalizedPendingCommands: number;
    normalizedQuarantinedCommands: number;
    localOnlyEvidence: number;
    includesCurrentLocalProjection: true;
  };
};

type RecoveryBundleOptions = {
  state: LearningState;
  syncPhase: SyncPhase;
  pendingCount: number;
  normalizedPendingCount?: number;
  normalizedQuarantinedCount?: number;
  exportedAt?: string;
};

export const serializeLearningStateSnapshot = (state: LearningState) =>
  JSON.stringify(state);

export const createLearningRecoveryBundle = ({
  state,
  syncPhase,
  pendingCount,
  normalizedPendingCount = 0,
  normalizedQuarantinedCount = 0,
  exportedAt = new Date().toISOString(),
}: RecoveryBundleOptions): LearningRecoveryBundle => ({
  exportSchemaVersion: 2,
  product: "HANZI.OS",
  source: "client-recovery",
  exportedAt,
  learning: {
    document: { state },
  },
  recovery: {
    syncPhase,
    pendingChanges: pendingCount,
    normalizedPendingCommands: normalizedPendingCount,
    normalizedQuarantinedCommands: normalizedQuarantinedCount,
    localOnlyEvidence: state.evidence.filter(
      (evidence) => evidence.method === "speech-transcript",
    ).length,
    includesCurrentLocalProjection: true,
  },
});

export type AccountDeletionReadiness =
  | { ready: true; reason: null }
  | {
      ready: false;
      reason:
        | "not-authenticated"
        | "pending-sync"
        | "pending-normalized-commands"
        | "quarantined-normalized-commands"
        | "not-synced"
        | "backup-required";
    };

type AccountDeletionReadinessOptions = {
  authenticated: boolean;
  syncPhase: SyncPhase;
  pendingCount: number;
  normalizedPendingCount?: number;
  normalizedQuarantinedCount?: number;
  currentSnapshot: string;
  exportedSnapshot: string | null;
};

export const getAccountDeletionReadiness = ({
  authenticated,
  syncPhase,
  pendingCount,
  normalizedPendingCount = 0,
  normalizedQuarantinedCount = 0,
  currentSnapshot,
  exportedSnapshot,
}: AccountDeletionReadinessOptions): AccountDeletionReadiness => {
  if (!authenticated) return { ready: false, reason: "not-authenticated" };
  if (normalizedQuarantinedCount > 0) {
    return { ready: false, reason: "quarantined-normalized-commands" };
  }
  if (normalizedPendingCount > 0) {
    return { ready: false, reason: "pending-normalized-commands" };
  }
  if (pendingCount > 0) return { ready: false, reason: "pending-sync" };
  if (syncPhase !== "synced") return { ready: false, reason: "not-synced" };
  if (exportedSnapshot !== currentSnapshot) {
    return { ready: false, reason: "backup-required" };
  }
  return { ready: true, reason: null };
};
