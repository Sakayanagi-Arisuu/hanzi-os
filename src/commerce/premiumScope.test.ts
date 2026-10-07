import { describe, expect, it } from "vitest";
import { isPremiumLessonPath } from "./CommerceProvider";
import { GET as getLevelCheck } from "../../app/api/content/premium-level-check/route";
import { GET as getCharacters } from "../../app/api/content/premium-characters/route";
import { belongsToPremiumLesson } from "../../app/api/content/runtime/route";
import type { PublishedStudioRuntimeItem } from "../server/contentStudioRepository";

describe("Premium scope is limited to Thiên Lộ lessons", () => {
  it("gates only HSK4 lesson routes", () => {
    expect(isPremiumLessonPath("/lesson/hsk4-argument-logic-concession-lesson-01")).toBe(true);
    expect(isPremiumLessonPath("/lesson/hsk3-personal-lesson-01")).toBe(false);
    expect(isPremiumLessonPath("/assessment/placement/hsk4")).toBe(false);
    expect(isPremiumLessonPath("/exams/hsk4/a")).toBe(false);
    expect(isPremiumLessonPath("/characters")).toBe(false);
    expect(isPremiumLessonPath("/dictionary")).toBe(false);
  });

  it("serves HSK4 level check and characters without commercial entitlement", async () => {
    const levelCheck = await getLevelCheck();
    const characters = await getCharacters();
    expect(levelCheck.status).toBe(200);
    expect((await levelCheck.json() as { items: unknown[] }).items).toHaveLength(72);
    expect(characters.status).toBe(200);
    expect((await characters.json() as { entries: unknown[] }).entries.length).toBeGreaterThanOrEqual(441);
  });

  it("keeps lesson-linked HSK4 enhancements behind the lesson boundary", () => {
    const item = (itemType: PublishedStudioRuntimeItem["itemType"], sourceLessonIds: string[] = []) => ({
      stableKey: "scope-test",
      level: "hsk4",
      itemType,
      title: "Scope test",
      revision: 1,
      revisionId: "scope-test-revision",
      schemaVersion: 1,
      contentSha256: "scope-test-digest",
      publishedAt: 1,
      content: { sourceLessonIds },
    }) satisfies PublishedStudioRuntimeItem;
    expect(belongsToPremiumLesson(item("lesson"))).toBe(true);
    expect(belongsToPremiumLesson(item("communicative_function", ["hsk4-argument-logic-concession-lesson-01"]))).toBe(true);
    expect(belongsToPremiumLesson(item("grammar", ["hsk4-argument-logic-concession-lesson-01"]))).toBe(true);
    expect(belongsToPremiumLesson(item("grammar"))).toBe(false);
    expect(belongsToPremiumLesson(item("vocabulary"))).toBe(false);
    expect(belongsToPremiumLesson(item("character"))).toBe(false);
  });
});
