import { describe, expect, it } from "vitest";
import {
  HSK_EXAM_FORM_KEYS,
  HSK_STANDARD_EXAM_STRUCTURE,
  hskStandardItemCount,
} from "./hskExamStructure";
import { studioStarterContent, validateStudioContent } from "../content/studioContent";

describe("shared HSK simulated-exam structure", () => {
  it("keeps learner and editorial counts on the same HSK1-4 contract", () => {
    expect(HSK_EXAM_FORM_KEYS).toHaveLength(12);
    expect(Object.fromEntries(Object.entries(HSK_STANDARD_EXAM_STRUCTURE).map(
      ([level, structure]) => [level, {
        items: hskStandardItemCount(level as keyof typeof HSK_STANDARD_EXAM_STRUCTURE),
        minutes: structure.timeLimitMinutes,
        skills: structure.sections.map((section) => section.skill),
      }],
    ))).toEqual({
      hsk1: { items: 40, minutes: 40, skills: ["listening", "reading"] },
      hsk2: { items: 60, minutes: 55, skills: ["listening", "reading"] },
      hsk3: { items: 80, minutes: 90, skills: ["listening", "reading", "writing"] },
      hsk4: { items: 100, minutes: 105, skills: ["listening", "reading", "writing"] },
    });
  });

  it("starts an editor-created door at a complete HSK1 structure", async () => {
    const content = studioStarterContent("exam_form") as Extract<
      ReturnType<typeof studioStarterContent>,
      { itemStableKeys: string[] }
    >;
    content.review.aiSelfReview = {
      accuracy: true,
      levelFit: true,
      pedagogy: true,
      answerIntegrity: true,
      originality: true,
    };
    const validation = await validateStudioContent("exam_form", content);
    expect(validation.result).toMatchObject({ valid: true });
  });

  it("rejects a legacy-size door from the standards-sized publishing workflow", async () => {
    const content = studioStarterContent("exam_form") as Extract<
      ReturnType<typeof studioStarterContent>,
      { itemStableKeys: string[] }
    >;
    content.itemStableKeys = content.itemStableKeys.slice(0, 12);
    const validation = await validateStudioContent("exam_form", content);
    expect(validation.result.valid).toBe(false);
    expect(validation.result.errors.map((issue) => issue.path)).toContain("itemStableKeys");
  });
});
