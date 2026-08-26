import type { MandarinPcmRecording } from "./mandarinPcmRecorder";

export const LOCAL_MANDARIN_TONE_METHOD_VERSION = "local-isolated-tone-contour-v1";

export type MandarinLexicalTone = 1 | 2 | 3 | 4;

export interface LocalMandarinToneTarget {
  /** Neutral tone (0/5) is accepted only so callers receive an explicit unsupported result. */
  tone: MandarinLexicalTone | 0 | 5;
  syllableCount?: number;
  speechMode?: "isolated" | "connected";
}

export type LocalMandarinToneVerdict =
  | "resembles-target"
  | "uncertain"
  | "different";

export type LocalMandarinToneUnscorableReason =
  | "unsupported-neutral-tone"
  | "unsupported-multiple-syllables"
  | "unsupported-connected-speech"
  | "invalid-wav"
  | "recording-too-short"
  | "recording-too-long"
  | "clipping-detected"
  | "insufficient-energy"
  | "insufficient-voicing"
  | "unstable-pitch";

interface LocalMandarinToneBaseResult {
  methodVersion: typeof LOCAL_MANDARIN_TONE_METHOD_VERSION;
  masteryEligible: false;
  processing: "local-only";
  targetTone: MandarinLexicalTone | null;
}

export interface LocalMandarinToneAnalyzedResult extends LocalMandarinToneBaseResult {
  status: "analyzed";
  targetTone: MandarinLexicalTone;
  closestContour: MandarinLexicalTone;
  verdict: LocalMandarinToneVerdict;
  /** Eleven time-normalized F0 values in semitones relative to this utterance's median. */
  contourSemitones: readonly number[];
  signalQuality: "usable" | "borderline";
  diagnostics: {
    durationMs: number;
    activeFrameCount: number;
    voicedFrameCount: number;
    medianPitchHz: number;
    semitoneSpan: number;
  };
}

export interface LocalMandarinToneUnscorableResult extends LocalMandarinToneBaseResult {
  status: "unscorable";
  reason: LocalMandarinToneUnscorableReason;
}

export type LocalMandarinToneResult =
  | LocalMandarinToneAnalyzedResult
  | LocalMandarinToneUnscorableResult;

const SAMPLE_RATE = 16_000;
const MIN_DURATION_MS = 360;
const MAX_DURATION_MS = 2_500;
const FRAME_SAMPLES = 640;
const HOP_SAMPLES = 160;
const MIN_PITCH_HZ = 70;
const MAX_PITCH_HZ = 500;
const MIN_PITCH_LAG = Math.floor(SAMPLE_RATE / MAX_PITCH_HZ);
const MAX_PITCH_LAG = Math.ceil(SAMPLE_RATE / MIN_PITCH_HZ);
const MIN_FRAME_RMS = 0.006;
const MIN_VOICED_FRAMES = 12;
const CONTOUR_POINTS = 11;

const isLexicalTone = (tone: number): tone is MandarinLexicalTone =>
  tone === 1 || tone === 2 || tone === 3 || tone === 4;

const unscorable = (
  reason: LocalMandarinToneUnscorableReason,
  targetTone: MandarinLexicalTone | null,
): LocalMandarinToneUnscorableResult => ({
  status: "unscorable",
  reason,
  targetTone,
  methodVersion: LOCAL_MANDARIN_TONE_METHOD_VERSION,
  masteryEligible: false,
  processing: "local-only",
});

const readAscii = (view: DataView, offset: number, length: number) => {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(view.getUint8(offset + index));
  }
  return value;
};

interface ParsedWav {
  samples: Float32Array;
  durationMs: number;
  clippedSampleRatio: number;
}

const parsePcm16Mono16KhzWav = (buffer: ArrayBuffer): ParsedWav | null => {
  if (buffer.byteLength < 44) {
    return null;
  }

  const view = new DataView(buffer);
  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    return null;
  }
  const declaredRiffEnd = view.getUint32(4, true) + 8;
  if (declaredRiffEnd > buffer.byteLength || declaredRiffEnd < 12) {
    return null;
  }

  let offset = 12;
  let formatValid = false;
  let dataOffset = -1;
  let dataLength = 0;
  while (offset + 8 <= declaredRiffEnd) {
    const chunkId = readAscii(view, offset, 4);
    const chunkLength = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > declaredRiffEnd || chunkEnd > buffer.byteLength) {
      return null;
    }

    if (chunkId === "fmt ") {
      if (chunkLength < 16) {
        return null;
      }
      formatValid =
        view.getUint16(chunkStart, true) === 1 &&
        view.getUint16(chunkStart + 2, true) === 1 &&
        view.getUint32(chunkStart + 4, true) === SAMPLE_RATE &&
        view.getUint16(chunkStart + 14, true) === 16;
    } else if (chunkId === "data" && dataOffset < 0) {
      dataOffset = chunkStart;
      dataLength = chunkLength;
    }
    offset = chunkEnd + (chunkLength % 2);
  }

  if (!formatValid || dataOffset < 0 || dataLength < 2 || dataLength % 2 !== 0) {
    return null;
  }

  const sampleCount = dataLength / 2;
  const samples = new Float32Array(sampleCount);
  let clippedSamples = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const pcm = view.getInt16(dataOffset + index * 2, true);
    samples[index] = pcm < 0 ? pcm / 0x8000 : pcm / 0x7fff;
    if (Math.abs(pcm) >= 32_440) {
      clippedSamples += 1;
    }
  }

  return {
    samples,
    durationMs: (sampleCount / SAMPLE_RATE) * 1_000,
    clippedSampleRatio: clippedSamples / sampleCount,
  };
};

const rms = (samples: Float32Array, start = 0, length = samples.length) => {
  let sumSquares = 0;
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += samples[start + index] ?? 0;
  }
  const mean = length > 0 ? sum / length : 0;
  for (let index = 0; index < length; index += 1) {
    const centered = (samples[start + index] ?? 0) - mean;
    sumSquares += centered * centered;
  }
  return length > 0 ? Math.sqrt(sumSquares / length) : 0;
};

interface PitchFrame {
  hz: number;
  confidence: number;
}

const estimatePitch = (samples: Float32Array, start: number): PitchFrame | null => {
  const frame = new Float64Array(FRAME_SAMPLES);
  let mean = 0;
  for (let index = 0; index < FRAME_SAMPLES; index += 1) {
    mean += samples[start + index] ?? 0;
  }
  mean /= FRAME_SAMPLES;

  let frameEnergy = 0;
  for (let index = 0; index < FRAME_SAMPLES; index += 1) {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (FRAME_SAMPLES - 1));
    const value = ((samples[start + index] ?? 0) - mean) * hann;
    frame[index] = value;
    frameEnergy += value * value;
  }
  if (frameEnergy <= 1e-10) {
    return null;
  }

  const correlations = new Float64Array(MAX_PITCH_LAG + 2);
  let bestCorrelation = -1;
  for (let lag = MIN_PITCH_LAG; lag <= MAX_PITCH_LAG + 1; lag += 1) {
    let cross = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    const comparedSamples = FRAME_SAMPLES - lag;
    for (let index = 0; index < comparedSamples; index += 1) {
      const left = frame[index] ?? 0;
      const right = frame[index + lag] ?? 0;
      cross += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    const correlation = denominator > 1e-10 ? cross / denominator : 0;
    correlations[lag] = correlation;
    if (lag <= MAX_PITCH_LAG) {
      bestCorrelation = Math.max(bestCorrelation, correlation);
    }
  }

  if (bestCorrelation < 0.68) {
    return null;
  }

  let selectedLag = -1;
  const acceptablePeak = Math.max(0.68, bestCorrelation * 0.88);
  for (let lag = MIN_PITCH_LAG + 1; lag < MAX_PITCH_LAG; lag += 1) {
    const current = correlations[lag] ?? 0;
    if (
      current >= acceptablePeak &&
      current >= (correlations[lag - 1] ?? 0) &&
      current >= (correlations[lag + 1] ?? 0)
    ) {
      selectedLag = lag;
      break;
    }
  }
  if (selectedLag < 0) {
    return null;
  }

  const left = correlations[selectedLag - 1] ?? 0;
  const center = correlations[selectedLag] ?? 0;
  const right = correlations[selectedLag + 1] ?? 0;
  const curvature = left - 2 * center + right;
  const adjustment = Math.abs(curvature) > 1e-8
    ? Math.max(-0.5, Math.min(0.5, 0.5 * (left - right) / curvature))
    : 0;
  const refinedLag = selectedLag + adjustment;
  const hz = SAMPLE_RATE / refinedLag;
  if (!Number.isFinite(hz) || hz < MIN_PITCH_HZ || hz > MAX_PITCH_HZ) {
    return null;
  }
  return { hz, confidence: center };
};

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }
  return sorted[middle] ?? 0;
};

const medianSmooth = (values: readonly number[]) =>
  values.map((value, index) => {
    const neighbors = [values[index - 1], value, values[index + 1]].filter(
      (candidate): candidate is number => candidate !== undefined,
    );
    return median(neighbors);
  });

const resampleContour = (values: readonly number[], pointCount: number) => {
  if (values.length === 1) {
    return Array.from({ length: pointCount }, () => values[0] ?? 0);
  }
  return Array.from({ length: pointCount }, (_, pointIndex) => {
    const position = (pointIndex / (pointCount - 1)) * (values.length - 1);
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(values.length - 1, leftIndex + 1);
    const fraction = position - leftIndex;
    const left = values[leftIndex] ?? 0;
    const right = values[rightIndex] ?? left;
    return left + (right - left) * fraction;
  });
};

const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

const pearsonCorrelation = (left: readonly number[], right: readonly number[]) => {
  const leftMean = mean(left);
  const rightMean = mean(right);
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftCentered = (left[index] ?? 0) - leftMean;
    const rightCentered = (right[index] ?? 0) - rightMean;
    numerator += leftCentered * rightCentered;
    leftSquares += leftCentered * leftCentered;
    rightSquares += rightCentered * rightCentered;
  }
  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator > 1e-8 ? numerator / denominator : 0;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const TONE_TEMPLATES: Record<2 | 3 | 4, readonly number[]> = {
  2: [-3, -2.7, -2.25, -1.7, -1.05, -0.3, 0.5, 1.35, 2.15, 2.85, 3.4],
  3: [2.1, 1.5, 0.7, -0.2, -1.35, -2.4, -2.7, -2.05, -0.9, 0.35, 1.45],
  4: [3.4, 2.75, 2.1, 1.35, 0.55, -0.35, -1.3, -2.3, -3.25, -4.1, -4.8],
};

const classifyContour = (contour: readonly number[]) => {
  const contourMin = Math.min(...contour);
  const contourMax = Math.max(...contour);
  const span = contourMax - contourMin;
  const start = mean(contour.slice(0, 3));
  const end = mean(contour.slice(-3));
  const middle = mean(contour.slice(4, 7));
  const scores: Record<MandarinLexicalTone, number> = {
    1: clamp01(1 - span / 2.2) * clamp01(1 - Math.abs(end - start) / 1.5),
    2:
      clamp01((pearsonCorrelation(contour, TONE_TEMPLATES[2]) - 0.48) / 0.52) *
      clamp01((end - start - 1.2) / 2.8),
    3:
      clamp01((pearsonCorrelation(contour, TONE_TEMPLATES[3]) - 0.42) / 0.58) *
      clamp01((Math.min(start, end) - middle - 0.7) / 2.1),
    4:
      clamp01((pearsonCorrelation(contour, TONE_TEMPLATES[4]) - 0.48) / 0.52) *
      clamp01((start - end - 1.5) / 3),
  };
  const ranked = (Object.entries(scores) as [string, number][])
    .map(([tone, score]) => ({ tone: Number(tone) as MandarinLexicalTone, score }))
    .sort((left, right) => right.score - left.score);
  return {
    closest: ranked[0]?.tone ?? 1,
    bestScore: ranked[0]?.score ?? 0,
    margin: (ranked[0]?.score ?? 0) - (ranked[1]?.score ?? 0),
    span,
  };
};

/**
 * Compares the F0 shape of one isolated, clearly spoken Mandarin syllable.
 * This is deliberately not a pronunciation or native-likeness score: initials,
 * finals and connected-speech tone sandhi require a validated acoustic model.
 */
export const analyzeLocalMandarinTone = async (
  recording: MandarinPcmRecording,
  target: LocalMandarinToneTarget,
): Promise<LocalMandarinToneResult> => {
  if (!isLexicalTone(target.tone)) {
    return unscorable("unsupported-neutral-tone", null);
  }
  const targetTone = target.tone;
  if ((target.syllableCount ?? 1) !== 1) {
    return unscorable("unsupported-multiple-syllables", targetTone);
  }
  if ((target.speechMode ?? "isolated") !== "isolated") {
    return unscorable("unsupported-connected-speech", targetTone);
  }

  if (
    recording.mimeType !== "audio/wav" ||
    recording.channels !== 1 ||
    recording.bitsPerSample !== 16 ||
    recording.sampleRate !== SAMPLE_RATE ||
    recording.byteLength !== recording.audio.size
  ) {
    return unscorable("invalid-wav", targetTone);
  }

  let parsed: ParsedWav | null;
  try {
    parsed = parsePcm16Mono16KhzWav(await recording.audio.arrayBuffer());
  } catch {
    return unscorable("invalid-wav", targetTone);
  }
  if (!parsed) {
    return unscorable("invalid-wav", targetTone);
  }
  if (parsed.durationMs < MIN_DURATION_MS) {
    return unscorable("recording-too-short", targetTone);
  }
  if (parsed.durationMs > MAX_DURATION_MS) {
    return unscorable("recording-too-long", targetTone);
  }
  if (
    recording.quality.clippingDetected ||
    recording.quality.clippedSampleRatio >= 0.001 ||
    parsed.clippedSampleRatio >= 0.001
  ) {
    return unscorable("clipping-detected", targetTone);
  }
  if (rms(parsed.samples) < MIN_FRAME_RMS) {
    return unscorable("insufficient-energy", targetTone);
  }

  const frameStarts: number[] = [];
  const frameRmsValues: number[] = [];
  for (
    let start = 0;
    start + FRAME_SAMPLES <= parsed.samples.length;
    start += HOP_SAMPLES
  ) {
    frameStarts.push(start);
    frameRmsValues.push(rms(parsed.samples, start, FRAME_SAMPLES));
  }
  const peakFrameRms = Math.max(0, ...frameRmsValues);
  const activeThreshold = Math.max(MIN_FRAME_RMS, peakFrameRms * 0.18);
  const activeIndices = frameRmsValues
    .map((frameRms, index) => ({ frameRms, index }))
    .filter(({ frameRms }) => frameRms >= activeThreshold)
    .map(({ index }) => index);
  if (activeIndices.length < MIN_VOICED_FRAMES) {
    return unscorable("insufficient-voicing", targetTone);
  }

  const pitches: PitchFrame[] = [];
  for (const frameIndex of activeIndices) {
    const pitch = estimatePitch(parsed.samples, frameStarts[frameIndex] ?? 0);
    if (pitch) {
      pitches.push(pitch);
    }
  }
  if (
    pitches.length < MIN_VOICED_FRAMES ||
    pitches.length / activeIndices.length < 0.72
  ) {
    return unscorable("insufficient-voicing", targetTone);
  }

  const medianConfidence = median(pitches.map(({ confidence }) => confidence));
  if (medianConfidence < 0.7) {
    return unscorable("unstable-pitch", targetTone);
  }
  const smoothedPitches = medianSmooth(pitches.map(({ hz }) => hz));
  const medianPitchHz = median(smoothedPitches);
  const rawSemitones = smoothedPitches.map(
    (hz) => 12 * Math.log2(hz / medianPitchHz),
  );
  const contour = resampleContour(rawSemitones, CONTOUR_POINTS);
  const { closest, bestScore, margin, span } = classifyContour(contour);

  let verdict: LocalMandarinToneVerdict = "uncertain";
  if (closest === targetTone && bestScore >= 0.72 && margin >= 0.08) {
    verdict = "resembles-target";
  } else if (closest !== targetTone && bestScore >= 0.78 && margin >= 0.12) {
    verdict = "different";
  }

  return {
    status: "analyzed",
    targetTone,
    closestContour: closest,
    verdict,
    contourSemitones: contour.map((value) => Math.round(value * 100) / 100),
    signalQuality:
      medianConfidence >= 0.84 && pitches.length / activeIndices.length >= 0.85
        ? "usable"
        : "borderline",
    diagnostics: {
      durationMs: Math.round(parsed.durationMs),
      activeFrameCount: activeIndices.length,
      voicedFrameCount: pitches.length,
      medianPitchHz: Math.round(medianPitchHz * 10) / 10,
      semitoneSpan: Math.round(span * 100) / 100,
    },
    methodVersion: LOCAL_MANDARIN_TONE_METHOD_VERSION,
    masteryEligible: false,
    processing: "local-only",
  };
};
