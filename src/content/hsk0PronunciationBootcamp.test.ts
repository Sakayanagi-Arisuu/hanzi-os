import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertValidHsk0PronunciationBootcampBundle,
  loadHsk0PronunciationBootcampBundle,
  validateHsk0PronunciationBootcampBundle,
} from "./hsk0PronunciationBootcamp.mjs";
import {
  buildHsk0PronunciationBootcamp,
  serializeHsk0PronunciationBootcamp,
} from "../../scripts/content/build-hsk0-pronunciation-bootcamp.mjs";

describe("HSK0 pronunciation bootcamp draft", () => {
  it("covers the official inventory and all 25 tone pairs in 12 lessons", () => {
    const bundle = loadHsk0PronunciationBootcampBundle();
    const result = assertValidHsk0PronunciationBootcampBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 12,
      targets: 111,
      officialInitials: 21,
      officialFinalTableCells: 35,
      officialSpecialFinals: 1,
      toneCategories: 5,
      tonePairCells: 25,
      authoredActivities: 208,
      initialIdentificationActivities: 21,
      finalIdentificationActivities: 36,
      syllableAssemblyActivities: 36,
      initialContrastActivities: 20,
      orthographyActivities: 14,
      toneCategoryActivities: 20,
      tonePairActivities: 25,
      sandhiActivities: 12,
      shadowingActivities: 24,
      audioDependentActivities: 89,
      reviewedAudioActivities: 0,
      measurementEligibleActivities: 0,
      masteryEligibleActivities: 0,
      releaseEligibleActivities: 0,
      reviewBatches: 12,
    });
    expect(bundle.pack.coverageClaims).toMatchObject({
      officialInitialDraftCoverage: "21/21",
      officialFinalTableDraftCoverage: "35/35",
      officialSpecialFinalDraftCoverage: "1/1",
      tonePairMatrixDraftCoverage: "25/25",
      reviewedNativeAudioComplete: false,
      hsk0Complete: false,
    });
  });

  it("keeps every audio-dependent activity silent and ineligible", () => {
    const { pack } = loadHsk0PronunciationBootcampBundle();
    const audioKinds = new Set([
      "listening-initial-contrast-selection",
      "listening-tone-category-selection",
      "listening-tone-pair-selection",
      "record-compare-shadowing-self-check",
    ]);
    const activities = pack.activities.filter(
      (activity: { kind: string }) => audioKinds.has(activity.kind),
    );

    expect(activities).toHaveLength(89);
    expect(activities.every(
      (activity: {
        stimulus: { audio: null; authoringPreview: string };
        measurementEligible: boolean;
        masteryEligible: boolean;
        releaseEligible: boolean;
      }) =>
        activity.stimulus.audio === null
        && activity.stimulus.authoringPreview
          === "synthetic-browser-voice-not-evidence"
        && activity.measurementEligible === false
        && activity.masteryEligible === false
        && activity.releaseEligible === false,
    )).toBe(true);
  });

  it("fails closed on fake audio readiness, ASR scoring or source drift", () => {
    const bundle = loadHsk0PronunciationBootcampBundle();
    const pack = structuredClone(bundle.pack);
    pack.source.officialSchemePdfSha256 = "sha256:fake";
    pack.activities[0].targetIds = [pack.activities[0].targetIds[0]];
    pack.activities.find(
      (activity: { kind: string }) =>
        activity.kind === "listening-tone-category-selection",
    ).stimulus.audio = "audio/fake.wav";
    const shadowing = pack.activities.find(
      (activity: { kind: string }) =>
        activity.kind === "record-compare-shadowing-self-check",
    );
    shadowing.browserAsrAllowedForMastery = true;
    shadowing.masteryEligible = true;

    const result = validateHsk0PronunciationBootcampBundle({
      ...bundle,
      pack,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "HSK0 pronunciation source binding is stale",
      "HSK0 pronunciation activities must exercise every target",
      expect.stringContaining("audio gate is invalid"),
      expect.stringContaining("activity contract is invalid"),
      expect.stringContaining("shadowing policy is invalid"),
    ]));
  });

  it("reports malformed collections instead of throwing", () => {
    const bundle = loadHsk0PronunciationBootcampBundle();
    const pack = structuredClone(bundle.pack);
    pack.targets = null;
    pack.lessons = null;
    pack.activities = null;
    pack.reviewBatches = null;

    expect(() => validateHsk0PronunciationBootcampBundle({
      ...bundle,
      pack,
    })).not.toThrow();
    expect(validateHsk0PronunciationBootcampBundle({
      ...bundle,
      pack,
    }).valid).toBe(false);
  });

  it("keeps the checked HSK0 pack deterministic", () => {
    const bundle = loadHsk0PronunciationBootcampBundle();
    expect(readFileSync(bundle.packPath, "utf8")).toBe(
      serializeHsk0PronunciationBootcamp(
        buildHsk0PronunciationBootcamp(),
      ),
    );
  });
});
