import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk1UnitPromotionHandoff,
  serializeHsk1UnitPromotionHandoff,
} from "../../scripts/content/build-hsk1-unit-promotion-handoff.mjs";
import {
  assertValidHsk1UnitPromotionHandoffBundle,
  HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1UnitPromotionHandoffBundle,
  validateHsk1UnitPromotionHandoffBundle,
} from "./hsk1UnitPromotionHandoff.mjs";

describe("HSK1 atomic time/place/events promotion handoff", () => {
  it("binds all six lessons and their cross-pack targets", async () => {
    const bundle = loadHsk1UnitPromotionHandoffBundle();
    const result = await assertValidHsk1UnitPromotionHandoffBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 6,
      vocabularyDrafts: 81,
      communicativeDialogueTurns: 24,
      vocabularyPracticeItems: 243,
      grammarRows: 25,
      grammarPracticeItems: 25,
      topicDrafts: 3,
      taskScenarios: 3,
      taskDialogueTurns: 12,
      taskPracticeItems: 3,
      contentTargets: 425,
      lessonDialogueAudioTargets: 6,
      vocabularyListeningAudioTargets: 81,
      taskDialogueAudioTargets: 3,
      audioTargets: 90,
      reviewedAudioAssets: 0,
      reviewBatches: 15,
      requiredRoleReceipts: 45,
      completedRoleReceipts: 0,
    });
    expect(bundle.handoff.targetBundle.lessonIds).toHaveLength(6);
    expect(bundle.handoff.targetBundle.perLesson).toHaveLength(6);
    expect(bundle.handoff.targetBundle.downstreamUnitIdsAuthorizedByThisHandoff)
      .toEqual([]);
  });

  it("retains exact parity with the checked first-lesson handoff", () => {
    const { handoff } = loadHsk1UnitPromotionHandoffBundle();
    const firstLessonId = "hsk1-time-place-events:01-numbers";

    expect(handoff.targetBundle.contentTargets.filter(
      (target: { lessonId: string }) => target.lessonId === firstLessonId,
    )).toHaveLength(67);
    expect(handoff.targetBundle.audioRequirements.filter(
      (target: { lessonId: string }) => target.lessonId === firstLessonId,
    )).toHaveLength(16);
    expect(handoff.targetBundle.reviewBatches.filter(
      (batch: { lessonId: string }) => batch.lessonId === firstLessonId,
    )).toHaveLength(2);
  });

  it("keeps every evidence and release slot empty", () => {
    const { handoff } = loadHsk1UnitPromotionHandoffBundle();

    expect(handoff.readiness).toMatchObject({
      atomicLessonCount: 6,
      requiredRoleReceiptCount: 45,
      completedRoleReceiptCount: 0,
      audioTargetCount: 90,
      reviewedAudioAssetCount: 0,
      explicitUnitReleaseGatePresent: false,
      runtimePackagePresent: false,
      promotionReceiptPresent: false,
    });
    expect(Object.values(handoff.claims)).toEqual(Array(7).fill(false));
    expect(handoff.promotionEligible).toBe(false);
  });

  it("rejects forged unit scope, evidence and downstream authorization", async () => {
    const bundle = loadHsk1UnitPromotionHandoffBundle();
    const mutations = [
      (handoff: typeof bundle.handoff) => {
        handoff.targetBundle.lessonIds.pop();
      },
      (handoff: typeof bundle.handoff) => {
        handoff.requiredReviewReceipts[0].completedReviewReceiptId = "forged";
      },
      (handoff: typeof bundle.handoff) => {
        handoff.targetBundle.audioRequirements[0].reviewedAssetId = "forged";
      },
      (handoff: typeof bundle.handoff) => {
        handoff.targetBundle.downstreamUnitIdsAuthorizedByThisHandoff.push(
          "hsk1-daily-life",
        );
      },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(bundle.handoff);
      mutate(forged);
      expect((await validateHsk1UnitPromotionHandoffBundle({
        source: bundle.source,
        handoff: forged,
      })).valid).toBe(false);
    }
  });

  it("does not duplicate Mandarin or Vietnamese payloads in the handoff", () => {
    const { handoff } = loadHsk1UnitPromotionHandoffBundle();
    const serialized = JSON.stringify(handoff);

    expect(serialized).not.toContain("今天几月几号？");
    expect(serialized).not.toContain('"vietnameseGlossDraft"');
    expect(serialized).not.toContain('"meaningVi"');
  });

  it("keeps the checked artifact deterministic", async () => {
    const checked = readFileSync(
      resolve(process.cwd(), HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1UnitPromotionHandoff(
        await buildHsk1UnitPromotionHandoff(),
      ),
    );
  });
});
