import { describe, expect, it } from "vitest";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import type { LearningState } from "../types";
import { parseLearningStateImport } from "./learningStateImport";

const fixture = (): LearningState => {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  state.profile = { ...state.profile, name: "Backup learner", onboarded: true };
  state.completedLessons = {
    "boot-1": { score: 90, bestScore: 90, attempts: 1, completedAt: "2026-07-20T00:00:00.000Z" },
    "characters-3": { score: 100, bestScore: 100, attempts: 1, completedAt: "2026-07-20T00:00:00.000Z" },
  };
  state.savedWords = ["ni", "not-a-released-word"];
  state.evidence = [
    {
      id: "evidence:answer",
      idempotencyKey: "answer",
      schemaVersion: 1,
      contentVersion: state.contentVersion,
      activityVersion: "boot-1:1",
      source: "lesson",
      method: "meaning-selection",
      activityId: "boot-1:q1",
      skill: "vocabulary",
      outcome: "correct",
      score: 100,
      verified: true,
      masteryEligible: true,
      occurredAt: "2026-07-20T00:00:00.000Z",
      metadata: {
        selectedAnswer: "báº¡n",
        correctAnswer: "báº¡n",
        explanation: "Legacy answer-bearing feedback",
      },
    },
    {
      id: "evidence:completion",
      idempotencyKey: "completion",
      schemaVersion: 1,
      contentVersion: state.contentVersion,
      activityVersion: "boot-1:1",
      source: "lesson",
      method: "lesson-completion",
      activityId: "boot-1",
      skill: "vocabulary",
      outcome: "completed",
      score: 90,
      verified: true,
      masteryEligible: false,
      occurredAt: "2026-07-20T00:00:00.500Z",
    },
    {
      id: "evidence:speech",
      idempotencyKey: "speech",
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
      occurredAt: "2026-07-20T00:00:01.000Z",
      metadata: { transcript: "你好" },
    },
  ];
  return state;
};

describe("learning-state backup restore", () => {
  it("keeps legacy evidence inspectable but drops aggregate-only mastery", () => {
    const result = parseLearningStateImport(fixture(), INITIAL_LEARNING_STATE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.profile.name).toBe("Backup learner");
    expect(result.state.completedLessons["boot-1"]).toBeUndefined();
    expect(result.state.completedLessons["characters-3"]).toBeUndefined();
    expect(result.state.savedWords).toEqual(["ni"]);
    expect(result.state.evidence.map((item) => item.idempotencyKey))
      .toEqual(["answer", "completion", "speech"]);
    expect(result.state.evidence.slice(0, 2)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ verified: false, masteryEligible: false }),
        expect.objectContaining({ verified: false, masteryEligible: false }),
      ]),
    );
    expect(result.state.evidence[0]?.metadata).toEqual({
      selectedAnswer: "báº¡n",
    });
    expect(result.state.skillMastery.vocabulary).toBe(0);
    expect(result.state.skillMastery.speaking).toBe(0);
  });

  it("accepts the server account-export envelope", () => {
    const result = parseLearningStateImport({
      exportSchemaVersion: 1,
      learning: { document: { state: fixture() } },
    }, INITIAL_LEARNING_STATE);
    expect(result.ok).toBe(true);
  });

  it("rejects duplicate idempotency keys instead of silently dropping history", () => {
    const state = fixture();
    state.evidence[1].idempotencyKey = state.evidence[0].idempotencyKey;
    expect(parseLearningStateImport(state, INITIAL_LEARNING_STATE)).toEqual({
      ok: false,
      error: "Learning evidence trong bản sao bị hỏng hoặc trùng khóa.",
    });
  });

  it("rejects unsupported schema versions", () => {
    expect(parseLearningStateImport(
      { ...fixture(), schemaVersion: 99 },
      INITIAL_LEARNING_STATE,
    )).toEqual({ ok: false, error: "Phiên bản bản sao chưa được hỗ trợ." });
  });
});
