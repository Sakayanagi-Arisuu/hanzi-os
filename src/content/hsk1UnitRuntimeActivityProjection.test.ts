import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckedHsk1UnitRuntimeActivityProjection,
  serializeHsk1UnitRuntimeActivityProjection,
} from "../../scripts/content/build-hsk1-unit-runtime-activity-projection.mjs";
import {
  assertValidHsk1UnitRuntimeActivityProjectionBundle,
  HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
  loadHsk1UnitRuntimeActivityProjectionBundle,
  validateHsk1UnitRuntimeActivityProjectionBundle,
} from "./hsk1UnitRuntimeActivityProjection.mjs";

describe("HSK1 atomic unit runtime activity projection", () => {
  it("projects all 338 non-core targets one-to-one without releasing them", async () => {
    const bundle = loadHsk1UnitRuntimeActivityProjectionBundle();
    const result = await assertValidHsk1UnitRuntimeActivityProjectionBundle(
      bundle,
    );

    expect(result.summary).toEqual({
      runtimePayloads: 338,
      dialoguePayloads: 36,
      activityPayloads: 271,
      knowledgePayloads: 31,
      safeRuntimeItemIds: 338,
      audioDependentPayloads: 120,
      uniqueAudioTargets: 90,
      reviewBatches: 6,
      requiredReviewSlots: 18,
      approvals: 0,
      finalizedPayloads: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.projection.runtimeRepresentability).toEqual({
      sourceContentTargets: 425,
      directlyProjectedCoreTargets: 87,
      directlyProjectedNonCoreTargets: 338,
      directlyProjectedTotalTargets: 425,
      unrepresentedTargets: 0,
      exactSourcePayloadsPreserved: 338,
      packageImportMustRemainBlockedUntilReview: true,
    });
  });

  it("preserves every exact source hash and safe versioned runtime identity", () => {
    const { projection } = loadHsk1UnitRuntimeActivityProjectionBundle();
    const sourceKeys = projection.payloads.map((item: {
      sourceTargetType: string;
      sourceTargetId: string;
    }) => `${item.sourceTargetType}:${item.sourceTargetId}`);

    expect(new Set(sourceKeys)).toHaveLength(338);
    expect(new Set(projection.payloads.map(
      (item: { runtimeItemId: string }) => item.runtimeItemId,
    ))).toHaveLength(338);
    expect(projection.payloads.every((item: {
      runtimeItemId: string;
      runtimePayload: { activityVersion: string };
    }) =>
      /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(item.runtimeItemId)
      && item.runtimePayload.activityVersion
        === `foundation-2026.07.7:${item.runtimeItemId}:1`
    )).toBe(true);
  });

  it("binds audio-dependent payloads to the 90 reviewed-audio targets", () => {
    const { projection } = loadHsk1UnitRuntimeActivityProjectionBundle();
    const audioPayloads = projection.payloads.filter(
      (item: { runtimePayload: { audio: { required: boolean } } }) =>
        item.runtimePayload.audio.required,
    );
    const targetIds = new Set(audioPayloads.map(
      (item: { runtimePayload: { audio: { audioTargetId: string } } }) =>
        item.runtimePayload.audio.audioTargetId,
    ));

    expect(audioPayloads).toHaveLength(120);
    expect(targetIds).toHaveLength(90);
    expect(audioPayloads.every((item: {
      runtimePayload: { audio: { reviewedAssetSha256: null } };
    }) => item.runtimePayload.audio.reviewedAssetSha256 === null)).toBe(true);
  });

  it("rejects forged eligibility and remains deterministic", async () => {
    const bundle = loadHsk1UnitRuntimeActivityProjectionBundle();
    const forged = structuredClone(bundle.projection);
    forged.payloads[0].measurementEligible = true;
    expect((await validateHsk1UnitRuntimeActivityProjectionBundle({
      source: bundle.source,
      projection: forged,
    })).valid).toBe(false);

    const checked = readFileSync(
      resolve(
        process.cwd(),
        HSK1_UNIT_RUNTIME_ACTIVITY_PROJECTION_RELATIVE_PATH,
      ),
      "utf8",
    );
    expect(checked).toBe(serializeHsk1UnitRuntimeActivityProjection(
      await buildCheckedHsk1UnitRuntimeActivityProjection(),
    ));
  }, 30_000);
});
