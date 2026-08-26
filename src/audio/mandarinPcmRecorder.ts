export const MANDARIN_PCM_SAMPLE_RATE = 16_000;
export const MANDARIN_PCM_CHANNELS = 1;
export const MANDARIN_PCM_BITS_PER_SAMPLE = 16;
export const MANDARIN_RECORDER_HARD_MAX_DURATION_MS = 15_000;
export const MANDARIN_RECORDER_SAFE_MAX_BYTES = 512 * 1_024;
export const MANDARIN_RECORDER_DEFAULT_MIN_DURATION_MS = 250;

export type MandarinRecorderErrorCode =
  | "permission-denied"
  | "device-unavailable"
  | "unsupported"
  | "too-short"
  | "too-large"
  | "aborted"
  | "invalid-state"
  | "invalid-config";

export class MandarinRecorderError extends Error {
  readonly code: MandarinRecorderErrorCode;

  constructor(code: MandarinRecorderErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "MandarinRecorderError";
    this.code = code;
  }
}

export type MandarinPcmRecorderState =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "finalizing"
  | "stopped"
  | "failed"
  | "aborted";

export interface MandarinPcmQualityMetadata {
  durationMs: number;
  sourceSampleRate: number;
  outputSampleRate: typeof MANDARIN_PCM_SAMPLE_RATE;
  peakAmplitude: number;
  rmsAmplitude: number;
  clippedSampleRatio: number;
  clippingDetected: boolean;
}

export interface MandarinPcmRecording {
  audio: Blob;
  byteLength: number;
  mimeType: "audio/wav";
  channels: typeof MANDARIN_PCM_CHANNELS;
  bitsPerSample: typeof MANDARIN_PCM_BITS_PER_SAMPLE;
  sampleRate: typeof MANDARIN_PCM_SAMPLE_RATE;
  quality: MandarinPcmQualityMetadata;
}

export type MandarinRecorderAutoStopOutcome =
  | { ok: true; recording: MandarinPcmRecording }
  | { ok: false; error: MandarinRecorderError };

export interface RecorderMediaTrackLike {
  stop(): void;
}

export interface RecorderMediaStreamLike {
  getTracks(): RecorderMediaTrackLike[];
}

export interface MandarinCaptureGraph {
  readonly sampleRate: number;
  start(): Promise<void>;
  close(): Promise<void>;
}

export interface MandarinPcmRecorderDependencies {
  getUserMedia(constraints: MediaStreamConstraints): Promise<RecorderMediaStreamLike>;
  createCaptureGraph(
    stream: RecorderMediaStreamLike,
    onSamples: (samples: Float32Array) => void,
  ): MandarinCaptureGraph;
  scheduleTimeout(callback: () => void, delayMs: number): unknown;
  cancelTimeout(handle: unknown): void;
}

export interface MandarinPcmRecorderOptions {
  minDurationMs?: number;
  maxDurationMs?: number;
  maxBytes?: number;
  autoStopAfterSilenceMs?: number;
  dependencies?: Partial<MandarinPcmRecorderDependencies>;
  onAutoStop?: (outcome: MandarinRecorderAutoStopOutcome) => void;
  onSpeechDetected?: () => void;
}

export interface MandarinPcmRecorder {
  readonly state: MandarinPcmRecorderState;
  start(): Promise<void>;
  stop(): Promise<MandarinPcmRecording>;
  abort(): Promise<void>;
}

const MICROPHONE_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: { ideal: MANDARIN_PCM_CHANNELS },
    sampleRate: { ideal: MANDARIN_PCM_SAMPLE_RATE },
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: false,
  },
  video: false,
};

const stopStreamTracks = (stream: RecorderMediaStreamLike | null) => {
  for (const track of stream?.getTracks() ?? []) {
    try {
      track.stop();
    } catch {
      // A track can already be ended by the browser or device removal.
    }
  }
};

const createBrowserCaptureGraph = (
  stream: RecorderMediaStreamLike,
  onSamples: (samples: Float32Array) => void,
): MandarinCaptureGraph => {
  const browserGlobal = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor = browserGlobal.AudioContext ?? browserGlobal.webkitAudioContext;
  if (!AudioContextConstructor) {
    throw new MandarinRecorderError(
      "unsupported",
      "Web Audio is unavailable in this browser.",
    );
  }

  const context = new AudioContextConstructor();
  let source: MediaStreamAudioSourceNode;
  let processor: ScriptProcessorNode;
  let silentOutput: GainNode;
  try {
    source = context.createMediaStreamSource(stream as MediaStream);
    // 1024 samples keep endpoint detection responsive (about 21-64 ms at
    // common device rates) without making the deprecated processor too chatty.
    processor = context.createScriptProcessor(1_024, 1, 1);
    silentOutput = context.createGain();
    silentOutput.gain.value = 0;

    processor.onaudioprocess = (event) => {
      onSamples(event.inputBuffer.getChannelData(0));
    };
    source.connect(processor);
    processor.connect(silentOutput);
    silentOutput.connect(context.destination);
  } catch (error) {
    void context.close().catch(() => undefined);
    throw error;
  }

  return {
    sampleRate: context.sampleRate,
    async start() {
      if (context.state === "suspended") {
        await context.resume();
      }
    },
    async close() {
      processor.onaudioprocess = null;
      try {
        source.disconnect();
      } catch {
        // The source may already be disconnected after a device removal.
      }
      try {
        processor.disconnect();
      } catch {
        // The processor may already be disconnected after a context failure.
      }
      try {
        silentOutput.disconnect();
      } catch {
        // The silent sink may already be disconnected after a context failure.
      }
      if (context.state !== "closed") {
        await context.close();
      }
    },
  };
};

const defaultDependencies: MandarinPcmRecorderDependencies = {
  async getUserMedia(constraints) {
    if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
      throw new MandarinRecorderError(
        "unsupported",
        "Microphone capture is unavailable in this browser.",
      );
    }
    return globalThis.navigator.mediaDevices.getUserMedia(constraints);
  },
  createCaptureGraph: createBrowserCaptureGraph,
  scheduleTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs);
  },
  cancelTimeout(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>);
  },
};

const asRecorderError = (error: unknown): MandarinRecorderError => {
  if (error instanceof MandarinRecorderError) {
    return error;
  }

  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
    return new MandarinRecorderError(
      "permission-denied",
      "Microphone permission was denied.",
      error,
    );
  }
  if (
    name === "NotFoundError" ||
    name === "NotReadableError" ||
    name === "AbortError" ||
    name === "OverconstrainedError"
  ) {
    return new MandarinRecorderError(
      "device-unavailable",
      "No usable microphone is available.",
      error,
    );
  }
  return new MandarinRecorderError(
    "unsupported",
    "The browser could not start a compatible microphone recorder.",
    error,
  );
};

const validatePositiveFinite = (value: number, label: string) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new MandarinRecorderError("invalid-config", `${label} must be a positive number.`);
  }
};

const concatenate = (chunks: readonly Float32Array[], length: number) => {
  const samples = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }
  return samples;
};

const resampleTo16Khz = (input: Float32Array, inputRate: number) => {
  if (inputRate === MANDARIN_PCM_SAMPLE_RATE) {
    return input;
  }

  const ratio = inputRate / MANDARIN_PCM_SAMPLE_RATE;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);

  // Area averaging is a small low-pass resampler for the browser rates normally
  // used here (44.1/48 kHz -> 16 kHz). It avoids the worst aliasing of point sampling.
  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const sourceStart = outputIndex * ratio;
    const sourceEnd = Math.min((outputIndex + 1) * ratio, input.length);
    const firstSourceIndex = Math.floor(sourceStart);
    const lastSourceIndex = Math.ceil(sourceEnd);
    let weightedSum = 0;
    let totalWeight = 0;

    for (
      let sourceIndex = firstSourceIndex;
      sourceIndex < lastSourceIndex;
      sourceIndex += 1
    ) {
      const segmentStart = Math.max(sourceStart, sourceIndex);
      const segmentEnd = Math.min(sourceEnd, sourceIndex + 1);
      const weight = Math.max(0, segmentEnd - segmentStart);
      weightedSum += (input[sourceIndex] ?? 0) * weight;
      totalWeight += weight;
    }
    output[outputIndex] = totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  return output;
};

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

const encodePcm16Wav = (samples: Float32Array) => {
  const byteLength = 44 + samples.length * 2;
  const buffer = new ArrayBuffer(byteLength);
  const view = new DataView(buffer);
  const byteRate =
    MANDARIN_PCM_SAMPLE_RATE * MANDARIN_PCM_CHANNELS * (MANDARIN_PCM_BITS_PER_SAMPLE / 8);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, byteLength - 8, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, MANDARIN_PCM_CHANNELS, true);
  view.setUint32(24, MANDARIN_PCM_SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, MANDARIN_PCM_CHANNELS * (MANDARIN_PCM_BITS_PER_SAMPLE / 8), true);
  view.setUint16(34, MANDARIN_PCM_BITS_PER_SAMPLE, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
    const sample = Math.max(-1, Math.min(1, samples[sampleIndex] ?? 0));
    const pcm = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    view.setInt16(44 + sampleIndex * 2, pcm, true);
  }
  return buffer;
};

class BrowserMandarinPcmRecorder implements MandarinPcmRecorder {
  private currentState: MandarinPcmRecorderState = "idle";
  private readonly dependencies: MandarinPcmRecorderDependencies;
  private readonly minDurationMs: number;
  private readonly maxDurationMs: number;
  private readonly maxBytes: number;
  private readonly autoStopAfterSilenceMs: number | null;
  private readonly onAutoStop?: (outcome: MandarinRecorderAutoStopOutcome) => void;
  private readonly onSpeechDetected?: () => void;
  private stream: RecorderMediaStreamLike | null = null;
  private graph: MandarinCaptureGraph | null = null;
  private timerHandle: unknown = null;
  private sourceSampleRate = 0;
  private maxInputSamples = 0;
  private byteLimitIsBinding = false;
  private chunks: Float32Array[] = [];
  private totalSamples = 0;
  private noiseFloorRms = 0.002;
  private speechCandidateSamples = 0;
  private speechCandidateStartSample: number | null = null;
  private voicedSamples = 0;
  private trailingSilenceSamples = 0;
  private speechDetected = false;
  private speechStartSample: number | null = null;
  private lastVoiceSample: number | null = null;
  private speechEnvelopeRms = 0;
  private finishPromise: Promise<MandarinPcmRecording> | null = null;
  private terminalRecording: MandarinPcmRecording | null = null;
  private terminalError: MandarinRecorderError | null = null;
  private abortRequested = false;

  constructor(options: MandarinPcmRecorderOptions) {
    this.minDurationMs = options.minDurationMs ?? MANDARIN_RECORDER_DEFAULT_MIN_DURATION_MS;
    this.maxDurationMs = Math.min(
      options.maxDurationMs ?? MANDARIN_RECORDER_HARD_MAX_DURATION_MS,
      MANDARIN_RECORDER_HARD_MAX_DURATION_MS,
    );
    this.maxBytes = Math.min(
      options.maxBytes ?? MANDARIN_RECORDER_SAFE_MAX_BYTES,
      MANDARIN_RECORDER_SAFE_MAX_BYTES,
    );
    validatePositiveFinite(this.minDurationMs, "minDurationMs");
    validatePositiveFinite(this.maxDurationMs, "maxDurationMs");
    validatePositiveFinite(this.maxBytes, "maxBytes");
    this.autoStopAfterSilenceMs = options.autoStopAfterSilenceMs ?? null;
    if (this.autoStopAfterSilenceMs !== null) {
      validatePositiveFinite(this.autoStopAfterSilenceMs, "autoStopAfterSilenceMs");
      if (this.autoStopAfterSilenceMs >= this.maxDurationMs) {
        throw new MandarinRecorderError(
          "invalid-config",
          "autoStopAfterSilenceMs must be shorter than maxDurationMs.",
        );
      }
    }
    if (this.minDurationMs > this.maxDurationMs) {
      throw new MandarinRecorderError(
        "invalid-config",
        "minDurationMs cannot exceed maxDurationMs.",
      );
    }
    if (this.maxBytes <= 44) {
      throw new MandarinRecorderError(
        "invalid-config",
        "maxBytes must leave room for PCM samples after the WAV header.",
      );
    }
    this.dependencies = { ...defaultDependencies, ...options.dependencies };
    this.onAutoStop = options.onAutoStop;
    this.onSpeechDetected = options.onSpeechDetected;
  }

  get state() {
    return this.currentState;
  }

  async start() {
    if (this.currentState !== "idle") {
      throw new MandarinRecorderError("invalid-state", "The recorder can only be started once.");
    }

    this.currentState = "requesting-permission";
    try {
      this.stream = await this.dependencies.getUserMedia(MICROPHONE_CONSTRAINTS);
      if (this.abortRequested) {
        stopStreamTracks(this.stream);
        this.stream = null;
        throw new MandarinRecorderError("aborted", "The recording was aborted.");
      }

      this.graph = this.dependencies.createCaptureGraph(this.stream, (samples) => {
        this.captureSamples(samples);
      });
      this.sourceSampleRate = this.graph.sampleRate;
      if (
        !Number.isFinite(this.sourceSampleRate) ||
        this.sourceSampleRate < MANDARIN_PCM_SAMPLE_RATE
      ) {
        throw new MandarinRecorderError(
          "unsupported",
          "The microphone sample rate is below the required 16 kHz.",
        );
      }

      const durationInputLimit = Math.floor(
        this.sourceSampleRate * (this.maxDurationMs / 1_000),
      );
      const maxOutputSamplesByBytes = Math.floor((this.maxBytes - 44) / 2);
      const byteInputLimit = Math.floor(
        maxOutputSamplesByBytes * (this.sourceSampleRate / MANDARIN_PCM_SAMPLE_RATE),
      );
      this.byteLimitIsBinding = byteInputLimit < durationInputLimit;
      this.maxInputSamples = Math.min(durationInputLimit, byteInputLimit);

      this.currentState = "recording";
      await this.graph.start();
      if (this.abortRequested) {
        throw new MandarinRecorderError("aborted", "The recording was aborted.");
      }
      this.timerHandle = this.dependencies.scheduleTimeout(() => {
        this.finishAutomatically();
      }, this.maxDurationMs);
    } catch (error) {
      const recorderError = this.abortRequested
        ? new MandarinRecorderError("aborted", "The recording was aborted.", error)
        : asRecorderError(error);
      this.terminalError = recorderError;
      this.currentState = recorderError.code === "aborted" ? "aborted" : "failed";
      await this.cleanup();
      this.chunks = [];
      this.totalSamples = 0;
      throw recorderError;
    }
  }

  async stop() {
    if (this.terminalRecording) {
      return this.terminalRecording;
    }
    if (this.terminalError) {
      throw this.terminalError;
    }
    if (this.finishPromise) {
      return this.finishPromise;
    }
    if (this.currentState !== "recording") {
      throw new MandarinRecorderError("invalid-state", "The recorder is not recording.");
    }
    return this.finalize();
  }

  async abort() {
    this.abortRequested = true;
    this.currentState = "aborted";
    this.terminalError = new MandarinRecorderError("aborted", "The recording was aborted.");
    this.terminalRecording = null;
    this.chunks = [];
    this.totalSamples = 0;
    await this.cleanup();
  }

  private captureSamples(samples: Float32Array) {
    if (this.currentState !== "recording" || samples.length === 0) {
      return;
    }

    const remaining = Math.max(0, this.maxInputSamples - this.totalSamples);
    const acceptedLength = Math.min(samples.length, remaining);
    if (acceptedLength > 0) {
      const copy = samples.slice(0, acceptedLength);
      this.chunks.push(copy);
      this.totalSamples += copy.length;
      let chunkSumSquares = 0;
      let chunkPeak = 0;
      for (const sample of copy) {
        const absolute = Math.abs(sample);
        chunkPeak = Math.max(chunkPeak, absolute);
        chunkSumSquares += sample * sample;
      }
      this.trackVoiceActivity(
        copy.length,
        Math.sqrt(chunkSumSquares / copy.length),
        chunkPeak,
      );
    }

    const exceededLimit = acceptedLength < samples.length;
    if (exceededLimit || this.totalSamples >= this.maxInputSamples) {
      const limitError = exceededLimit && this.byteLimitIsBinding
        ? new MandarinRecorderError(
            "too-large",
            "The recording exceeded the safe in-memory WAV size.",
          )
        : undefined;
      this.finishAutomatically(limitError);
    }
  }

  private trackVoiceActivity(sampleCount: number, chunkRms: number, chunkPeak: number) {
    if (this.autoStopAfterSilenceMs === null || this.sourceSampleRate <= 0) {
      return;
    }

    const startRmsThreshold = Math.max(
      0.008,
      Math.min(0.035, this.noiseFloorRms * 2.8),
    );
    const speechLike = chunkRms >= startRmsThreshold && chunkPeak >= 0.018;

    if (!this.speechDetected) {
      if (speechLike) {
        if (this.speechCandidateSamples === 0) {
          this.speechCandidateStartSample = this.totalSamples - sampleCount;
        }
        this.speechCandidateSamples += sampleCount;
        this.speechEnvelopeRms = this.speechEnvelopeRms === 0
          ? chunkRms
          : this.speechEnvelopeRms * 0.72 + chunkRms * 0.28;
      } else {
        this.speechCandidateSamples = 0;
        this.speechCandidateStartSample = null;
        this.speechEnvelopeRms = 0;
        this.noiseFloorRms = Math.min(
          0.02,
          this.noiseFloorRms * 0.88 + chunkRms * 0.12,
        );
      }

      const candidateDurationMs = (this.speechCandidateSamples / this.sourceSampleRate) * 1_000;
      if (candidateDurationMs < 160) {
        return;
      }
      this.speechDetected = true;
      this.voicedSamples = this.speechCandidateSamples;
      this.trailingSilenceSamples = 0;
      this.speechStartSample = this.speechCandidateStartSample
        ?? Math.max(0, this.totalSamples - this.speechCandidateSamples);
      this.lastVoiceSample = this.totalSamples;
      try {
        this.onSpeechDetected?.();
      } catch {
        // UI feedback must never break the recorder lifecycle.
      }
      return;
    }

    const continuationRmsThreshold = Math.max(
      0.0065,
      Math.min(
        0.018,
        Math.max(this.noiseFloorRms * 1.9, this.speechEnvelopeRms * 0.12),
      ),
    );
    const voiceContinues = chunkRms >= continuationRmsThreshold
      && chunkPeak >= Math.max(0.014, continuationRmsThreshold * 1.55);
    if (voiceContinues) {
      this.voicedSamples += sampleCount;
      this.trailingSilenceSamples = 0;
      this.lastVoiceSample = this.totalSamples;
      this.speechEnvelopeRms = this.speechEnvelopeRms * 0.9 + chunkRms * 0.1;
      return;
    }

    this.trailingSilenceSamples += sampleCount;
    const voicedDurationMs = (this.voicedSamples / this.sourceSampleRate) * 1_000;
    const silenceDurationMs = (this.trailingSilenceSamples / this.sourceSampleRate) * 1_000;
    if (voicedDurationMs >= 320 && silenceDurationMs >= this.autoStopAfterSilenceMs) {
      this.finishAutomatically();
    }
  }

  private finishAutomatically(forcedError?: MandarinRecorderError) {
    if (this.finishPromise || this.terminalRecording || this.terminalError) {
      return;
    }
    void this.finalize(forcedError).then(
      (recording) => this.onAutoStop?.({ ok: true, recording }),
      (error: unknown) => this.onAutoStop?.({ ok: false, error: asRecorderError(error) }),
    );
  }

  private finalize(forcedError?: MandarinRecorderError) {
    if (this.finishPromise) {
      return this.finishPromise;
    }
    this.currentState = "finalizing";
    this.finishPromise = this.buildRecording(forcedError);
    return this.finishPromise;
  }

  private async buildRecording(forcedError?: MandarinRecorderError) {
    try {
      if (forcedError) {
        throw forcedError;
      }
      const capturedDurationMs = (this.totalSamples / this.sourceSampleRate) * 1_000;
      if (capturedDurationMs < this.minDurationMs) {
        throw new MandarinRecorderError(
          "too-short",
          `The recording must be at least ${this.minDurationMs} ms long.`,
        );
      }

      const capturedSamples = concatenate(this.chunks, this.totalSamples);
      const leadingPaddingSamples = Math.round(this.sourceSampleRate * 0.12);
      const trailingPaddingSamples = Math.round(this.sourceSampleRate * 0.18);
      const trimStart = this.speechStartSample === null
        ? 0
        : Math.max(0, this.speechStartSample - leadingPaddingSamples);
      const trimEnd = this.lastVoiceSample === null
        ? capturedSamples.length
        : Math.min(capturedSamples.length, this.lastVoiceSample + trailingPaddingSamples);
      const sourceSamples = capturedSamples.slice(trimStart, Math.max(trimStart, trimEnd));
      const durationMs = (sourceSamples.length / this.sourceSampleRate) * 1_000;
      if (durationMs < this.minDurationMs) {
        throw new MandarinRecorderError(
          "too-short",
          `The detected speech must be at least ${this.minDurationMs} ms long.`,
        );
      }
      const outputSamples = resampleTo16Khz(sourceSamples, this.sourceSampleRate);
      const wavBuffer = encodePcm16Wav(outputSamples);
      if (wavBuffer.byteLength > this.maxBytes) {
        throw new MandarinRecorderError(
          "too-large",
          "The recording exceeded the safe in-memory WAV size.",
        );
      }

      let outputSumSquares = 0;
      let outputPeakAmplitude = 0;
      let outputClippedSamples = 0;
      for (const sample of sourceSamples) {
        const absolute = Math.abs(sample);
        outputPeakAmplitude = Math.max(outputPeakAmplitude, absolute);
        outputSumSquares += sample * sample;
        if (absolute >= 0.99) outputClippedSamples += 1;
      }
      const clippedSampleRatio = sourceSamples.length > 0
        ? outputClippedSamples / sourceSamples.length
        : 0;
      const recording: MandarinPcmRecording = {
        audio: new Blob([wavBuffer], { type: "audio/wav" }),
        byteLength: wavBuffer.byteLength,
        mimeType: "audio/wav",
        channels: MANDARIN_PCM_CHANNELS,
        bitsPerSample: MANDARIN_PCM_BITS_PER_SAMPLE,
        sampleRate: MANDARIN_PCM_SAMPLE_RATE,
        quality: {
          durationMs,
          sourceSampleRate: this.sourceSampleRate,
          outputSampleRate: MANDARIN_PCM_SAMPLE_RATE,
          peakAmplitude: outputPeakAmplitude,
          rmsAmplitude:
            sourceSamples.length > 0 ? Math.sqrt(outputSumSquares / sourceSamples.length) : 0,
          clippedSampleRatio,
          clippingDetected: clippedSampleRatio >= 0.001,
        },
      };

      await this.cleanup();
      if (this.abortRequested) {
        throw new MandarinRecorderError("aborted", "The recording was aborted.");
      }
      this.terminalRecording = recording;
      this.currentState = "stopped";
      this.chunks = [];
      return recording;
    } catch (error) {
      const recorderError = asRecorderError(error);
      await this.cleanup();
      this.terminalError = recorderError;
      this.currentState = recorderError.code === "aborted" ? "aborted" : "failed";
      this.chunks = [];
      throw recorderError;
    }
  }

  private async cleanup() {
    if (this.timerHandle !== null) {
      this.dependencies.cancelTimeout(this.timerHandle);
      this.timerHandle = null;
    }

    const graph = this.graph;
    this.graph = null;
    const stream = this.stream;
    this.stream = null;
    stopStreamTracks(stream);
    if (graph) {
      try {
        await graph.close();
      } catch {
        // Cleanup is best-effort; capture results must not keep the microphone alive.
      }
    }
  }
}

export const createMandarinPcmRecorder = (
  options: MandarinPcmRecorderOptions = {},
): MandarinPcmRecorder => new BrowserMandarinPcmRecorder(options);
