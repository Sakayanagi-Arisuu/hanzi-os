import { describe, expect, it, vi } from "vitest";
import {
  createMandarinPcmRecorder,
  MandarinRecorderError,
  type MandarinCaptureGraph,
  type MandarinPcmRecorderDependencies,
  type RecorderMediaStreamLike,
} from "./mandarinPcmRecorder";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

const harness = (sampleRate = 48_000) => {
  const stopTrack = vi.fn();
  const stream: RecorderMediaStreamLike = {
    getTracks: () => [{ stop: stopTrack }],
  };
  const startGraph = vi.fn().mockResolvedValue(undefined);
  const closeGraph = vi.fn().mockResolvedValue(undefined);
  let emitSamples: (samples: Float32Array) => void = () => undefined;
  let timeoutCallback: (() => void) | null = null;
  const graph: MandarinCaptureGraph = {
    sampleRate,
    start: startGraph,
    close: closeGraph,
  };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  const createCaptureGraph = vi.fn(
    (_stream: RecorderMediaStreamLike, onSamples: (samples: Float32Array) => void) => {
      emitSamples = onSamples;
      return graph;
    },
  );
  const scheduleTimeout = vi.fn((callback: () => void) => {
    timeoutCallback = callback;
    return "timer";
  });
  const cancelTimeout = vi.fn();
  const dependencies: MandarinPcmRecorderDependencies = {
    getUserMedia,
    createCaptureGraph,
    scheduleTimeout,
    cancelTimeout,
  };

  return {
    dependencies,
    stream,
    stopTrack,
    startGraph,
    closeGraph,
    getUserMedia,
    createCaptureGraph,
    scheduleTimeout,
    cancelTimeout,
    emit: (samples: Float32Array) => emitSamples(samples),
    fireTimeout: () => timeoutCallback?.(),
  };
};

const sineWave = (length: number, amplitude = 0.5) =>
  Float32Array.from(
    { length },
    (_, index) => amplitude * Math.sin((2 * Math.PI * 440 * index) / 48_000),
  );

const expectRecorderError = (error: unknown, code: MandarinRecorderError["code"]) => {
  expect(error).toBeInstanceOf(MandarinRecorderError);
  expect((error as MandarinRecorderError).code).toBe(code);
};

describe("Mandarin PCM recorder", () => {
  it("captures raw microphone samples and emits 16 kHz, 16-bit, mono WAV", async () => {
    const testHarness = harness();
    const recorder = createMandarinPcmRecorder({ dependencies: testHarness.dependencies });

    await recorder.start();
    testHarness.emit(sineWave(48_000));
    const result = await recorder.stop();
    const view = new DataView(await result.audio.arrayBuffer());

    expect(testHarness.getUserMedia).toHaveBeenCalledWith({
      audio: {
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 16_000 },
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: false,
      },
      video: false,
    });
    expect(String.fromCharCode(...new Uint8Array(view.buffer, 0, 4))).toBe("RIFF");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(32_000);
    expect(result).toMatchObject({
      byteLength: 32_044,
      mimeType: "audio/wav",
      channels: 1,
      bitsPerSample: 16,
      sampleRate: 16_000,
      quality: {
        durationMs: 1_000,
        sourceSampleRate: 48_000,
        outputSampleRate: 16_000,
        clippingDetected: false,
      },
    });
    expect(result.quality.peakAmplitude).toBeCloseTo(0.5, 3);
    expect(result.quality.rmsAmplitude).toBeCloseTo(0.5 / Math.sqrt(2), 3);
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
    expect(testHarness.closeGraph).toHaveBeenCalledOnce();
    expect(testHarness.cancelTimeout).toHaveBeenCalledWith("timer");
    expect(recorder.state).toBe("stopped");
  });

  it("maps a denied microphone request to a typed permission error", async () => {
    const testHarness = harness();
    testHarness.getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error("denied"), { name: "NotAllowedError" }),
    );
    const recorder = createMandarinPcmRecorder({ dependencies: testHarness.dependencies });

    await expect(recorder.start()).rejects.toSatisfy((error: unknown) => {
      expectRecorderError(error, "permission-denied");
      return true;
    });
    expect(recorder.state).toBe("failed");
  });

  it("rejects recordings that are too short and still releases the microphone", async () => {
    const testHarness = harness(16_000);
    const recorder = createMandarinPcmRecorder({ dependencies: testHarness.dependencies });

    await recorder.start();
    testHarness.emit(new Float32Array(1_600));
    await expect(recorder.stop()).rejects.toSatisfy((error: unknown) => {
      expectRecorderError(error, "too-short");
      return true;
    });

    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
    expect(testHarness.closeGraph).toHaveBeenCalledOnce();
    expect(recorder.state).toBe("failed");
  });

  it("auto-stops at the bounded duration and reports clipping metadata", async () => {
    const testHarness = harness(16_000);
    const onAutoStop = vi.fn();
    const recorder = createMandarinPcmRecorder({
      dependencies: testHarness.dependencies,
      maxDurationMs: 500,
      onAutoStop,
    });

    await recorder.start();
    const samples = new Float32Array(8_000).fill(0.25);
    samples.fill(1, 0, 16);
    testHarness.emit(samples);
    testHarness.fireTimeout();
    const result = await recorder.stop();

    expect(result.quality.durationMs).toBe(500);
    expect(result.quality.clippedSampleRatio).toBeCloseTo(16 / 8_000);
    expect(result.quality.clippingDetected).toBe(true);
    expect(onAutoStop).toHaveBeenCalledWith({ ok: true, recording: result });
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
  });

  it("waits for real speech, then auto-stops after trailing silence", async () => {
    const testHarness = harness(16_000);
    const onAutoStop = vi.fn();
    const onSpeechDetected = vi.fn();
    const recorder = createMandarinPcmRecorder({
      dependencies: testHarness.dependencies,
      minDurationMs: 250,
      maxDurationMs: 5_000,
      autoStopAfterSilenceMs: 1_000,
      onAutoStop,
      onSpeechDetected,
    });

    await recorder.start();
    testHarness.emit(new Float32Array(32_000));
    expect(onSpeechDetected).not.toHaveBeenCalled();
    expect(onAutoStop).not.toHaveBeenCalled();

    testHarness.emit(sineWave(6_400, 0.2));
    expect(onSpeechDetected).toHaveBeenCalledOnce();
    testHarness.emit(new Float32Array(8_000));
    expect(onAutoStop).not.toHaveBeenCalled();
    testHarness.emit(new Float32Array(9_600));

    const result = await recorder.stop();
    await vi.waitFor(() => expect(onAutoStop).toHaveBeenCalledWith({ ok: true, recording: result }));
    expect(result.quality.durationMs).toBe(700);
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
  });

  it("ignores steady background noise and ends promptly after the last voiced chunk", async () => {
    const testHarness = harness(16_000);
    const onAutoStop = vi.fn();
    const onSpeechDetected = vi.fn();
    const recorder = createMandarinPcmRecorder({
      dependencies: testHarness.dependencies,
      minDurationMs: 250,
      maxDurationMs: 5_000,
      autoStopAfterSilenceMs: 450,
      onAutoStop,
      onSpeechDetected,
    });

    await recorder.start();
    testHarness.emit(sineWave(4_800, 0.015));
    expect(onSpeechDetected).not.toHaveBeenCalled();

    testHarness.emit(sineWave(6_400, 0.2));
    expect(onSpeechDetected).toHaveBeenCalledOnce();
    testHarness.emit(sineWave(4_800, 0.015));
    expect(onAutoStop).not.toHaveBeenCalled();
    testHarness.emit(sineWave(3_200, 0.12));
    testHarness.emit(sineWave(8_000, 0.015));

    const result = await recorder.stop();
    await vi.waitFor(() => expect(onAutoStop).toHaveBeenCalledWith({ ok: true, recording: result }));
    expect(result.quality.durationMs).toBeLessThan(1_300);
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
  });

  it("rejects a silence auto-stop window that cannot fit inside the capture", () => {
    expect(() => createMandarinPcmRecorder({
      maxDurationMs: 1_000,
      autoStopAfterSilenceMs: 1_000,
    })).toThrowError(expect.objectContaining({ code: "invalid-config" }));
  });

  it("never schedules capture beyond the 15-second hard limit", async () => {
    const testHarness = harness(16_000);
    const recorder = createMandarinPcmRecorder({
      dependencies: testHarness.dependencies,
      maxDurationMs: 60_000,
    });

    await recorder.start();
    expect(testHarness.scheduleTimeout).toHaveBeenCalledWith(expect.any(Function), 15_000);
    await recorder.abort();
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
  });

  it("fails closed at the byte cap instead of retaining an oversized recording", async () => {
    const testHarness = harness(16_000);
    const onAutoStop = vi.fn();
    const recorder = createMandarinPcmRecorder({
      dependencies: testHarness.dependencies,
      minDurationMs: 1,
      maxBytes: 100,
      onAutoStop,
    });

    await recorder.start();
    testHarness.emit(new Float32Array(1_000).fill(0.1));
    await expect(recorder.stop()).rejects.toSatisfy((error: unknown) => {
      expectRecorderError(error, "too-large");
      return true;
    });

    expect(onAutoStop).toHaveBeenCalledWith({
      ok: false,
      error: expect.objectContaining({ code: "too-large" }),
    });
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
    expect(testHarness.closeGraph).toHaveBeenCalledOnce();
  });

  it("stops a late permission stream after aborting during the browser prompt", async () => {
    const testHarness = harness();
    const permission = deferred<RecorderMediaStreamLike>();
    testHarness.getUserMedia.mockReturnValueOnce(permission.promise);
    const recorder = createMandarinPcmRecorder({ dependencies: testHarness.dependencies });

    const starting = recorder.start();
    await recorder.abort();
    permission.resolve(testHarness.stream);

    await expect(starting).rejects.toSatisfy((error: unknown) => {
      expectRecorderError(error, "aborted");
      return true;
    });
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
    expect(testHarness.createCaptureGraph).not.toHaveBeenCalled();
    expect(recorder.state).toBe("aborted");
  });

  it("rejects source audio below 16 kHz and cleans up every acquired resource", async () => {
    const testHarness = harness(8_000);
    const recorder = createMandarinPcmRecorder({ dependencies: testHarness.dependencies });

    await expect(recorder.start()).rejects.toSatisfy((error: unknown) => {
      expectRecorderError(error, "unsupported");
      return true;
    });
    expect(testHarness.stopTrack).toHaveBeenCalledOnce();
    expect(testHarness.closeGraph).toHaveBeenCalledOnce();
  });
});
