import { expect, it } from "vitest";
import { baselinePracticeCatalog, publishedPracticePageIdentities } from "./practiceQuestionCatalog";
import { publishedLessonPageActivities } from "./publishedLessonPageActivities";
import { emptyLessonBlock } from "../learning/lessonPages";
import { emptyLessonActivity } from "../learning/lessonActivities";
import { practiceQuestionKey } from "../learning/practicePercent";
import { RELEASED_LESSONS } from "../data/curriculum";
import { buildExerciseCatalog } from "../lib/exerciseGeneration";
it("covers every released lesson question with stable deduplicated identities", () => {
  const catalog = baselinePracticeCatalog();
  const sets = Object.fromEntries(Object.entries(catalog).map(([skill, ids]) => [skill, new Set(ids)]));
  for (const lesson of RELEASED_LESSONS) for (const question of buildExerciseCatalog(lesson, "simplified", () => .5)) {
    expect(sets[question.skill].has(practiceQuestionKey(`${lesson.id}:${question.id}`))).toBe(true);
  }
  for (const ids of Object.values(catalog)) {
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => practiceQuestionKey(id) === id)).toBe(true);
  }
});

it("keeps page question identities equal to answer bindings without returning answer data", async () => {
  const lesson = RELEASED_LESSONS[0];
  const manifest = { schemaVersion: 1, policy: "published-only", releaseBoundary: "content-release-worker-v1", items: [{
    schemaVersion: 1, itemType: "lesson", level: "hsk0", stableKey: lesson.id, title: "Bài học",
    revisionId: "revision", revision: 1, contentSha256: "server-header", publishedAt: 1,
    content: { targetLessonId: lesson.id, lessonPages: { version: 1, pages: [{ id: "p", title: "Trang", layout: "focus", blocks: [{
      ...emptyLessonBlock("b"), kind: "activity", body: "Điền từ", activity: {
        ...emptyLessonActivity(), type: "cloze", acceptedAnswers: ["PRIVATE-ANSWER"], explanation: "PRIVATE-FEEDBACK",
        learningTarget: { skill: "vocabulary", objective: "Nhớ từ", sources: [{ kind: "vocabulary", id: lesson.wordIds[0] }] },
      },
    }] }] } },
  }] };
  const identities = publishedPracticePageIdentities(manifest);
  const bindings = await publishedLessonPageActivities(manifest);
  expect(identities.vocabulary).toEqual([...bindings.keys()]);
  expect(JSON.stringify(identities)).not.toMatch(/PRIVATE-ANSWER|PRIVATE-FEEDBACK/);
  expect(() => publishedPracticePageIdentities({ ...manifest, items: [...manifest.items, ...manifest.items] })).toThrow();
});
