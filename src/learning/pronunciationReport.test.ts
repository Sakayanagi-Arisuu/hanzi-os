import { describe, expect, it } from "vitest";
import type { AcousticPronunciationAssessment } from "../audio/acousticPronunciationClient";
import { buildPronunciationReportPresentation } from "./pronunciationReport";

const assessment = (
  transcript: string,
  overrides: Partial<AcousticPronunciationAssessment["aggregate"]> = {},
): AcousticPronunciationAssessment => ({
  provider: "azure-speech-pronunciation-assessment",
  providerApi: "short-audio-rest-v1",
  locale: "zh-CN",
  transcript,
  aggregate: {
    accuracyScore: 76.4,
    fluencyScore: 100,
    completenessScore: 100,
    pronunciationScore: 94.8,
    ...overrides,
  },
  words: [],
  lexicalToneAssessment: "not-reported-by-provider",
  calibration: "unapproved",
  masteryEligible: false,
});

describe("pronunciation report presentation", () => {
  it("does not present a binary full-text fluency score as precise for a short phrase", () => {
    expect(buildPronunciationReportPresentation(
      assessment("一个人。"),
      "一个人",
    )).toEqual({
      primaryLabel: "Độ khớp âm",
      primaryScore: 76,
      fluencyScore: null,
      matchedCharacters: 3,
      targetCharacters: 3,
      completenessPercent: 100,
      shortSample: true,
    });
  });

  it("reports transparent intermediate character coverage without double-counting repeats", () => {
    const report = buildPronunciationReportPresentation(
      assessment("一一人"),
      "一个人",
    );

    expect(report.matchedCharacters).toBe(2);
    expect(report.targetCharacters).toBe(3);
    expect(report.completenessPercent).toBe(67);
  });

  it("keeps the provider full-text scores for a long enough sentence", () => {
    const report = buildPronunciationReportPresentation(
      assessment("我今天坐公共汽车上班", { fluencyScore: 68.4, pronunciationScore: 81.6 }),
      "我今天坐公共汽车上班",
    );

    expect(report.primaryLabel).toBe("Chiến báo âm học");
    expect(report.primaryScore).toBe(82);
    expect(report.fluencyScore).toBe(68);
    expect(report.shortSample).toBe(false);
  });
});
