import { describe, expect, it } from "vitest";
import { assessmentPresentationForItem } from "./authoritativeAssessmentItemBank";
import {
  HSK_MOCK_EXAM_DEFINITIONS,
  HSK_MOCK_EXAM_FORM_KEYS_BY_LEVEL,
  HSK_MOCK_EXAM_LEGACY_DEFINITIONS,
  HSK_MOCK_EXAM_PLAYABLE_ITEM_COUNTS,
  HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS,
  createEditorialHskMockExamDefinition,
  getHskMockExamDefinition,
  hskMockExamEditorialSuggestions,
  validateHskMockExamDefinitions,
} from "./hskMockExamBank";

describe("HSK1-4 Mock Exam bank", () => {
  it("publishes standards-sized forms while retaining every legacy door for resume", () => {
    const validation = validateHskMockExamDefinitions();
    expect(validation).toEqual({ ok: true, errors: [] });
    expect(HSK_MOCK_EXAM_DEFINITIONS).toHaveLength(24);
    expect(HSK_MOCK_EXAM_LEGACY_DEFINITIONS).toHaveLength(33);
    expect(HSK_MOCK_EXAM_FORM_KEYS_BY_LEVEL).toEqual({
      hsk1: ["a", "b", "c", "d", "e", "f"],
      hsk2: ["a", "b", "c", "d", "e", "f"],
      hsk3: ["a", "b", "c", "d", "e", "f"],
      hsk4: ["a", "b", "c", "d", "e", "f"],
    });
    expect(Object.values(HSK_MOCK_EXAM_SOURCE_ITEM_COUNTS)
      .reduce((sum, count) => sum + count, 0)).toBe(422);
    expect(Object.values(HSK_MOCK_EXAM_PLAYABLE_ITEM_COUNTS)
      .reduce((sum, count) => sum + count, 0)).toBe(1_680);
    expect(HSK_MOCK_EXAM_DEFINITIONS.map((definition) => ({
      level: definition.examLevel,
      items: definition.bank.length,
      minutes: definition.timeLimitMinutes,
    })).reduce<Record<string, { forms: number; items: number; minutes: number }>>(
      (totals, definition) => {
        const current = totals[definition.level] ?? {
          forms: 0,
          items: definition.items,
          minutes: definition.minutes,
        };
        totals[definition.level] = { ...current, forms: current.forms + 1 };
        return totals;
      },
      {},
    )).toEqual({
      hsk1: { forms: 6, items: 40, minutes: 40 },
      hsk2: { forms: 6, items: 60, minutes: 55 },
      hsk3: { forms: 6, items: 80, minutes: 90 },
      hsk4: { forms: 6, items: 100, minutes: 105 },
    });
    expect(getHskMockExamDefinition("hsk1", "b")).not.toBeNull();
    expect(getHskMockExamDefinition("hsk1", "g")).toBeNull();
  });

  it("keeps answer, explanation and recommendation out of client forms", () => {
    for (const definition of HSK_MOCK_EXAM_DEFINITIONS) {
      const projection = definition.bank.map((item, position) =>
        assessmentPresentationForItem(item, position)
      );
      expect(JSON.stringify(projection)).not.toMatch(
        /correctAnswer|correctOptionId|explanationVi|sourceLessonId|answerKey/iu,
      );
    }
  });

  it("keeps listening synthetic and ineligible for mastery evidence", () => {
    for (const definition of HSK_MOCK_EXAM_DEFINITIONS) {
      expect(definition.humanReviewed).toBe(false);
      expect(definition.masteryEligible).toBe(false);
      expect(definition.prerequisiteUnlockEligible).toBe(false);
      const listening = definition.bank.filter((item) => item.skill === "listening");
      expect(listening).toHaveLength(
        definition.sections.find((section) => section.skill === "listening")?.itemCount ?? 0,
      );
      expect(listening.every((item) =>
        item.modality === "synthetic-tts-selection"
        && item.measurementEligible === false
        && Boolean(item.stimulusText)
      )).toBe(true);
    }
  });

  it("lets Studio open governed G-L doors from the approved source registry", () => {
    const suggestions = hskMockExamEditorialSuggestions();
    const itemStableKeys = suggestions.hsk4.g;
    expect(itemStableKeys).toHaveLength(100);
    const definition = createEditorialHskMockExamDefinition({
      stableKey: "hsk4.mock.form-g",
      title: "Mô phỏng HSK4 · Cửa G",
      revision: 1,
      revisionId: "revision-g",
      contentSha256: `sha256:${"a".repeat(64)}`,
      content: {
        examLevel: "hsk4",
        formKey: "g",
        timeLimitMinutes: 105,
        itemStableKeys,
        coverage: { listening: 45, reading: 40, writing: 15 },
      },
    });
    expect(definition).toMatchObject({
      examLevel: "hsk4",
      formKey: "g",
      timeLimitMinutes: 105,
      standardStructure: true,
      blueprint: { itemCount: 100 },
    });
    expect(definition?.bank).toHaveLength(100);
  });
});
