import { describe, expect, it } from "vitest";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import { createPlacementBaseline, evaluatePlacementSafety, PLACEMENT_MAX_AGE_MS } from "./placementSafety";
import { applyAcceptedDiagnosticPlacement, applySkippedDiagnostic } from "../lib/diagnosticCompletion";
import { getOwnedPlacementStorageKey, getPlacementGateSessionStorageKey } from "../lib/storageKeys";
import { resolvePlacementResumeDestination } from "./placementResume";

const now = Date.parse("2026-10-06T03:00:00Z");
const owner = "anonymous:placement-test";
const fresh = () => structuredClone(INITIAL_LEARNING_STATE);

describe("placement lifetime and learning conflict", () => {
  it("expires from the original start even if the session was recently opened", () => {
    const state = fresh();
    const baseline = createPlacementBaseline(state, owner, now);
    expect(evaluatePlacementSafety(baseline, state, owner, now + PLACEMENT_MAX_AGE_MS - 1)).toBe("current");
    expect(evaluatePlacementSafety(baseline, state, owner, now + PLACEMENT_MAX_AGE_MS)).toBe("expired");
    expect(evaluatePlacementSafety({ ...baseline, startedAt: NaN }, state, owner, now)).toBe("expired");
    expect(evaluatePlacementSafety(baseline, state, owner, now - 1)).toBe("expired");
  });
  it("rejects legacy sessions, different owners and learning completed since starting", () => {
    const state = fresh();
    const baseline = createPlacementBaseline(state, owner, now);
    expect(evaluatePlacementSafety(undefined, state, owner, now)).toBe("legacy");
    expect(evaluatePlacementSafety(baseline, state, "account:other", now)).toBe("owner-changed");
    state.completedLessons["boot-1"] = { score: 90, bestScore: 90, attempts: 1, completedAt: new Date(now).toISOString() };
    expect(evaluatePlacementSafety(baseline, state, owner, now)).toBe("learning-changed");
  });
  it("does not count its own diagnostic answers as a learning conflict", () => {
    const state = fresh();
    const baseline = createPlacementBaseline(state, owner, now);
    state.evidence.push({ id: "d", idempotencyKey: "d", schemaVersion: 1, contentVersion: state.contentVersion, activityVersion: "v1", source: "diagnostic", method: "diagnostic-selection", activityId: "d", skill: "reading", outcome: "correct", score: 100, verified: false, masteryEligible: false, occurredAt: new Date(now).toISOString() });
    expect(evaluatePlacementSafety(baseline, state, owner, now)).toBe("current");
  });
  it("keeps path, completion, FSRS, mistakes and evidence for returning learners", () => {
    const state = fresh();
    state.profile.startingLevel = "hsk3";
    state.reviewCount = 2;
    state.streak = 14;
    state.savedWords = ["existing-word"];
    state.diagnostic.recommendedLessonId = "existing-lesson";
    for (const result of [applyAcceptedDiagnosticPlacement(state, "zero", 10), applySkippedDiagnostic(state)]) {
      expect(result.profile.startingLevel).toBe("hsk3");
      expect(result.diagnostic.recommendedLessonId).toBe("existing-lesson");
      for (const key of ["completedLessons", "fsrsCards", "mistakes", "evidence", "savedWords", "streak", "xp"] as const) expect(result[key]).toEqual(state[key]);
    }
    const account = fresh();
    account.profile.startingLevel = "basic";
    expect(applyAcceptedDiagnosticPlacement(account, "hsk4", 100, undefined, undefined, true).profile.startingLevel).toBe("basic");
  });
  it("only offers current owner-bound resumes with unchanged page context", () => {
    const state = fresh();
    const key = getPlacementGateSessionStorageKey("hanzi-os-hsk1-level-check-session-v1");
    const record = { version: 1, formVersion: "form:placement-gate-v1", bankId: "bank:placement-gate-v1", sessionId: "s", phase: "question", index: 1, checked: false, answers: { a: "unknown" }, updatedAt: now, baseline: { ...createPlacementBaseline(state, owner, now), contextSnapshot: "pages-before" } };
    const read = (requested: string) => requested === getOwnedPlacementStorageKey(key, owner) ? JSON.stringify(record) : null;
    const context = { state, ownerKey: owner, now, contextSnapshot: "pages-before" };
    expect(resolvePlacementResumeDestination(read, context)?.questionNumber).toBe(2);
    expect(resolvePlacementResumeDestination(read, { ...context, contextSnapshot: "pages-after" })).toBeNull();
    expect(resolvePlacementResumeDestination(read, { ...context, now: now + PLACEMENT_MAX_AGE_MS })).toBeNull();
    expect(resolvePlacementResumeDestination(read, { ...context, ownerKey: "other" })).toBeNull();
  });
});
