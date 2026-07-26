import { describe, expect, it, vi } from "vitest";
import {
  SpeechConsentRequiredError,
  SpeechPipeline,
  SpeechPipelineUnavailableError,
  type SpeechPipelineDependencies,
  type SpeechPipelineRequest,
} from "./speechPipeline";

const request = (): SpeechPipelineRequest => ({
  userId: "user-speech",
  consentId: "consent-speech",
  contentVersion: "foundation-v1",
  activityId: "speech:ni-hao",
  activityVersion: "foundation-v1:speech:ni-hao:1",
  audio: {
    objectKey: "private/user-speech/attempt.webm",
    mimeType: "audio/webm",
    byteLength: 120_000,
    sha256: "a".repeat(64),
  },
});

const dependencies = (): Required<SpeechPipelineDependencies> => ({
  enabled: true,
  consentLedger: {
    hasActiveConsent: vi.fn().mockResolvedValue(true),
  },
  objectStorage: {
    isOwnedObject: vi.fn().mockResolvedValue(true),
  },
  activityRegistry: {
    getReleasedTarget: vi.fn().mockResolvedValue({
      activityId: "speech:ni-hao",
      activityVersion: "foundation-v1:speech:ni-hao:1",
      text: "你好",
      syllables: [
        { index: 0, spelling: "ni", lexicalTone: 3, surfaceTone: 2 },
        { index: 1, spelling: "hao", lexicalTone: 3, surfaceTone: 3 },
      ],
    }),
  },
  provider: {
    analyze: vi.fn().mockResolvedValue({
      status: "processed",
      transcript: "你好",
      quality: { signalToNoise: 18, clippingDetected: false },
      syllables: [{
        index: 0,
        alignmentConfidence: 0.9,
        initialConfidence: 0.8,
        finalConfidence: 0.85,
        toneConfidence: 0.7,
        observedTone: 2,
      }],
      provider: "fixture-provider",
      modelVersion: "fixture-model-1",
    }),
  },
});

describe("speech pipeline boundary", () => {
  it("is unavailable by default and exposes every missing prerequisite", async () => {
    const pipeline = new SpeechPipeline();
    expect(pipeline.readiness()).toEqual({
      available: false,
      missing: [
        "feature-flag",
        "consent-ledger",
        "object-storage",
        "activity-registry",
        "acoustic-provider",
      ],
    });
    await expect(pipeline.analyze(request())).rejects.toBeInstanceOf(
      SpeechPipelineUnavailableError,
    );
  });

  it("checks consent before touching storage or the acoustic provider", async () => {
    const deps = dependencies();
    vi.mocked(deps.consentLedger.hasActiveConsent).mockResolvedValue(false);
    const pipeline = new SpeechPipeline(deps);
    await expect(pipeline.analyze(request())).rejects.toBeInstanceOf(
      SpeechConsentRequiredError,
    );
    expect(deps.objectStorage.isOwnedObject).not.toHaveBeenCalled();
    expect(deps.provider.analyze).not.toHaveBeenCalled();
  });

  it("returns inspectable beta feedback without a mastery claim", async () => {
    const deps = dependencies();
    const artifact = await new SpeechPipeline(deps).analyze(request());
    expect(artifact).toMatchObject({
      status: "processed",
      transcript: "你好",
      verification: "server-acoustic-beta",
      scoringPolicyVersion: "acoustic-beta-unapproved",
      skill: "pronunciation",
      masteryEligible: false,
    });
    expect(deps.provider.analyze).toHaveBeenCalledOnce();
  });
});
