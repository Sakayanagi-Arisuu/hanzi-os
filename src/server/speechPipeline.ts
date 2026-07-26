export const SPEECH_PIPELINE_NOTICE_VERSION = "voice-notice-v2-draft";
export const SPEECH_SCORING_POLICY_VERSION = "acoustic-beta-unapproved";

export type SpeechPipelineReadiness = {
  available: boolean;
  missing: Array<
    | "feature-flag"
    | "consent-ledger"
    | "object-storage"
    | "activity-registry"
    | "acoustic-provider"
  >;
};

export type SpeechAudioObjectReference = {
  objectKey: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
};

export type ReleasedSpeechTarget = {
  activityId: string;
  activityVersion: string;
  text: string;
  syllables: Array<{
    index: number;
    spelling: string;
    lexicalTone: number;
    surfaceTone: number;
  }>;
};

export type AcousticProviderResult = {
  status: "processed" | "insufficient-quality";
  transcript: string | null;
  quality: {
    signalToNoise: number | null;
    clippingDetected: boolean;
  };
  syllables: Array<{
    index: number;
    alignmentConfidence: number;
    initialConfidence: number | null;
    finalConfidence: number | null;
    toneConfidence: number | null;
    observedTone: number | null;
  }>;
  provider: string;
  modelVersion: string;
};

export type SpeechFeedbackArtifact = AcousticProviderResult & {
  verification: "server-acoustic-beta";
  scoringPolicyVersion: typeof SPEECH_SCORING_POLICY_VERSION;
  skill: "pronunciation";
  masteryEligible: false;
};

export type SpeechPipelineRequest = {
  userId: string;
  consentId: string;
  contentVersion: string;
  activityId: string;
  activityVersion: string;
  audio: SpeechAudioObjectReference;
};

export type VoiceConsentLedger = {
  hasActiveConsent(input: {
    userId: string;
    consentId: string;
    noticeVersion: string;
    purpose: "pronunciation-feedback";
  }): Promise<boolean>;
};

export type VoiceObjectStorage = {
  isOwnedObject(input: {
    userId: string;
    objectKey: string;
    sha256: string;
    byteLength: number;
    mimeType: string;
  }): Promise<boolean>;
};

export type SpeechActivityRegistry = {
  getReleasedTarget(input: {
    contentVersion: string;
    activityId: string;
    activityVersion: string;
  }): Promise<ReleasedSpeechTarget | null>;
};

export type AcousticSpeechProvider = {
  analyze(input: {
    audio: SpeechAudioObjectReference;
    target: ReleasedSpeechTarget;
  }): Promise<AcousticProviderResult>;
};

export type SpeechPipelineDependencies = {
  enabled?: boolean;
  consentLedger?: VoiceConsentLedger;
  objectStorage?: VoiceObjectStorage;
  activityRegistry?: SpeechActivityRegistry;
  provider?: AcousticSpeechProvider;
};

export class SpeechPipelineUnavailableError extends Error {
  readonly code = "SPEECH_PIPELINE_UNAVAILABLE";
}

export class SpeechConsentRequiredError extends Error {
  readonly code = "SPEECH_CONSENT_REQUIRED";
}

export class SpeechAudioUnavailableError extends Error {
  readonly code = "SPEECH_AUDIO_UNAVAILABLE";
}

export class SpeechActivityUnavailableError extends Error {
  readonly code = "SPEECH_ACTIVITY_UNAVAILABLE";
}

const boundedRequest = (request: SpeechPipelineRequest) =>
  request.userId.length > 0
  && request.userId.length <= 160
  && request.consentId.length > 0
  && request.consentId.length <= 160
  && request.contentVersion.length > 0
  && request.contentVersion.length <= 160
  && request.activityId.length > 0
  && request.activityId.length <= 240
  && request.activityVersion.length > 0
  && request.activityVersion.length <= 160
  && request.audio.objectKey.length > 0
  && request.audio.objectKey.length <= 500
  && request.audio.mimeType.length > 0
  && request.audio.mimeType.length <= 100
  && Number.isSafeInteger(request.audio.byteLength)
  && request.audio.byteLength > 0
  && request.audio.byteLength <= 8_000_000
  && /^[a-f0-9]{64}$/u.test(request.audio.sha256);

export class SpeechPipeline {
  constructor(private readonly dependencies: SpeechPipelineDependencies = {}) {}

  readiness(): SpeechPipelineReadiness {
    const missing: SpeechPipelineReadiness["missing"] = [];
    if (this.dependencies.enabled !== true) missing.push("feature-flag");
    if (!this.dependencies.consentLedger) missing.push("consent-ledger");
    if (!this.dependencies.objectStorage) missing.push("object-storage");
    if (!this.dependencies.activityRegistry) missing.push("activity-registry");
    if (!this.dependencies.provider) missing.push("acoustic-provider");
    return { available: missing.length === 0, missing };
  }

  /**
   * Internal orchestration contract only. It consumes an already-owned object
   * reference; this module intentionally exposes no HTTP upload endpoint.
   */
  async analyze(request: SpeechPipelineRequest): Promise<SpeechFeedbackArtifact> {
    const readiness = this.readiness();
    if (!readiness.available) {
      throw new SpeechPipelineUnavailableError(
        `Speech pipeline prerequisites are missing: ${readiness.missing.join(", ")}.`,
      );
    }
    if (!boundedRequest(request)) {
      throw new SpeechAudioUnavailableError("Speech request exceeds safe bounds.");
    }
    const { consentLedger, objectStorage, activityRegistry, provider } =
      this.dependencies as Required<SpeechPipelineDependencies>;
    const consented = await consentLedger.hasActiveConsent({
      userId: request.userId,
      consentId: request.consentId,
      noticeVersion: SPEECH_PIPELINE_NOTICE_VERSION,
      purpose: "pronunciation-feedback",
    });
    if (!consented) {
      throw new SpeechConsentRequiredError(
        "A current, purpose-specific voice consent is required.",
      );
    }
    const owned = await objectStorage.isOwnedObject({
      userId: request.userId,
      objectKey: request.audio.objectKey,
      sha256: request.audio.sha256,
      byteLength: request.audio.byteLength,
      mimeType: request.audio.mimeType,
    });
    if (!owned) {
      throw new SpeechAudioUnavailableError(
        "Audio object is absent, mismatched, or owned by another learner.",
      );
    }
    const target = await activityRegistry.getReleasedTarget({
      contentVersion: request.contentVersion,
      activityId: request.activityId,
      activityVersion: request.activityVersion,
    });
    if (!target) {
      throw new SpeechActivityUnavailableError(
        "Speech activity is not released for this content version.",
      );
    }
    const result = await provider.analyze({ audio: request.audio, target });
    return {
      ...result,
      verification: "server-acoustic-beta",
      scoringPolicyVersion: SPEECH_SCORING_POLICY_VERSION,
      skill: "pronunciation",
      // Processing provenance is inspectable, but the beta has no calibrated
      // mastery policy or native-fixture approval yet.
      masteryEligible: false,
    };
  }
}
