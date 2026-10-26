import { describe, expect, it } from "vitest";
import { LESSON_BY_ID } from "../data/curriculum";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import { recordEvidenceInState } from "../lib/evidence";
import { localLessonActivityProvenance, localLessonEvidenceMetadata, materializeLocalLessonRuntime } from "./localLessonRuntime";
import { guestLessonHistoryEvent, isLessonHistoryEvent, projectLessonHistory } from "./lessonHistory";

const eventFixture = () => {
  const lesson = LESSON_BY_ID.get("daily-1")!;
  const resolved = materializeLocalLessonRuntime(lesson, "simplified", "lesson-session:daily-1:history-fixture");
  if (!resolved.ok) throw new Error(resolved.reason);
  const activity = resolved.runtime.activities.find((entry) => entry.exercise.kind === "meaning")!;
  const provenance = localLessonActivityProvenance(resolved.runtime, activity.position)!;
  const result = recordEvidenceInState(INITIAL_LEARNING_STATE, {
    source: "lesson", method: "meaning-selection", activityId: activity.activityId,
    activityVersion: activity.activityVersion, skill: activity.exercise.skill, outcome: "incorrect", score: 0,
    idempotencyKey: `${resolved.runtime.sessionId}:answer:${activity.exercise.id}`,
    metadata: { ...localLessonEvidenceMetadata(provenance), usedHint: false, priorExposure: false },
  }, "2026-10-18T03:00:00.000Z");
  return guestLessonHistoryEvent({ ownerKey: "anonymous:history", resetEpoch: 3,
    installationId: "history-install", deviceId: "history-device", evidence: result.state.evidence.at(-1)! });
};

describe("versioned lesson observation contract", () => {
  it("keeps the real daily-1 runtime identity without granting completion/XP/mastery or exposing answers", () => {
    const before = JSON.stringify(INITIAL_LEARNING_STATE);
    const event = eventFixture();
    expect(isLessonHistoryEvent(event)).toBe(true);
    expect(event).toMatchObject({ schemaVersion: 1, sourceId: "daily-1", sourceLessonIds: ["daily-1"],
      outcome: "incorrect", authority: "local-practice", masteryEligible: false, duration: null,
      assistance: { hint: false, ime: null, priorExposure: false, tts: null }, humanReviewed: null });
    expect(JSON.stringify(event)).not.toContain("correctAnswer");
    expect(projectLessonHistory(event, [event, event])).toHaveLength(1);
    expect(JSON.stringify(INITIAL_LEARNING_STATE)).toBe(before);
  });

  it("uses owner/reset/operation identity and rejects unknown schemas, false authority and contradictory receipts", () => {
    const event = eventFixture();
    for (const patch of [{ schemaVersion: 2 }, { masteryEligible: true }, { outcome: "correct" },
      { confirmationState: "confirmed" }, { resetEpoch: 4 }])
      expect(isLessonHistoryEvent({ ...event, ...patch })).toBe(false);
    expect(() => projectLessonHistory({ ownerKey: "anonymous:other", resetEpoch: 3 }, [event])).toThrow("scope");
    expect(() => projectLessonHistory(event, [event, { ...event, assistance: { ...event.assistance, hint: true } }])).toThrow("Conflicting");
  });
});
