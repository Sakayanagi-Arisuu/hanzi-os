import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk4EventAgencyVoiceSummaryArgumentPack,
} from "../../scripts/content/build-hsk4-event-agency-voice-summary-argument-pack.mjs";
import {
  serializeHsk4SummaryArgumentModulePack,
} from "../../scripts/content/hsk4-summary-argument-module-builder.mjs";
import {
  assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle,
  HSK4_EVENT_AGENCY_VOICE_SUMMARY_ARGUMENT_RELATIVE_PATH,
  loadHsk4EventAgencyVoiceSummaryArgumentPackBundle,
  validateHsk4EventAgencyVoiceSummaryArgumentPackBundle,
} from "./hsk4EventAgencyVoiceSummaryArgumentPack.mjs";

describe("HSK4 event/agency/voice summary-argument pack", () => {
  it("authors four source-bound lessons without granting mastery", () => {
    const bundle = loadHsk4EventAgencyVoiceSummaryArgumentPackBundle();
    const result =
      assertValidHsk4EventAgencyVoiceSummaryArgumentPackBundle(bundle);
    expect(result.summary).toEqual({
      lessons: 4,
      completedSummaryArgumentModules: 3,
      completedSummaryArgumentLessons: 15,
      sourceBindings: 8,
      grammarTargets: 8,
      grammarPracticeItems: 8,
      sourceAuditItems: 8,
      paraphraseItems: 8,
      structuredSummaryPrompts: 4,
      structuredArgumentPrompts: 4,
      spokenDefensePrompts: 4,
      authoredPracticeItems: 36,
      audioDependentItems: 20,
      learnerRecordingItems: 4,
      reviewedRubrics: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 4,
      approvals: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.pack.lessons.every(
      (lesson: { sourceBindings: Array<{ kind: string }> }) =>
        lesson.sourceBindings[0].kind === "long-form-reading"
        && lesson.sourceBindings[1].kind === "long-form-listening",
    )).toBe(true);
  });

  it("rejects hidden agency and a mastery-capable spoken rubric", () => {
    const bundle = loadHsk4EventAgencyVoiceSummaryArgumentPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.lessons[0].sourceAuditItems[0].evidenceRefs[0].paragraphIds = [
      "unknown-paragraph",
    ];
    pack.lessons[0].spokenDefensePrompt.rubric.scoringAuthority =
      "automatic-mastery";
    const result = validateHsk4EventAgencyVoiceSummaryArgumentPackBundle({
      ...bundle,
      pack,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      `${pack.lessons[0].sourceAuditItems[0].itemId} source audit is invalid`,
      `${pack.lessons[0].lessonId} spoken defense is invalid`,
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(
        process.cwd(),
        HSK4_EVENT_AGENCY_VOICE_SUMMARY_ARGUMENT_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk4SummaryArgumentModulePack(
        buildHsk4EventAgencyVoiceSummaryArgumentPack(),
      ),
    );
  });
});
