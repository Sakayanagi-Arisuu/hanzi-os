export const ACOUSTIC_VOICE_CONSENT_STORAGE_KEY =
  "hanzi-os-acoustic-voice-consent-v1" as const;

export const ACOUSTIC_VOICE_CONSENT_POLICY_VERSION =
  "azure-speech-f0-acoustic-beta-2026.08.1" as const;

export const ACOUSTIC_VOICE_CONSENT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000;

export type AcousticVoiceConsentReceipt = {
  schemaVersion: 1;
  policyVersion: typeof ACOUSTIC_VOICE_CONSENT_POLICY_VERSION;
  ownerKey: string;
  provider: "azure-speech-pronunciation-f0";
  purpose: "mandarin-pronunciation-acoustic-feedback";
  processingMode: "cloud-audio-analysis";
  dataCategories: [
    "microphone-recording",
    "reference-text",
    "technical-metadata",
  ];
  hanziOsAudioStorage: "transient-memory-only";
  providerProcessingNotice: "provider-policy-applies";
  grantedAt: string;
  expiresAt: string;
};

const validOwnerKey = (ownerKey: string) => {
  const trimmed = ownerKey.trim();
  return trimmed.length > 0 && trimmed.length <= 160 && trimmed === ownerKey;
};

export const createAcousticVoiceConsentReceipt = (
  ownerKey: string,
  grantedAt = new Date(),
): AcousticVoiceConsentReceipt => {
  if (!validOwnerKey(ownerKey) || !Number.isFinite(grantedAt.getTime())) {
    throw new TypeError("A valid learner owner and grant time are required.");
  }
  return {
    schemaVersion: 1,
    policyVersion: ACOUSTIC_VOICE_CONSENT_POLICY_VERSION,
    ownerKey,
    provider: "azure-speech-pronunciation-f0",
    purpose: "mandarin-pronunciation-acoustic-feedback",
    processingMode: "cloud-audio-analysis",
    dataCategories: [
      "microphone-recording",
      "reference-text",
      "technical-metadata",
    ],
    hanziOsAudioStorage: "transient-memory-only",
    providerProcessingNotice: "provider-policy-applies",
    grantedAt: grantedAt.toISOString(),
    expiresAt: new Date(
      grantedAt.getTime() + ACOUSTIC_VOICE_CONSENT_MAX_AGE_MS,
    ).toISOString(),
  };
};

const exactDataCategories = (value: unknown) =>
  Array.isArray(value)
  && value.length === 3
  && value[0] === "microphone-recording"
  && value[1] === "reference-text"
  && value[2] === "technical-metadata";

export const parseAcousticVoiceConsentReceipt = (
  raw: string | null,
  expectedOwnerKey: string,
  now = new Date(),
): AcousticVoiceConsentReceipt | null => {
  if (!raw || !validOwnerKey(expectedOwnerKey) || !Number.isFinite(now.getTime())) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const receipt = value as Partial<AcousticVoiceConsentReceipt>;
    const grantedAt = typeof receipt.grantedAt === "string"
      ? Date.parse(receipt.grantedAt)
      : Number.NaN;
    const expiresAt = typeof receipt.expiresAt === "string"
      ? Date.parse(receipt.expiresAt)
      : Number.NaN;
    if (
      receipt.schemaVersion !== 1
      || receipt.policyVersion !== ACOUSTIC_VOICE_CONSENT_POLICY_VERSION
      || receipt.ownerKey !== expectedOwnerKey
      || receipt.provider !== "azure-speech-pronunciation-f0"
      || receipt.purpose !== "mandarin-pronunciation-acoustic-feedback"
      || receipt.processingMode !== "cloud-audio-analysis"
      || !exactDataCategories(receipt.dataCategories)
      || receipt.hanziOsAudioStorage !== "transient-memory-only"
      || receipt.providerProcessingNotice !== "provider-policy-applies"
      || !Number.isFinite(grantedAt)
      || !Number.isFinite(expiresAt)
      || expiresAt - grantedAt !== ACOUSTIC_VOICE_CONSENT_MAX_AGE_MS
      || grantedAt > now.getTime()
      || expiresAt <= now.getTime()
    ) return null;
    return receipt as AcousticVoiceConsentReceipt;
  } catch {
    return null;
  }
};
