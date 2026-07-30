import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckedHsk1LessonPromotionDryRun,
  serializeHsk1LessonPromotionDryRun,
} from "../../scripts/content/build-hsk1-lesson-promotion-dry-run.mjs";
import {
  assertValidHsk1LessonPromotionDryRunBundle,
  buildHsk1LessonPromotionTestEvidence,
  evaluateHsk1LessonPromotionDryRun,
  HSK1_LESSON_PROMOTION_DRY_RUN_RELATIVE_PATH,
  loadHsk1LessonPromotionDryRunBundle,
  loadHsk1LessonPromotionDryRunSources,
  validateHsk1LessonPromotionDryRunBundle,
} from "./hsk1LessonPromotionDryRun.mjs";

describe("HSK1 first-lesson promotion dry-run", () => {
  it("keeps the real repository input blocked with no fabricated evidence", async () => {
    const bundle = loadHsk1LessonPromotionDryRunBundle();
    const result = await assertValidHsk1LessonPromotionDryRunBundle(bundle);

    expect(result.summary).toEqual({
      evidenceContractSatisfied: false,
      prerequisiteSafe: false,
      importAuthorized: false,
      missingUnitLessons: 5,
      unintendedUnits: 0,
      unintendedLessons: 0,
    });
    expect(bundle.report.result.evidenceSummary).toEqual({
      requiredReviewReceipts: 6,
      suppliedReviewReceipts: 0,
      requiredAudioAssets: 16,
      suppliedAudioAssets: 0,
      runtimePackagePresent: false,
      promotionReceiptPresent: false,
    });
    expect(Object.values(bundle.report.claims)).toEqual(
      Array(8).fill(false),
    );
  });

  it("keeps downstream units withheld behind explicit release authorization", () => {
    const { report } = loadHsk1LessonPromotionDryRunBundle();

    expect(report.result.activation.newlyEligibleUnitIds).toEqual([
      "hsk1-time-place-events",
    ]);
    expect(report.result.activation.unintendedNewlyEligibleUnitIds).toEqual([]);
    expect(report.result.activation.unintendedLessonIds).toEqual([]);
    expect(report.result.unitBoundary.missingLessonIds).toEqual([
      "hsk1-time-place-events:02-calendar",
      "hsk1-time-place-events:03-week-and-day-parts",
      "hsk1-time-place-events:04-clock-and-duration",
      "hsk1-time-place-events:05-location",
      "hsk1-time-place-events:06-weather-and-residence",
    ]);
  });

  it("accepts complete hash-bound fixtures but never authorizes them", async () => {
    const source = loadHsk1LessonPromotionDryRunSources();
    const evidence = await buildHsk1LessonPromotionTestEvidence(source);
    const result = await evaluateHsk1LessonPromotionDryRun({ source, evidence });

    expect(result.evidenceContractSatisfied).toBe(true);
    expect(result.evidenceErrors).toEqual([]);
    expect(result.prerequisiteSafe).toBe(false);
    expect(result.fixtureOnly).toBe(true);
    expect(result.importAuthorized).toBe(false);
    expect(result.safetyErrors).toEqual([
      "atomic six-lesson unit release is incomplete",
    ]);
  });

  it("rejects forged review, audio, package and receipt bindings", async () => {
    const source = loadHsk1LessonPromotionDryRunSources();
    const base = await buildHsk1LessonPromotionTestEvidence(source);
    const mutations = [
      (value: typeof base) => {
        const receipts = value.reviewReceipts as Array<{
          receiptSha256: string;
        }>;
        receipts[0].receiptSha256 = `sha256:${"0".repeat(64)}`;
      },
      (value: typeof base) => {
        const assets = value.audioAssets as Array<{
          sourceTargetSha256: string;
        }>;
        assets[0].sourceTargetSha256 = `sha256:${"1".repeat(64)}`;
      },
      (value: typeof base) => {
        const runtimePackage = value.runtimePackage as null | {
          lessonIds: string[];
        };
        if (runtimePackage) runtimePackage.lessonIds = ["forged"];
      },
      (value: typeof base) => {
        const promotionReceipt = value.promotionReceipt as null | {
          runtimeCatalogAfterSha256: string;
        };
        if (promotionReceipt) {
          promotionReceipt.runtimeCatalogAfterSha256 =
            `sha256:${"2".repeat(64)}`;
        }
      },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(base);
      mutate(forged);
      const result = await evaluateHsk1LessonPromotionDryRun({
        source,
        evidence: forged,
      });
      expect(result.evidenceContractSatisfied).toBe(false);
      expect(result.importAuthorized).toBe(false);
    }
  }, 30_000);

  it("does not mutate checked graph, runtime or handoff bytes", async () => {
    const paths = [
      "content/curriculum/hsk0-4-graph.json",
      "content/runtime/hsk0-4-runtime-catalog.json",
      "content/review/hsk1-time-place-events-01-numbers-handoff.json",
    ].map((path) => resolve(process.cwd(), path));
    const before = paths.map((path) => readFileSync(path, "utf8"));
    const source = loadHsk1LessonPromotionDryRunSources();
    const evidence = await buildHsk1LessonPromotionTestEvidence(source);
    await evaluateHsk1LessonPromotionDryRun({ source, evidence });

    expect(paths.map((path) => readFileSync(path, "utf8"))).toEqual(before);
  });

  it("rejects a forged checked report and stays deterministic", async () => {
    const bundle = loadHsk1LessonPromotionDryRunBundle();
    const forged = structuredClone(bundle.report);
    forged.result.importAuthorized = true;
    expect((await validateHsk1LessonPromotionDryRunBundle({
      source: bundle.source,
      report: forged,
    })).valid).toBe(false);

    const checked = readFileSync(
      resolve(process.cwd(), HSK1_LESSON_PROMOTION_DRY_RUN_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1LessonPromotionDryRun(
        await buildCheckedHsk1LessonPromotionDryRun(),
      ),
    );
  });
});
