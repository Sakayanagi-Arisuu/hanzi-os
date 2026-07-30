import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCheckedHsk1UnitEvidenceReadiness,
  serializeHsk1UnitEvidenceReadiness,
} from "../../scripts/content/build-hsk1-unit-evidence-readiness.mjs";
import {
  assertValidHsk1UnitEvidenceReadinessBundle,
  buildHsk1UnitEvidenceTestFixture,
  evaluateHsk1UnitEvidenceIntake,
  HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH,
  loadHsk1UnitEvidenceIntakeSources,
  loadHsk1UnitEvidenceReadinessBundle,
  loadLocalHsk1UnitEvidence,
  validateHsk1UnitEvidenceReadinessBundle,
} from "./hsk1UnitEvidenceIntake.mjs";

const NOW = Date.parse("2026-07-30T00:30:00.000Z");
type FixtureEvidence = {
  schemaVersion: number;
  evidenceMode: string;
  reviewDocuments: Array<{
    receipt: { receiptSha256: string };
  }>;
  audioRecords: Array<{
    record: { asset: Record<string, unknown> };
    assetBytes: Uint8Array;
  }>;
};
const fixtureEvidence = async (
  source: ReturnType<typeof loadHsk1UnitEvidenceIntakeSources>,
) => await buildHsk1UnitEvidenceTestFixture(source) as unknown as FixtureEvidence;

describe("HSK1 atomic unit evidence intake", () => {
  it("keeps the checked real-evidence baseline blocked and empty", async () => {
    const bundle = loadHsk1UnitEvidenceReadinessBundle();
    const result = await assertValidHsk1UnitEvidenceReadinessBundle(bundle);

    expect(result.summary).toEqual({
      requiredReviewSlots: 81,
      approvedReviewSlots: 0,
      requiredAudioTargets: 90,
      reviewedAudioTargets: 0,
      evidenceValid: true,
      evidenceComplete: false,
      readyForPackage: false,
      importAuthorized: false,
    });
    expect(bundle.report.result.blockers).toEqual([
      "ATTRIBUTABLE_REVIEW_RECEIPTS_MISSING",
      "REVIEWED_AUDIO_OR_RIGHTS_EVIDENCE_MISSING",
    ]);
  }, 30_000);

  it("loads an absent ignored evidence directory as an empty real input", () => {
    const { evidence } = loadLocalHsk1UnitEvidence();

    expect(evidence).toMatchObject({
      schemaVersion: 1,
      evidenceMode: "repository-real",
      reviewDocuments: [],
      audioRecords: [],
    });
  });

  it("accepts a complete exact fixture but never makes it package authority", async () => {
    const source = loadHsk1UnitEvidenceIntakeSources();
    const evidence = await fixtureEvidence(source);
    const result = await evaluateHsk1UnitEvidenceIntake({
      source,
      evidence,
      nowEpochMs: NOW,
    });

    expect(result).toMatchObject({
      evidenceMode: "test-fixture",
      evidenceValid: true,
      evidenceComplete: true,
      fixtureOnly: true,
      readyForPackage: false,
      importAuthorized: false,
      validationErrors: [],
      blockers: ["TEST_FIXTURE_NOT_AUTHORITY"],
      review: {
        requiredSlots: 81,
        suppliedSlots: 81,
        approvedSlots: 81,
        missingSlotKeys: [],
      },
      audio: {
        requiredTargets: 90,
        suppliedTargets: 90,
        reviewedTargets: 90,
        missingTargetIds: [],
      },
    });
  }, 60_000);

  it("rejects a forged review receipt without counting its slot", async () => {
    const source = loadHsk1UnitEvidenceIntakeSources();
    const evidence = await fixtureEvidence(source);
    evidence.reviewDocuments[0].receipt.receiptSha256 =
      `sha256:${"0".repeat(64)}`;
    const result = await evaluateHsk1UnitEvidenceIntake({
      source,
      evidence,
      nowEpochMs: NOW,
    });

    expect(result.evidenceValid).toBe(false);
    expect(result.review.approvedSlots).toBe(80);
    expect(result.review.missingSlotKeys).toHaveLength(1);
    expect(result.readyForPackage).toBe(false);
    expect(result.importAuthorized).toBe(false);
  }, 60_000);

  it("rejects audio byte reuse and rights-receipt drift", async () => {
    const source = loadHsk1UnitEvidenceIntakeSources();
    const evidence = await fixtureEvidence(source);
    evidence.audioRecords[1].record.asset = structuredClone(
      evidence.audioRecords[0].record.asset,
    );
    evidence.audioRecords[1].assetBytes = evidence.audioRecords[0].assetBytes;
    const result = await evaluateHsk1UnitEvidenceIntake({
      source,
      evidence,
      nowEpochMs: NOW,
    });

    expect(result.evidenceValid).toBe(false);
    expect(result.audio.reviewedTargets).toBe(89);
    expect(result.validationErrors.some((error: string) =>
      error.includes("audio identity is invalid")
      || error.includes("native audio review is invalid")
      || error.includes("audio-rights review is invalid")
    )).toBe(true);
    expect(result.readyForPackage).toBe(false);
  }, 60_000);

  it("rejects repository-real relabeling of fixture audio receipts", async () => {
    const source = loadHsk1UnitEvidenceIntakeSources();
    const evidence = await fixtureEvidence(source);
    evidence.evidenceMode = "repository-real";
    const result = await evaluateHsk1UnitEvidenceIntake({
      source,
      evidence,
      nowEpochMs: NOW,
    });

    expect(result.evidenceValid).toBe(false);
    expect(result.audio.reviewedTargets).toBe(0);
    expect(result.readyForPackage).toBe(false);
    expect(result.importAuthorized).toBe(false);
  }, 60_000);

  it("rejects report tampering and remains deterministic", async () => {
    const bundle = loadHsk1UnitEvidenceReadinessBundle();
    const forged = structuredClone(bundle.report);
    forged.result.readyForPackage = true;
    expect((await validateHsk1UnitEvidenceReadinessBundle({
      source: bundle.source,
      report: forged,
    })).valid).toBe(false);

    const checked = readFileSync(
      resolve(process.cwd(), HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH),
      "utf8",
    );
    expect(checked).toBe(
      serializeHsk1UnitEvidenceReadiness(
        await buildCheckedHsk1UnitEvidenceReadiness(),
      ),
    );
  }, 30_000);
});
