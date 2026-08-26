import { describe, expect, it } from "vitest";
import type { AssessmentFormV1 } from "./assessmentSessionProtocol";
import {
  isExactAssessmentFormItemV1,
  isExactAssessmentFormV1,
  MAX_ASSESSMENT_FORM_ITEMS,
} from "./assessmentSessionProtocol";

const form = (): AssessmentFormV1 => ({
  schemaVersion: 1,
  blueprintId: "strict-form",
  formVersion: "strict-form:1",
  scoringPolicyVersion: "observed-only:1",
  items: [
    {
      position: 0,
      itemId: "visual",
      itemVersion: "visual:1",
      skill: "reading",
      construct: "sentence-recognition",
      modality: "visual-selection",
      measurementEligible: true,
      prompt: "你好吗？",
      meta: "Chọn câu trả lời",
      options: ["很好", "不好"],
    },
    {
      position: 1,
      itemId: "synthetic",
      itemVersion: "synthetic:1",
      skill: "listening",
      construct: "phrase-identification",
      modality: "synthetic-tts-selection",
      measurementEligible: false,
      prompt: "Nghe và chọn",
      meta: "Synthetic TTS practice",
      options: ["谢谢", "再见"],
      stimulusText: "谢谢",
    },
  ],
});

describe("strict answer-free assessment form protocol", () => {
  it("accepts only dense, bounded, answer-free forms", () => {
    const candidate = form();
    expect(isExactAssessmentFormV1(candidate, candidate.items.length)).toBe(true);
    expect(isExactAssessmentFormItemV1(candidate.items[0], 0)).toBe(true);
    expect(JSON.stringify(candidate)).not.toMatch(
      /correctAnswer|answerKey|outcome|score/iu,
    );
  });

  it("rejects options equivalent under NFC normalization and trimming", () => {
    const trimming = form();
    trimming.items[0]!.options = ["谢谢", " 谢谢 "];
    expect(isExactAssessmentFormV1(trimming)).toBe(false);

    const normalization = form();
    normalization.items[0]!.options = ["é", "e\u0301"];
    expect(isExactAssessmentFormV1(normalization)).toBe(false);
  });

  it("rejects duplicate item ids and duplicate item versions independently", () => {
    const duplicateId = form();
    duplicateId.items[1]!.itemId = duplicateId.items[0]!.itemId;
    expect(isExactAssessmentFormV1(duplicateId)).toBe(false);

    const duplicateVersion = form();
    duplicateVersion.items[1]!.itemVersion =
      duplicateVersion.items[0]!.itemVersion;
    expect(isExactAssessmentFormV1(duplicateVersion)).toBe(false);
  });

  it("enforces all item bounds and synthetic-TTS provenance", () => {
    const cases = [
      (candidate: AssessmentFormV1) => {
        candidate.items[0]!.itemId = "i".repeat(241);
      },
      (candidate: AssessmentFormV1) => {
        candidate.items[0]!.itemVersion = "v".repeat(201);
      },
      (candidate: AssessmentFormV1) => {
        candidate.items[0]!.construct = "c".repeat(161);
      },
      (candidate: AssessmentFormV1) => {
        candidate.items[0]!.prompt = "p".repeat(2_001);
      },
      (candidate: AssessmentFormV1) => {
        candidate.items[0]!.meta = "m".repeat(1_001);
      },
      (candidate: AssessmentFormV1) => {
        candidate.items[0]!.options = ["a", "o".repeat(501)];
      },
      (candidate: AssessmentFormV1) => {
        candidate.items[1]!.measurementEligible = true;
      },
      (candidate: AssessmentFormV1) => {
        candidate.items[1]!.stimulusText = "s".repeat(2_001);
      },
    ];
    for (const mutate of cases) {
      const candidate = form();
      mutate(candidate);
      expect(isExactAssessmentFormV1(candidate)).toBe(false);
    }
  });

  it("rejects forms above the shared 100-item HSK ceiling", () => {
    const candidate = form();
    candidate.items = Array.from(
      { length: MAX_ASSESSMENT_FORM_ITEMS + 1 },
      (_, position) => ({
        ...candidate.items[0]!,
        position,
        itemId: `item-${position}`,
        itemVersion: `item-${position}:1`,
        options: [`option-${position}-a`, `option-${position}-b`],
      }),
    );
    expect(isExactAssessmentFormV1(candidate)).toBe(false);
  });
});
