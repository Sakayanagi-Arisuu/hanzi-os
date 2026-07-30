import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckedHsk1UnitPackagePlan,
  serializeHsk1UnitPackagePlan,
} from "../../scripts/content/build-hsk1-unit-package-plan.mjs";
import {
  assertValidHsk1UnitPackagePlanBundle,
  HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH,
  loadHsk1UnitPackagePlanBundle,
  validateHsk1UnitPackagePlanBundle,
} from "./hsk1UnitPackagePlan.mjs";

describe("HSK1 atomic unit package plan", () => {
  it("keeps materialization blocked on exact evidence, projection, and governance gaps", async () => {
    const bundle = loadHsk1UnitPackagePlanBundle();
    const result = await assertValidHsk1UnitPackagePlanBundle(bundle);

    expect(result.summary).toEqual({
      requiredRuntimePayloads: 425,
      draftedRuntimePayloads: 425,
      finalizedRuntimePayloads: 0,
      unsafeAuthoringLessonIds: 6,
      safeRuntimeLessonIds: 6,
      traditionalEditorialDecisions: 7,
      pronunciationReconciliations: 2,
      missingExampleTriples: 0,
      requiredProjectionReviewSlots: 36,
      unrepresentedNonCoreTargets: 0,
      blockers: [
        "REAL_REVIEW_AND_AUDIO_EVIDENCE_INCOMPLETE",
        "REVIEWED_RUNTIME_PROJECTION_MISSING",
        "CONTENT_OWNER_METADATA_MISSING",
        "SOURCE_LICENSE_METADATA_MISSING",
        "PACKAGE_GOVERNANCE_APPROVALS_MISSING",
        "AUDIO_IMPORT_DESCRIPTOR_MISSING",
        "TARGET_PACKAGE_MISSING",
        "UNIT_RELEASE_AUTHORIZATION_MISSING",
        "PROMOTION_RECEIPT_MISSING",
      ],
    });
    expect(bundle.plan.materialization.ready).toBe(false);
    expect(bundle.plan.claims).toEqual(
      expect.objectContaining({
        runtimeProjectionComplete: false,
        evidenceComplete: false,
        runtimePackagePresent: false,
        runtimeMutated: false,
        learnerContentExposed: false,
        masteryGranted: false,
      }),
    );
  }, 30_000);

  it("proposes unique safe runtime IDs without authorizing the mapping", () => {
    const bundle = loadHsk1UnitPackagePlanBundle();
    const mappings = bundle.plan.runtimeProjection.sourceGapAudit.lessons
      .proposedRuntimeIdMappings;

    expect(mappings).toHaveLength(6);
    expect(new Set(mappings.map((mapping: { runtimeId: string }) =>
      mapping.runtimeId)).size).toBe(6);
    expect(mappings.every((mapping: { runtimeId: string; authorized: boolean }) =>
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(mapping.runtimeId)
      && mapping.authorized === false)).toBe(true);
  });

  it("rejects claim tampering and keeps the checked report deterministic", async () => {
    const bundle = loadHsk1UnitPackagePlanBundle();
    const forged = structuredClone(bundle.plan);
    forged.claims.runtimeProjectionComplete = true;
    expect((await validateHsk1UnitPackagePlanBundle({
      source: bundle.source,
      plan: forged,
    })).valid).toBe(false);

    const checked = readFileSync(
      resolve(process.cwd(), HSK1_UNIT_PACKAGE_PLAN_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1UnitPackagePlan(
        await buildCheckedHsk1UnitPackagePlan(),
      ),
    );
  }, 30_000);
});
