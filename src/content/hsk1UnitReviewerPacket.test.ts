import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildHsk1UnitReviewerPacket,
  serializeHsk1UnitReviewerPacket,
} from "../../scripts/content/build-hsk1-unit-reviewer-packet.mjs";
import {
  assertValidHsk1UnitReviewerPacketBundle,
  HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH,
  loadHsk1UnitReviewerPacketBundle,
  validateHsk1UnitReviewerPacketBundle,
} from "./hsk1UnitReviewerPacket.mjs";

describe("HSK1 time/place/events reviewer packet", () => {
  it("resolves every atomic handoff target into reviewer-visible payload", async () => {
    const bundle = loadHsk1UnitReviewerPacketBundle();
    const result = await assertValidHsk1UnitReviewerPacketBundle(bundle);

    expect(result.summary).toEqual({
      lessons: 6,
      contentTargets: 425,
      runtimeProjectionTargets: 425,
      unrepresentedNonCoreTargets: 0,
      reviewBatches: 27,
      reviewSlots: 81,
      audioTargets: 90,
      dialogueAudioTargets: 6,
      vocabularyAudioTargets: 81,
      taskAudioTargets: 3,
      completedReviewSlots: 0,
      reviewedAudioAssets: 0,
      releaseEligibleItems: 0,
    });
    expect(bundle.packet.contentTargets.every(
      (target: { payload?: unknown }) => target.payload !== undefined,
    )).toBe(true);
  });

  it("provides exact script and safe filename for every audio target", () => {
    const { packet } = loadHsk1UnitReviewerPacketBundle();

    expect(packet.audioRecordingManifest).toHaveLength(90);
    expect(packet.audioRecordingManifest.every((target: {
      expectedFileName: string;
      script: object;
      assetStatus: string;
      reviewedAssetSha256: null;
    }) =>
      /^[a-z0-9_-]+\.wav$/u.test(target.expectedFileName)
      && Object.keys(target.script).length > 1
      && target.assetStatus === "missing"
      && target.reviewedAssetSha256 === null
    )).toBe(true);
    expect(packet.audioRecordingPolicy).toMatchObject({
      container: "wav",
      codec: "pcm-s16le",
      channels: 1,
      bitDepth: 16,
      oneTargetPerFile: true,
      rightsEvidenceRequired: true,
    });
  });

  it("maps all 81 review slots to role-specific checklists", () => {
    const { packet } = loadHsk1UnitReviewerPacketBundle();

    expect(packet.reviewSlots).toHaveLength(81);
    expect(packet.reviewSlots.every((slot: {
      requiredChecklistIds: string[];
      packetChecklistState: string;
      completedReviewReceiptId: null;
    }) =>
      slot.requiredChecklistIds.length >= 4
      && slot.packetChecklistState === "not-reviewed"
      && slot.completedReviewReceiptId === null
    )).toBe(true);
  });

  it("shows all 425 runtime payloads without a representability gap", () => {
    const { packet } = loadHsk1UnitReviewerPacketBundle();

    expect(packet.runtimeProjectionTargets.lexemes).toHaveLength(81);
    expect(packet.runtimeProjectionTargets.lessons).toHaveLength(6);
    expect(packet.runtimeProjectionTargets.nonCorePayloads).toHaveLength(338);
    expect(packet.runtimeProjectionTargets.runtimeRepresentability).toMatchObject({
      directlyProjectedCoreTargets: 87,
      directlyProjectedNonCoreTargets: 338,
      directlyProjectedTotalTargets: 425,
      unrepresentedTargets: 0,
      packageImportMustRemainBlockedUntilReview: true,
    });
  });

  it("keeps the packet learner-hidden and non-authoritative", () => {
    const { packet } = loadHsk1UnitReviewerPacketBundle();

    expect(Object.values(packet.policy)).toEqual([
      false,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(packet.counts.completedReviewSlots).toBe(0);
    expect(packet.counts.reviewedAudioAssets).toBe(0);
    expect(packet.counts.releaseEligibleItems).toBe(0);
  });

  it("rejects tampering and stays deterministic", async () => {
    const bundle = loadHsk1UnitReviewerPacketBundle();
    const forged = structuredClone(bundle.packet);
    forged.contentTargets[0].payload.titleVi = "forged";
    expect((await validateHsk1UnitReviewerPacketBundle({
      source: bundle.source,
      packet: forged,
    })).valid).toBe(false);

    const checked = readFileSync(
      resolve(process.cwd(), HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1UnitReviewerPacket(
        await buildHsk1UnitReviewerPacket(),
      ),
    );
  });
});
