import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckedHsk1UnitPromotionDryRun,
  serializeHsk1UnitPromotionDryRun,
} from "../../scripts/content/build-hsk1-unit-promotion-dry-run.mjs";
import {
  assertValidHsk1UnitPromotionDryRunBundle,
  HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH,
  loadHsk1UnitPromotionDryRunBundle,
  loadHsk1UnitPromotionDryRunSources,
  projectHsk1AtomicUnitActivation,
  validateHsk1UnitPromotionDryRunBundle,
} from "./hsk1UnitPromotionDryRun.mjs";

describe("HSK1 atomic time/place/events promotion dry-run", () => {
  it("activates only the complete explicitly authorized target unit", async () => {
    const bundle = loadHsk1UnitPromotionDryRunBundle();
    const result = await assertValidHsk1UnitPromotionDryRunBundle(bundle);

    expect(result.summary).toEqual({
      atomicLessons: 6,
      currentReleaseAuthorizedUnits: 4,
      prospectiveReleaseAuthorizedUnits: 5,
      newlyEligibleUnits: 1,
      unintendedUnits: 0,
      downstreamLessonsStillWithheld: 4,
      testProjectionSafe: true,
      importAuthorized: false,
    });
    expect(bundle.report.result.activation.newlyEligibleUnitIds).toEqual([
      "hsk1-time-place-events",
    ]);
    expect(bundle.report.result.activation.prospectiveHsk1TargetLessonIds)
      .toHaveLength(10);
  });

  it("keeps daily-life and all four daily lessons withheld", () => {
    const { report } = loadHsk1UnitPromotionDryRunBundle();

    expect(report.result.activation.requiredDownstreamUnitStillWithheld)
      .toBe(true);
    expect(report.result.activation.requiredDownstreamLessonIdsStillWithheld)
      .toEqual(["daily-1", "daily-2", "daily-3", "daily-4"]);
    expect(report.result.activation.unintendedNewlyEligibleUnitIds).toEqual([]);
  });

  it("does not activate the target from mappings and prerequisites alone", () => {
    const source = loadHsk1UnitPromotionDryRunSources();
    const activation = projectHsk1AtomicUnitActivation({
      source,
      additionalAuthorizedUnitIds: [],
    });

    expect(activation.newlyEligibleUnitIds).toEqual([]);
    expect(activation.prospectiveEligibleUnitIds).not.toContain(
      "hsk1-time-place-events",
    );
  });

  it("detects a separately authorized downstream unit as spillover", () => {
    const source = loadHsk1UnitPromotionDryRunSources();
    const activation = projectHsk1AtomicUnitActivation({
      source,
      additionalAuthorizedUnitIds: [
        "hsk1-time-place-events",
        "hsk1-daily-life",
      ],
    });

    expect(activation.unintendedNewlyEligibleUnitIds).toEqual([
      "hsk1-daily-life",
    ]);
    expect(activation.requiredDownstreamUnitStillWithheld).toBe(false);
  });

  it("keeps all real evidence and learner claims false", () => {
    const { report } = loadHsk1UnitPromotionDryRunBundle();

    expect(report.result.testProjectionSafe).toBe(true);
    expect(report.result.importAuthorized).toBe(false);
    expect(Object.values(report.claims)).toEqual(Array(9).fill(false));
  });

  it("does not mutate checked handoff, graph, policy or runtime bytes", async () => {
    const paths = [
      "content/review/hsk1-time-place-events-unit-handoff.json",
      "content/curriculum/hsk0-4-graph.json",
      "content/curriculum/hsk0-4-unit-release-policy.json",
      "content/runtime/hsk0-4-runtime-catalog.json",
    ].map((path) => resolve(process.cwd(), path));
    const before = paths.map((path) => readFileSync(path, "utf8"));
    await buildCheckedHsk1UnitPromotionDryRun();

    expect(paths.map((path) => readFileSync(path, "utf8"))).toEqual(before);
  });

  it("rejects tampering and keeps the checked artifact deterministic", async () => {
    const bundle = loadHsk1UnitPromotionDryRunBundle();
    const forged = structuredClone(bundle.report);
    forged.result.importAuthorized = true;
    expect((await validateHsk1UnitPromotionDryRunBundle({
      source: bundle.source,
      report: forged,
    })).valid).toBe(false);

    const checked = readFileSync(
      resolve(process.cwd(), HSK1_UNIT_PROMOTION_DRY_RUN_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1UnitPromotionDryRun(
        await buildCheckedHsk1UnitPromotionDryRun(),
      ),
    );
  });
});
