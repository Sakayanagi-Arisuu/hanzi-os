import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHskRuntimePromotionQueue,
  serializeHskRuntimePromotionQueue,
} from "../../scripts/content/build-hsk-runtime-promotion-queue.mjs";
import {
  assertValidHskRuntimePromotionQueueBundle,
  HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH,
  loadHskRuntimePromotionQueueBundle,
  validateHskRuntimePromotionQueueBundle,
} from "./hskRuntimePromotionQueue.mjs";

describe("HSK1-4 runtime promotion queue", () => {
  it("separates authored, reviewed, prerequisite and learner-visible coverage", () => {
    const bundle = loadHskRuntimePromotionQueueBundle();
    const result = assertValidHskRuntimePromotionQueueBundle(bundle);

    expect(result.summary).toEqual({
      levels: 4,
      graphUnits: 15,
      authoredLessonBlueprints: 213,
      blueprintApprovedLessons: 0,
      reviewBatches: 509,
      approvalRecords: 0,
      learnerVisibleTargetLessons: 213,
      prerequisiteBlockedSourceLessons: 0,
      unavailablePaths: 0,
      completionClaims: 0,
      promotionReadyUnits: 0,
    });
    expect(bundle.report.levels.map((level: {
      pathId: string;
      authoredLessonBlueprintCount: number;
      learnerVisibleTargetLessonCount: number;
      levelReview: { pendingBatchCount: number };
    }) => ({
      pathId: level.pathId,
      authored: level.authoredLessonBlueprintCount,
      visible: level.learnerVisibleTargetLessonCount,
      pendingReview: level.levelReview.pendingBatchCount,
    }))).toEqual([
      { pathId: "hsk1", authored: 40, visible: 40, pendingReview: 97 },
      { pathId: "hsk2", authored: 40, visible: 40, pendingReview: 122 },
      { pathId: "hsk3", authored: 55, visible: 55, pendingReview: 122 },
      { pathId: "hsk4", authored: 78, visible: 78, pendingReview: 168 },
    ]);
  });

  it("has no local runtime promotion gap while production stays blocked", () => {
    const { report } = loadHskRuntimePromotionQueueBundle();

    expect(report.nextPromotionCandidate).toBeNull();
    expect(report.summary.promotionReadyUnits).toBe(0);
    expect(report.policy).toMatchObject({
      informationalOnly: true,
      mutatesRuntime: false,
      exposesDraftContent: false,
      requiresAttributableHumanReview: true,
      grantsCompletionOrMastery: false,
    });
  });

  it("keeps HSK3 and HSK4 locally visible while production remains blocked", () => {
    const { report } = loadHskRuntimePromotionQueueBundle();
    const upperUnits = report.levels
      .filter((level: { pathId: string }) => ["hsk3", "hsk4"].includes(level.pathId))
      .flatMap((level: { units: Array<{
        prerequisiteRuntimeClosurePresent: boolean;
        blockers: string[];
        learnerVisibleLessonIds: string[];
      }> }) => level.units);

    expect(upperUnits).toHaveLength(6);
    for (const unit of upperUnits) {
      expect(unit.prerequisiteRuntimeClosurePresent).toBe(true);
      expect(unit.learnerVisibleLessonIds.length).toBeGreaterThan(0);
      expect(unit.blockers).not.toContain("RUNTIME_PACKAGE_MAPPING_INCOMPLETE");
      expect(unit.blockers).not.toContain("PREREQUISITE_RUNTIME_CLOSURE_MISSING");
      expect(unit.blockers).toEqual(expect.arrayContaining([
        "LEVEL_HUMAN_REVIEW_INCOMPLETE",
      ]));
    }
  });

  it("rejects forged approval, visibility and source bindings", () => {
    const bundle = loadHskRuntimePromotionQueueBundle();
    const approval = structuredClone(bundle.report);
    approval.levels[0].levelReview.releaseEligible = true;
    expect(validateHskRuntimePromotionQueueBundle({
      source: bundle.source,
      report: approval,
    }).errors).toContain(
      "HSK runtime promotion queue does not match its exact source projection",
    );

    const visibility = structuredClone(bundle.report);
    visibility.levels[1].learnerVisibleTargetLessonCount = 1;
    expect(validateHskRuntimePromotionQueueBundle({
      source: bundle.source,
      report: visibility,
    }).valid).toBe(false);

    const sourceDrift = structuredClone(bundle.report);
    sourceDrift.sourceBindings[0].sha256 = `sha256:${"0".repeat(64)}`;
    expect(validateHskRuntimePromotionQueueBundle({
      source: bundle.source,
      report: sourceDrift,
    }).valid).toBe(false);
  });

  it("keeps the checked report deterministic", () => {
    const checked = readFileSync(
      resolve(process.cwd(), HSK_RUNTIME_PROMOTION_QUEUE_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHskRuntimePromotionQueue(buildHskRuntimePromotionQueue()),
    );
  });
});
