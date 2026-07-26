import { describe, expect, it } from "vitest";
import {
  createLocalVoiceConsentReceipt,
  LOCAL_VOICE_CONSENT_POLICY_VERSION,
  parseLocalVoiceConsentReceipt,
} from "./voiceConsent";

describe("local voice consent receipt", () => {
  it("accepts only the current explicit browser-recognition policy", () => {
    const receipt = createLocalVoiceConsentReceipt(
      "2026-07-22T07:00:00.000Z",
    );
    expect(parseLocalVoiceConsentReceipt(JSON.stringify(receipt))).toEqual(
      receipt,
    );
  });

  it.each([
    "true",
    "not-json",
    JSON.stringify({ version: 1, grantedAt: "2026-07-22T07:00:00.000Z" }),
    JSON.stringify({
      ...createLocalVoiceConsentReceipt(),
      policyVersion: `${LOCAL_VOICE_CONSENT_POLICY_VERSION}-stale`,
    }),
    JSON.stringify({
      ...createLocalVoiceConsentReceipt(),
      grantedAt: "not-a-date",
    }),
  ])("rejects missing, stale, or malformed consent: %s", (raw) => {
    expect(parseLocalVoiceConsentReceipt(raw)).toBeNull();
  });
});
