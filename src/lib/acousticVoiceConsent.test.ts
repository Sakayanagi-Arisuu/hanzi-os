import { describe, expect, it } from "vitest";
import {
  ACOUSTIC_VOICE_CONSENT_MAX_AGE_MS,
  ACOUSTIC_VOICE_CONSENT_POLICY_VERSION,
  createAcousticVoiceConsentReceipt,
  parseAcousticVoiceConsentReceipt,
} from "./acousticVoiceConsent";

const ownerKey = "anonymous:installation-test";
const grantedAt = new Date("2026-08-13T02:00:00.000Z");

describe("acoustic voice consent", () => {
  it("creates an owner-scoped, expiring receipt for cloud acoustic analysis", () => {
    const receipt = createAcousticVoiceConsentReceipt(ownerKey, grantedAt);
    expect(receipt).toMatchObject({
      policyVersion: ACOUSTIC_VOICE_CONSENT_POLICY_VERSION,
      ownerKey,
      provider: "azure-speech-pronunciation-f0",
      purpose: "mandarin-pronunciation-acoustic-feedback",
      processingMode: "cloud-audio-analysis",
      hanziOsAudioStorage: "transient-memory-only",
    });
    expect(Date.parse(receipt.expiresAt) - Date.parse(receipt.grantedAt))
      .toBe(ACOUSTIC_VOICE_CONSENT_MAX_AGE_MS);
    expect(parseAcousticVoiceConsentReceipt(
      JSON.stringify(receipt),
      ownerKey,
      new Date("2026-08-14T02:00:00.000Z"),
    )).toEqual(receipt);
  });

  it("never treats the existing browser-recognition receipt as cloud consent", () => {
    const localReceipt = JSON.stringify({
      schemaVersion: 1,
      policyVersion: "browser-speech-practice-2026.07.1",
      purpose: "mandarin-pronunciation-practice",
      processingMode: "browser-or-operating-system-speech-recognition",
      grantedAt: grantedAt.toISOString(),
    });
    expect(parseAcousticVoiceConsentReceipt(
      localReceipt,
      ownerKey,
      new Date("2026-08-14T02:00:00.000Z"),
    )).toBeNull();
  });

  it("fails closed for another owner, expiry, future grants, or tampering", () => {
    const receipt = createAcousticVoiceConsentReceipt(ownerKey, grantedAt);
    const serialized = JSON.stringify(receipt);
    expect(parseAcousticVoiceConsentReceipt(
      serialized,
      "account:other",
      new Date("2026-08-14T02:00:00.000Z"),
    )).toBeNull();
    expect(parseAcousticVoiceConsentReceipt(
      serialized,
      ownerKey,
      new Date(receipt.expiresAt),
    )).toBeNull();
    expect(parseAcousticVoiceConsentReceipt(
      serialized,
      ownerKey,
      new Date("2026-08-12T02:00:00.000Z"),
    )).toBeNull();
    expect(parseAcousticVoiceConsentReceipt(
      JSON.stringify({ ...receipt, provider: "unknown-provider" }),
      ownerKey,
      new Date("2026-08-14T02:00:00.000Z"),
    )).toBeNull();
  });

  it.each([null, "true", "not-json", "{}"])(
    "rejects malformed input: %s",
    (raw) => {
      expect(parseAcousticVoiceConsentReceipt(
        raw,
        ownerKey,
        new Date("2026-08-14T02:00:00.000Z"),
      )).toBeNull();
    },
  );
});
