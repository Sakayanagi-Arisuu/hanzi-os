export const LOCAL_VOICE_CONSENT_POLICY_VERSION =
  "browser-speech-practice-2026.07.1" as const;

export type LocalVoiceConsentReceipt = {
  schemaVersion: 1;
  policyVersion: typeof LOCAL_VOICE_CONSENT_POLICY_VERSION;
  purpose: "mandarin-pronunciation-practice";
  processingMode: "browser-or-operating-system-speech-recognition";
  grantedAt: string;
};

export const createLocalVoiceConsentReceipt = (
  grantedAt = new Date().toISOString(),
): LocalVoiceConsentReceipt => ({
  schemaVersion: 1,
  policyVersion: LOCAL_VOICE_CONSENT_POLICY_VERSION,
  purpose: "mandarin-pronunciation-practice",
  processingMode: "browser-or-operating-system-speech-recognition",
  grantedAt,
});

export const parseLocalVoiceConsentReceipt = (
  raw: string | null,
): LocalVoiceConsentReceipt | null => {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const receipt = value as Partial<LocalVoiceConsentReceipt>;
    if (
      receipt.schemaVersion !== 1
      || receipt.policyVersion !== LOCAL_VOICE_CONSENT_POLICY_VERSION
      || receipt.purpose !== "mandarin-pronunciation-practice"
      || receipt.processingMode !== "browser-or-operating-system-speech-recognition"
      || typeof receipt.grantedAt !== "string"
      || !Number.isFinite(Date.parse(receipt.grantedAt))
    ) return null;
    return receipt as LocalVoiceConsentReceipt;
  } catch {
    return null;
  }
};
