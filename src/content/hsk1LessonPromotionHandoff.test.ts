import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk1LessonPromotionHandoff,
  serializeHsk1LessonPromotionHandoff,
} from "../../scripts/content/build-hsk1-lesson-promotion-handoff.mjs";
import {
  assertValidHsk1LessonPromotionHandoffBundle,
  HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1LessonPromotionHandoffBundle,
  validateHsk1LessonPromotionHandoffBundle,
} from "./hsk1LessonPromotionHandoff.mjs";

describe("HSK1 first-lesson promotion handoff", () => {
  it("binds one exact lesson without copying draft payloads", async () => {
    const bundle = loadHsk1LessonPromotionHandoffBundle();
    const result = await assertValidHsk1LessonPromotionHandoffBundle(bundle);

    expect(result.summary).toEqual({
      lessonBlueprints: 1,
      vocabularyDrafts: 15,
      dialogueTurns: 4,
      vocabularyPracticeItems: 45,
      grammarRows: 1,
      grammarPracticeItems: 1,
      contentTargets: 67,
      listeningAudioTargets: 15,
      dialogueAudioTargets: 1,
      audioTargets: 16,
      reviewedAudioAssets: 0,
      reviewBatches: 2,
      requiredRoleReceipts: 6,
      completedRoleReceipts: 0,
    });
    expect(bundle.handoff.targetBundle.contentTargets).toHaveLength(67);
    const serialized = JSON.stringify(bundle.handoff);
    expect(serialized).not.toContain("你家有几个人？");
    expect(serialized).not.toContain('"vietnameseGlossDraft":"tám"');
  });

  it("keeps every human, audio, runtime and learning claim fail-closed", () => {
    const { handoff } = loadHsk1LessonPromotionHandoffBundle();

    expect(handoff.readiness).toMatchObject({
      requiredRoleReceiptCount: 6,
      completedRoleReceiptCount: 0,
      audioTargetCount: 16,
      reviewedAudioAssetCount: 0,
      runtimePackagePresent: false,
      promotionReceiptPresent: false,
    });
    expect(handoff.readiness.blockers).toEqual([
      "ATTRIBUTABLE_REVIEW_RECEIPTS_MISSING",
      "REVIEWED_AUDIO_ASSETS_MISSING",
      "VERSIONED_RUNTIME_PACKAGE_MISSING",
      "PROMOTION_RECEIPT_MISSING",
    ]);
    expect(handoff.claims).toEqual({
      humanReviewed: false,
      audioReviewedAndLicensed: false,
      runtimeImported: false,
      learnerVisible: false,
      grantsCompletion: false,
      grantsMastery: false,
    });
  });

  it("rejects forged receipts, audio and target hashes", async () => {
    const bundle = loadHsk1LessonPromotionHandoffBundle();
    const forgedReview = structuredClone(bundle.handoff);
    forgedReview.requiredReviewReceipts[0].completedReviewReceiptId =
      "forged-review";
    expect((await validateHsk1LessonPromotionHandoffBundle({
      source: bundle.source,
      handoff: forgedReview,
    })).valid).toBe(false);

    const forgedAudio = structuredClone(bundle.handoff);
    forgedAudio.targetBundle.audioRequirements[0].reviewedAssetId =
      "forged-audio";
    expect((await validateHsk1LessonPromotionHandoffBundle({
      source: bundle.source,
      handoff: forgedAudio,
    })).valid).toBe(false);

    const forgedTarget = structuredClone(bundle.handoff);
    forgedTarget.targetBundle.contentTargets[0].sha256 =
      `sha256:${"0".repeat(64)}`;
    expect((await validateHsk1LessonPromotionHandoffBundle({
      source: bundle.source,
      handoff: forgedTarget,
    })).valid).toBe(false);
  });

  it("defines an exact, versioned and still-empty import receipt contract", () => {
    const { handoff } = loadHsk1LessonPromotionHandoffBundle();

    expect(handoff.plannedImport).toMatchObject({
      receiptSchemaVersion: 1,
      receiptKind: "hsk-local-runtime-promotion",
      targetContentVersion: "hsk1-time-place-events-2026.07.1",
      targetBundleSha256: handoff.targetBundleSha256,
      runtimePackageSha256: null,
      receiptSha256: null,
    });
    expect(handoff.plannedImport.importIdempotencyKey).toContain(
      handoff.targetBundleSha256,
    );
  });

  it("keeps the checked handoff deterministic", async () => {
    const checked = readFileSync(
      resolve(process.cwd(), HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1LessonPromotionHandoff(
        await buildHsk1LessonPromotionHandoff(),
      ),
    );
  });
});
