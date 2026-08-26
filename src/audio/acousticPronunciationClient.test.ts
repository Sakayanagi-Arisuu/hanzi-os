import { describe, expect, it, vi } from "vitest";
import { ACOUSTIC_VOICE_CONSENT_POLICY_VERSION } from "../lib/acousticVoiceConsent";
import {
  AcousticPronunciationClientError,
  assessAcousticPronunciation,
  parseAcousticPronunciationResponse,
} from "./acousticPronunciationClient";

const activityId = "pronunciation:foundation-2026.08.5:ni";
const audio = new Blob([new Uint8Array(64)], { type: "audio/wav" });
const usableQuality = {
  durationMs: 1_000,
  sourceSampleRate: 48_000,
  outputSampleRate: 16_000 as const,
  peakAmplitude: 0.42,
  rmsAmplitude: 0.18,
  clippedSampleRatio: 0,
  clippingDetected: false,
};
const responseBody = {
  schemaVersion: 1,
  activityId,
  assessment: {
    provider: "azure-speech-pronunciation-assessment",
    providerApi: "short-audio-rest-v1",
    locale: "zh-CN",
    transcript: "你好。",
    aggregate: {
      accuracyScore: 82.5,
      fluencyScore: 76,
      completenessScore: 100,
      pronunciationScore: 84,
    },
    words: [
      {
        word: "你好",
        accuracyScore: 82.5,
        errorType: "None",
        phonemes: [{ phoneme: "n", accuracyScore: 81 }],
      },
    ],
    lexicalToneAssessment: "not-reported-by-provider",
    calibration: "unapproved",
    masteryEligible: false,
  },
} as const;

describe("acoustic pronunciation client", () => {
  it("posts a bounded WAV to the same-origin route and parses the strict contract", async () => {
    const captured: { input?: string | URL; init?: RequestInit } = {};
    const fetchImpl = vi.fn(async (input: string | URL, init?: RequestInit) => {
      captured.input = input;
      captured.init = init;
      return Response.json(responseBody);
    });
    await expect(assessAcousticPronunciation({ activityId, audio, fetchImpl }))
      .resolves.toEqual(responseBody);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(captured.input).toBe("/api/speech/pronunciation/assess");
    expect(captured.init).toMatchObject({
      method: "POST",
      body: audio,
      cache: "no-store",
      credentials: "same-origin",
    });
    expect(new Headers(captured.init?.headers).get("x-hanzi-acoustic-consent-policy"))
      .toBe(ACOUSTIC_VOICE_CONSENT_POLICY_VERSION);
    expect(new Headers(captured.init?.headers).get("x-hanzi-pronunciation-activity-id"))
      .toBe(activityId);
  });

  it("fails closed for mismatched activities or impossible provider scores", () => {
    expect(() => parseAcousticPronunciationResponse(
      { ...responseBody, activityId: "pronunciation:other" },
      activityId,
    )).toThrowError(AcousticPronunciationClientError);
    expect(() => parseAcousticPronunciationResponse({
      ...responseBody,
      assessment: {
        ...responseBody.assessment,
        aggregate: { ...responseBody.assessment.aggregate, accuracyScore: 101 },
      },
    }, activityId)).toThrowError("Kết quả chấm âm học chưa hợp lệ");
  });

  it("maps route errors to fixed Vietnamese copy and never retries automatically", async () => {
    const fetchImpl = vi.fn(async () => Response.json({
      error: {
        code: "PRONUNCIATION_NO_MATCH",
        message: "REMOTE SECRET SHOULD NOT LEAK",
        retryable: true,
      },
    }, { status: 422 }));

    const result = assessAcousticPronunciation({ activityId, audio, fetchImpl });
    await expect(result).rejects.toMatchObject({
      code: "no-match",
      userMessage: expect.stringContaining("Chưa nghe rõ đủ câu"),
    });
    await expect(result).rejects.not.toThrow("REMOTE SECRET SHOULD NOT LEAK");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("aborts a hung request at the bounded client timeout", async () => {
    const fetchImpl = vi.fn((_url: string | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      }));
    await expect(assessAcousticPronunciation({
      activityId,
      audio,
      fetchImpl,
      timeoutMs: 5,
    })).rejects.toMatchObject({ code: "timeout" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects unsafe audio before opening the network", async () => {
    const fetchImpl = vi.fn();
    await expect(assessAcousticPronunciation({
      activityId,
      audio: new Blob([new Uint8Array(12)], { type: "audio/wav" }),
      fetchImpl,
    })).rejects.toMatchObject({ code: "invalid-request" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["silence", { ...usableQuality, peakAmplitude: 0.002, rmsAmplitude: 0.0005 }],
    ["clipped audio", { ...usableQuality, clippedSampleRatio: 0.004, clippingDetected: true }],
  ])("rejects %s before upload so it can never produce a provider score", async (_label, quality) => {
    const fetchImpl = vi.fn();
    await expect(assessAcousticPronunciation({
      activityId,
      audio,
      quality,
      fetchImpl,
    })).rejects.toMatchObject({ code: "invalid-request" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
