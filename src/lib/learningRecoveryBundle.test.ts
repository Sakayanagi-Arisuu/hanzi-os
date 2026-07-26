import { describe, expect, it } from "vitest";
import { parseLearningStateImport } from "./learningStateImport";
import {
  createLearningRecoveryBundle,
  getAccountDeletionReadiness,
  serializeLearningStateSnapshot,
} from "./learningRecoveryBundle";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";

describe("client learning recovery bundle", () => {
  it("contains pending projection metadata and local-only speech evidence", () => {
    const state = structuredClone(INITIAL_LEARNING_STATE);
    state.evidence.push({
      id: "speech:1",
      idempotencyKey: "speech:1",
      schemaVersion: 1,
      contentVersion: state.contentVersion,
      activityVersion: "speech:1",
      source: "pronunciation",
      method: "speech-transcript",
      activityId: "speech:1",
      skill: "speaking",
      outcome: "unverified",
      score: 80,
      verified: false,
      masteryEligible: false,
      occurredAt: "2026-07-20T00:00:00.000Z",
    });

    const bundle = createLearningRecoveryBundle({
      state,
      syncPhase: "offline",
      pendingCount: 2,
      normalizedPendingCount: 3,
      normalizedQuarantinedCount: 1,
      exportedAt: "2026-07-20T01:00:00.000Z",
    });

    expect(bundle.recovery).toEqual({
      syncPhase: "offline",
      pendingChanges: 2,
      normalizedPendingCommands: 3,
      normalizedQuarantinedCommands: 1,
      localOnlyEvidence: 1,
      includesCurrentLocalProjection: true,
    });
    expect(bundle.learning.document.state.evidence).toHaveLength(1);
    expect(parseLearningStateImport(bundle, INITIAL_LEARNING_STATE).ok).toBe(true);
  });

  it("requires a clean sync and a backup of the current state before deletion", () => {
    const currentSnapshot = serializeLearningStateSnapshot(INITIAL_LEARNING_STATE);
    const base = {
      authenticated: true,
      syncPhase: "synced" as const,
      pendingCount: 0,
      normalizedPendingCount: 0,
      normalizedQuarantinedCount: 0,
      currentSnapshot,
      exportedSnapshot: currentSnapshot,
    };

    expect(getAccountDeletionReadiness(base)).toEqual({ ready: true, reason: null });
    expect(getAccountDeletionReadiness({ ...base, pendingCount: 1 })).toEqual({
      ready: false,
      reason: "pending-sync",
    });
    expect(getAccountDeletionReadiness({
      ...base,
      normalizedPendingCount: 1,
    })).toEqual({
      ready: false,
      reason: "pending-normalized-commands",
    });
    expect(getAccountDeletionReadiness({
      ...base,
      normalizedQuarantinedCount: 1,
    })).toEqual({
      ready: false,
      reason: "quarantined-normalized-commands",
    });
    expect(getAccountDeletionReadiness({ ...base, syncPhase: "offline" })).toEqual({
      ready: false,
      reason: "not-synced",
    });
    expect(getAccountDeletionReadiness({ ...base, exportedSnapshot: null })).toEqual({
      ready: false,
      reason: "backup-required",
    });
  });
});
