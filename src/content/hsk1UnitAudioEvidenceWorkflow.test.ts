import { describe, expect, it } from "vitest";
import {
  buildHsk1UnitAudioReviewDocument,
  validateCompletedHsk1UnitAudioReviewDocument,
  validateHsk1UnitAudioEvidenceWorkflow,
} from "./hsk1UnitAudioEvidenceWorkflow.mjs";

const NOW = Date.parse("2026-07-31T12:00:00.000Z");
const AUDIO_TARGET_ID =
  "hsk1-time-place-events:01-numbers:hsk-vocab-00002:listening:audio";

const makeWave = (seed = 1) => {
  const sampleRateHz = 16_000;
  const frameCount = sampleRateHz / 4;
  const dataByteLength = frameCount * 2;
  const bytes = new Uint8Array(44 + dataByteLength);
  const view = new DataView(bytes.buffer);
  const fourCc = (offset: number, value: string) => {
    for (let index = 0; index < 4; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  };
  fourCc(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  fourCc(8, "WAVE");
  fourCc(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, sampleRateHz * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  fourCc(36, "data");
  view.setUint32(40, dataByteLength, true);
  for (let index = 0; index < frameCount; index += 1) {
    view.setInt16(44 + index * 2, (index + seed) % 127, true);
  }
  return bytes;
};

const input = () => ({
  recordId: "hsk1-audio-evidence-fixture-001",
  audioTargetId: AUDIO_TARGET_ID,
  assetBytes: makeWave(),
  speakerId: "speaker-fixture",
  languageTag: "cmn-Hans",
  recordedAt: "2026-07-31T09:00:00.000Z",
  speakerConsentRelativePath: "audio/evidence/speaker-consent-fixture.txt",
  speakerConsentBytes: new TextEncoder().encode("speaker consent fixture"),
  rightsRelativePath: "audio/evidence/rights-grant-fixture.txt",
  rightsEvidenceBytes: new TextEncoder().encode("rights grant fixture"),
  assignedBy: "audio-coordinator-fixture",
  nativeReviewerId: "native-reviewer-fixture",
  audioRightsReviewerId: "rights-reviewer-fixture",
  assignedAt: "2026-07-31T10:00:00.000Z",
  nowEpochMs: NOW,
});

describe("HSK1 atomic-unit real audio evidence workflow", () => {
  it("binds the exact 90-target inventory without importing evidence", async () => {
    await expect(validateHsk1UnitAudioEvidenceWorkflow()).resolves.toEqual({
      packetId: "hsk1-time-place-events-reviewer-packet-2026.07.1",
      packetSha256:
        "sha256:0607206985b7b96552e99786858c04efd6693336d78c6356b6d4e5ef7e90a7bb",
      unitReleaseDigest:
        "sha256:a81c562250348e1dac4bf474bdc40da303f0e6084eed342d1fa7ec62618de5a2",
      audioTargets: 90,
      dialogueTargets: 9,
      vocabularyTargets: 81,
      importedRecords: 0,
      packageOrRuntimeMutations: 0,
    });
  }, 30_000);

  it("requires two completed independent reviews before creating a local record", async () => {
    const args = input();
    const document = await buildHsk1UnitAudioReviewDocument(args);

    expect(document.assignment).toMatchObject({
      recordId: args.recordId,
      audioTargetId: AUDIO_TARGET_ID,
      targetKind: "listening-selection",
      expectedFileName:
        "hsk1-time-place-events__01-numbers__hsk-vocab-00002__listening__audio.wav",
      script: {
        scriptKind: "single-lexeme",
        transcriptHanzi: "八",
        pronunciationPinyin: "bā",
      },
      policy: {
        exportDoesNotApproveAudio: true,
        importDoesNotAuthorizePackageOrRuntime: true,
        grantsMeasurementOrMastery: false,
      },
    });
    expect(document.response.nativeReview.outcome).toBeNull();
    expect(document.response.audioRightsReview.outcome).toBeNull();

    const completed = structuredClone(document);
    for (const review of [
      completed.response.nativeReview,
      completed.response.audioRightsReview,
    ]) {
      Reflect.set(review, "reviewedAt", "2026-07-31T11:00:00.000Z");
      Reflect.set(review, "outcome", "approved");
      for (const key of Object.keys(review.decisions)) {
        Reflect.set(review.decisions, key, true);
      }
    }
    const result = await validateCompletedHsk1UnitAudioReviewDocument(
      completed,
      {
        assetBytes: args.assetBytes,
        speakerConsentBytes: args.speakerConsentBytes,
        rightsEvidenceBytes: args.rightsEvidenceBytes,
        nowEpochMs: NOW,
      },
    );

    expect(result).toMatchObject({
      valid: true,
      errors: [],
      record: {
        recordId: args.recordId,
        audioTargetId: AUDIO_TARGET_ID,
        evidenceClass: "repository-real",
        nativeReview: {
          reviewerId: args.nativeReviewerId,
          outcome: "approved",
          receiptSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
        },
        audioRightsReview: {
          reviewerId: args.audioRightsReviewerId,
          outcome: "approved",
          receiptSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
        },
        recordSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      },
    });
  }, 60_000);

  it("rejects reviewer/speaker reuse and an incomplete review response", async () => {
    const reused = input();
    reused.audioRightsReviewerId = reused.speakerId;
    await expect(buildHsk1UnitAudioReviewDocument(reused)).rejects.toThrow(
      "must differ",
    );

    const args = input();
    const incomplete = await buildHsk1UnitAudioReviewDocument(args);
    const result = await validateCompletedHsk1UnitAudioReviewDocument(
      incomplete,
      {
        assetBytes: args.assetBytes,
        speakerConsentBytes: args.speakerConsentBytes,
        rightsEvidenceBytes: args.rightsEvidenceBytes,
        nowEpochMs: NOW,
      },
    );
    expect(result.valid).toBe(false);
    expect(result.record).toBeNull();
    expect(result.errors).toEqual(expect.arrayContaining([
      "Native Mandarin audio review must approve every exact checklist decision",
      "Audio rights review must approve every exact checklist decision",
    ]));
  }, 30_000);
});
