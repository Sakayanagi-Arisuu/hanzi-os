import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk3GuidedNotesPack,
  serializeHsk3GuidedNotesPack,
} from "../../scripts/content/build-hsk3-guided-notes-pack.mjs";
import {
  assertValidHsk3GuidedNotesPackBundle,
  HSK3_GUIDED_NOTES_PACK_RELATIVE_PATH,
  loadHsk3GuidedNotesPackBundle,
  validateHsk3GuidedNotesPackBundle,
} from "./hsk3GuidedNotesPack.mjs";

describe("HSK3 guided main-idea/detail notes pack", () => {
  it("authors 24 evidence-bound prompt units over three lessons", () => {
    const result = assertValidHsk3GuidedNotesPackBundle(
      loadHsk3GuidedNotesPackBundle(),
    );

    expect(result.summary).toEqual({
      lessons: 3,
      completedGuidedProductionStages: 1,
      completedGuidedProductionLessons: 3,
      sourceTexts: 24,
      sourceTextLines: 192,
      promptUnits: 24,
      readingInputPromptUnits: 16,
      listeningInputPromptUnits: 16,
      integratedListeningReadingPromptUnits: 8,
      revisionChecklists: 24,
      audioDependentPromptUnits: 16,
      reviewedAudioPromptUnits: 0,
      measurementEligibleItems: 0,
      masteryEligibleItems: 0,
      reviewBatches: 3,
      approvals: 0,
      releaseEligibleItems: 0,
    });
  });

  it("consumes prior character coverage without claiming new ownership", () => {
    const { pack } = loadHsk3GuidedNotesPackBundle();
    expect(pack.masteryPolicy).toMatchObject({
      inputSkillsSeparatedFromWritingEvidence: true,
      modelRevealCannotGrantMastery: true,
      browserTtsCannotGrantListeningMastery: true,
      newCharacterOwnershipClaims: 0,
      sourceRecognitionCharacterMappings: 284,
    });
  });

  it("rejects source drift, copied-source drift and fake mastery", () => {
    const bundle = loadHsk3GuidedNotesPackBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.paragraphSourceTipPackSha256 = "sha256:stale";
    pack.sourceTexts[0].text.lines[0].hanzi = "漂移";
    pack.lessons[0].promptUnits[0].masteryEligible = true;

    const result = validateHsk3GuidedNotesPackBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK3 guided-notes source binding is stale",
      expect.stringContaining("guided-notes source text is stale"),
      expect.stringContaining("guided-notes item is invalid"),
    ]));
  });

  it("keeps the checked artifact deterministic", () => {
    const checked = readFileSync(
      join(process.cwd(), HSK3_GUIDED_NOTES_PACK_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk3GuidedNotesPack(buildHsk3GuidedNotesPack()),
    );
  });
});
