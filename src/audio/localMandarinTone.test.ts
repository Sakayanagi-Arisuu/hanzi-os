import { describe, expect, it } from "vitest";

import type { MandarinPcmRecording } from "./mandarinPcmRecorder";
import {
  analyzeLocalMandarinTone,
  type MandarinLexicalTone,
} from "./localMandarinTone";

const SAMPLE_RATE = 16_000;

const semitoneProfile = (tone: MandarinLexicalTone, progress: number) => {
  if (tone === 1) return 0;
  if (tone === 2) return -3 + progress * 6.4;
  if (tone === 3) {
    return progress < 0.55
      ? 2.1 - (progress / 0.55) * 4.8
      : -2.7 + ((progress - 0.55) / 0.45) * 4.15;
  }
  return 3.4 - progress * 8.2;
};

const encodeWav = (samples: Float32Array) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  ascii(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(44 + index * 2, Math.round(sample * 0x7fff), true);
  }
  return buffer;
};

const recordingFromSamples = (samples: Float32Array): MandarinPcmRecording => {
  const wav = encodeWav(samples);
  let peakAmplitude = 0;
  let sumSquares = 0;
  let clippedSamples = 0;
  for (const sample of samples) {
    peakAmplitude = Math.max(peakAmplitude, Math.abs(sample));
    sumSquares += sample * sample;
    if (Math.abs(sample) >= 0.99) clippedSamples += 1;
  }
  const clippedSampleRatio = clippedSamples / Math.max(1, samples.length);
  return {
    audio: new Blob([wav], { type: "audio/wav" }),
    byteLength: wav.byteLength,
    mimeType: "audio/wav",
    channels: 1,
    bitsPerSample: 16,
    sampleRate: SAMPLE_RATE,
    quality: {
      durationMs: (samples.length / SAMPLE_RATE) * 1_000,
      sourceSampleRate: SAMPLE_RATE,
      outputSampleRate: SAMPLE_RATE,
      peakAmplitude,
      rmsAmplitude: Math.sqrt(sumSquares / Math.max(1, samples.length)),
      clippedSampleRatio,
      clippingDetected: clippedSampleRatio >= 0.001,
    },
  };
};

const syntheticTone = (
  tone: MandarinLexicalTone,
  baseHz: number,
  durationMs = 900,
  amplitude = 0.42,
) => {
  const sampleCount = Math.round((durationMs / 1_000) * SAMPLE_RATE);
  const samples = new Float32Array(sampleCount);
  const silenceSamples = Math.round(SAMPLE_RATE * 0.08);
  const voicedSamples = sampleCount - silenceSamples * 2;
  let phase = 0;
  for (let index = silenceSamples; index < sampleCount - silenceSamples; index += 1) {
    const progress = (index - silenceSamples) / Math.max(1, voicedSamples - 1);
    const hz = baseHz * 2 ** (semitoneProfile(tone, progress) / 12);
    phase += (2 * Math.PI * hz) / SAMPLE_RATE;
    const envelope = Math.min(1, progress / 0.05, (1 - progress) / 0.05);
    samples[index] = Math.sin(phase) * amplitude * Math.max(0, envelope);
  }
  return recordingFromSamples(samples);
};

describe("analyzeLocalMandarinTone", () => {
  it.each([
    [1, 120],
    [2, 120],
    [3, 120],
    [4, 120],
    [1, 260],
    [2, 260],
    [3, 260],
    [4, 260],
  ] as const)("recognizes a clear tone %i contour around %i Hz", async (tone, baseHz) => {
    const result = await analyzeLocalMandarinTone(syntheticTone(tone, baseHz), {
      tone,
    });

    expect(result.status, JSON.stringify(result)).toBe("analyzed");
    if (result.status === "analyzed") {
      expect(result.closestContour).toBe(tone);
      expect(result.verdict).toBe("resembles-target");
      expect(result.contourSemitones).toHaveLength(11);
      expect(result.masteryEligible).toBe(false);
      expect(result.processing).toBe("local-only");
    }
  });

  it("reports a clearly different contour without inventing a percentage", async () => {
    const result = await analyzeLocalMandarinTone(syntheticTone(4, 175), { tone: 2 });

    expect(result).toMatchObject({
      status: "analyzed",
      closestContour: 4,
      verdict: "different",
      masteryEligible: false,
    });
    expect(result).not.toHaveProperty("score");
    expect(result).not.toHaveProperty("percentage");
  });

  it("fails closed for silence", async () => {
    const result = await analyzeLocalMandarinTone(
      recordingFromSamples(new Float32Array(SAMPLE_RATE)),
      { tone: 1 },
    );

    expect(result).toMatchObject({ status: "unscorable", reason: "insufficient-energy" });
  });

  it("fails closed for a recording that is too short", async () => {
    const result = await analyzeLocalMandarinTone(syntheticTone(1, 180, 250), { tone: 1 });

    expect(result).toMatchObject({ status: "unscorable", reason: "recording-too-short" });
  });

  it("fails closed when clipping is present", async () => {
    const result = await analyzeLocalMandarinTone(syntheticTone(2, 180, 900, 1.2), { tone: 2 });

    expect(result).toMatchObject({ status: "unscorable", reason: "clipping-detected" });
  });

  it("fails closed for deterministic broadband noise", async () => {
    let state = 0x12345678;
    const samples = new Float32Array(SAMPLE_RATE);
    for (let index = 0; index < samples.length; index += 1) {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      samples[index] = ((state / 0xffff_ffff) * 2 - 1) * 0.25;
    }

    const result = await analyzeLocalMandarinTone(recordingFromSamples(samples), { tone: 3 });

    expect(result.status).toBe("unscorable");
    if (result.status === "unscorable") {
      expect(["insufficient-voicing", "unstable-pitch"]).toContain(result.reason);
    }
  });

  it.each([
    [{ tone: 5 as const }, "unsupported-neutral-tone"],
    [{ tone: 2 as const, syllableCount: 2 }, "unsupported-multiple-syllables"],
    [{ tone: 3 as const, speechMode: "connected" as const }, "unsupported-connected-speech"],
  ])("rejects unsupported target modes", async (target, reason) => {
    const result = await analyzeLocalMandarinTone(syntheticTone(2, 180), target);
    expect(result).toMatchObject({ status: "unscorable", reason });
  });

  it("rejects malformed WAV bytes", async () => {
    const recording = recordingFromSamples(new Float32Array(SAMPLE_RATE));
    const malformed = {
      ...recording,
      audio: new Blob([new Uint8Array(44)], { type: "audio/wav" }),
      byteLength: 44,
    };

    const result = await analyzeLocalMandarinTone(malformed, { tone: 1 });

    expect(result).toMatchObject({ status: "unscorable", reason: "invalid-wav" });
  });
});
