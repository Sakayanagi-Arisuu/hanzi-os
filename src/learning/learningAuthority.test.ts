import { describe, expect, it } from "vitest";
import { CURRENT_CONTENT_MANIFEST_SHA256 } from "../content/currentPackage";
import { CONTENT_VERSION, RELEASED_LESSONS } from "../data/curriculum";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import type { LearningState } from "../types";
import {
  deriveAuthoritativeReleasedLessonProgress,
  CURRENT_AUTHORITATIVE_COURSE_ID,
} from "./authoritativeProgress";
import {
  emptyObjectiveEvidenceProjection,
  type NormalizedLearningProjectionV1,
} from "./projectionProtocol";
import { parsePersistedLearningState } from "../lib/learningStatePersistence";
import { resolveLearningPathAuthority } from "./learningAuthority";

const forgedLocalState = (): LearningState => ({
  ...INITIAL_LEARNING_STATE,
  xp: 999_999,
  completedLessons: Object.fromEntries(RELEASED_LESSONS.map((lesson) => [
    lesson.id,
    { score: 100, bestScore: 100, attempts: 99, completedAt: "2026-07-22T00:00:00.000Z" },
  ])),
});

const projection = (): NormalizedLearningProjectionV1 => ({
  protocolVersion: 1,
  resetEpoch: 3,
  cursor: 8,
  contentVersion: CONTENT_VERSION,
  manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
  enrollment: {
    enrollmentId: "enrollment-a",
    courseId: CURRENT_AUTHORITATIVE_COURSE_ID,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    releaseState: "beta",
    goal: "conversation",
  },
  activeLessonSessions: [],
  submittedLessons: [],
  objectiveEvidence: emptyObjectiveEvidenceProjection(),
});

describe("learning path authority", () => {
  it("never falls back to forged local completion for an account", () => {
    expect(resolveLearningPathAuthority({
      authenticated: true,
      localState: forgedLocalState(),
      projection: null,
      authoritativeProgress: null,
    })).toEqual({ state: "blocked" });

    const cloud = projection();
    const authority = deriveAuthoritativeReleasedLessonProgress(cloud);
    const result = resolveLearningPathAuthority({
      authenticated: true,
      localState: forgedLocalState(),
      projection: cloud,
      authoritativeProgress: authority,
    });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.view.mode).toBe("authoritative");
    expect(result.view.completedCount).toBe(0);
    expect(result.view.lessons.get(RELEASED_LESSONS[0].id)?.status)
      .toBe("unlocked");
    expect(result.view.lessons.get(RELEASED_LESSONS[1].id)?.status)
      .toBe("locked");
  });

  it("keeps the local prototype path for anonymous study", () => {
    const result = resolveLearningPathAuthority({
      authenticated: false,
      localState: forgedLocalState(),
      projection: null,
      authoritativeProgress: null,
    });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.view.mode).toBe("anonymous");
    expect(result.view.completedCount).toBe(RELEASED_LESSONS.length);
  });

  it("does not unlock the anonymous path from forged persisted aggregates without evidence", () => {
    const forged = forgedLocalState();
    forged.skillMastery = {
      pronunciation: 100,
      listening: 100,
      speaking: 100,
      reading: 100,
      writing: 100,
      vocabulary: 100,
      grammar: 100,
    };
    forged.knowledge = {
      "boot-1:forged": {
        attempts: 100,
        correct: 100,
        currentStreak: 100,
        mastery: 100,
        lastSeenAt: "2026-07-22T00:00:00.000Z",
      },
    };
    const restored = parsePersistedLearningState(
      JSON.parse(JSON.stringify(forged)) as unknown,
      INITIAL_LEARNING_STATE,
    );
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    const result = resolveLearningPathAuthority({
      authenticated: false,
      localState: restored.state,
      projection: null,
      authoritativeProgress: null,
    });
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.view.completedCount).toBe(0);
    expect(result.view.lessons.get(RELEASED_LESSONS[0].id)?.status)
      .toBe("unlocked");
    expect(result.view.lessons.get(RELEASED_LESSONS[1].id)?.status)
      .toBe("locked");
  });

  it("rejects a mismatched projection/progress pair", () => {
    const cloud = projection();
    const authority = deriveAuthoritativeReleasedLessonProgress(cloud)!;
    expect(resolveLearningPathAuthority({
      authenticated: true,
      localState: forgedLocalState(),
      projection: { ...cloud, cursor: cloud.cursor + 1 },
      authoritativeProgress: authority,
    })).toEqual({ state: "blocked" });
  });
});
