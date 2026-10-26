import { describe, expect, it } from "vitest";
import { RELEASED_LESSONS, CONTENT_VERSION } from "../data/curriculum";
import * as foundation from "./exerciseGeneration";
import * as editorial from "./editorialExerciseGeneration";
import { getAuthoritativeLessonAnswer } from "../server/editorialItemBank";
import { scoreObjectiveAttempt } from "../server/editorialAttemptScoring";
import { LEXICAL_EXERCISE_SUFFIX } from "../content/lexicalEditorialCatalog";
import type { ObjectiveAttemptMethod } from "../learning/attemptProtocol";

describe("foundation and editorial session compatibility", () => {
  it.each(RELEASED_LESSONS)("preserves selections, IDs and scoring for $id", (lesson) => {
      for (const script of ["simplified", "traditional"] as const) {
        const random = () => 0.5;
        const legacy = foundation.buildExerciseCatalog(lesson, script, random);
        const current = editorial.buildExerciseCatalog(lesson, script, random);
        expect(current.slice(0, legacy.length)).toEqual(legacy);
        expect(editorial.buildExercises(lesson, script, random)).toEqual(
          foundation.buildExercises(lesson, script, random),
        );
        expect(new Set(current.map(item => item.id)).size).toBe(current.length);
        for (const item of current) {
          const answer = getAuthoritativeLessonAnswer(lesson.id, item.id)!;
          expect(answer, item.id).not.toBeNull();
          expect(answer.activityVersion).toBe(item.activityVersion);
          expect(answer.answers).toContain(item.correct);
        }
        const selected = editorial.buildExercises(lesson, script, random, true);
        const item = selected.find(candidate => candidate.id.endsWith(LEXICAL_EXERCISE_SUFFIX))!;
        expect(item).toBeDefined();
        const answer = getAuthoritativeLessonAnswer(lesson.id, item.id)!;
        const command = {
          protocolVersion: 1 as const, idempotencyKey: "compatibility-test",
          installationId: "test", deviceId: "test", deviceSequence: 1,
          resetEpoch: 0, contentVersion: CONTENT_VERSION,
          activityId: `${lesson.id}:${item.id}`, activityVersion: item.activityVersion,
          source: "lesson" as const, method: answer.method as ObjectiveAttemptMethod,
          sessionId: "compatibility-test", occurredAt: "2026-10-12T00:00:00.000Z",
          response: { kind: "answer" as const, answer: item.correct, usedHint: true },
        };
        expect(scoreObjectiveAttempt(command)).toMatchObject({
          outcome: "correct", baseMasteryEligible: false,
        });
        expect(() => scoreObjectiveAttempt({ ...command, activityVersion: "stale" })).toThrow();
      }
  });
});
