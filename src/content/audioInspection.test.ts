import { describe, expect, it } from "vitest";
import {
  AUDIO_IMPORT_POLICY,
  inspectCanonicalWave,
} from "./audioInspection.mjs";

const writeFourCc = (bytes: Uint8Array, offset: number, value: string) => {
  for (let index = 0; index < 4; index += 1) {
    bytes[offset + index] = value.charCodeAt(index);
  }
};

const makeChunk = (
  id: string,
  payload: Uint8Array,
  declaredSize = payload.byteLength,
) => {
  const bytes = new Uint8Array(8 + payload.byteLength + (payload.byteLength % 2));
  const view = new DataView(bytes.buffer);
  writeFourCc(bytes, 0, id);
  view.setUint32(4, declaredSize, true);
  bytes.set(payload, 8);
  return bytes;
};

const makeRiff = (
  chunks: Uint8Array[],
  options: {
    riffMagic?: string;
    waveMagic?: string;
    declaredRiffSize?: number;
  } = {},
) => {
  const byteLength = 12 + chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(byteLength);
  const view = new DataView(bytes.buffer);
  writeFourCc(bytes, 0, options.riffMagic ?? "RIFF");
  view.setUint32(4, options.declaredRiffSize ?? byteLength - 8, true);
  writeFourCc(bytes, 8, options.waveMagic ?? "WAVE");

  let offset = 12;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

type FormatOptions = {
  audioFormat?: number;
  channels?: number;
  sampleRateHz?: number;
  bitDepth?: number;
  byteRate?: number;
  blockAlign?: number;
  extraBytes?: number;
};

const makeFormatChunk = (options: FormatOptions = {}) => {
  const audioFormat = options.audioFormat ?? 1;
  const channels = options.channels ?? 1;
  const sampleRateHz = options.sampleRateHz ?? 16000;
  const bitDepth = options.bitDepth ?? 16;
  const blockAlign = options.blockAlign ?? (channels * bitDepth) / 8;
  const byteRate = options.byteRate ?? sampleRateHz * blockAlign;
  const payload = new Uint8Array(16 + (options.extraBytes ?? 0));
  const view = new DataView(payload.buffer);
  view.setUint16(0, audioFormat, true);
  view.setUint16(2, channels, true);
  view.setUint32(4, sampleRateHz, true);
  view.setUint32(8, byteRate, true);
  view.setUint16(12, blockAlign, true);
  view.setUint16(14, bitDepth, true);
  return makeChunk("fmt ", payload);
};

const makeCanonicalWave = ({
  sampleRateHz = 16000,
  frameCount = sampleRateHz / 2,
  format = {},
  chunksBeforeData = [],
}: {
  sampleRateHz?: number;
  frameCount?: number;
  format?: FormatOptions;
  chunksBeforeData?: Uint8Array[];
} = {}) => {
  const channels = format.channels ?? 1;
  const bitDepth = format.bitDepth ?? 16;
  const dataByteLength = frameCount * ((channels * bitDepth) / 8);
  return makeRiff([
    makeFormatChunk({ ...format, sampleRateHz }),
    ...chunksBeforeData,
    makeChunk("data", new Uint8Array(dataByteLength)),
  ]);
};

describe("inspectCanonicalWave", () => {
  it("returns canonical metadata derived only from WAV bytes", () => {
    const bytes = makeCanonicalWave({ sampleRateHz: 24000, frameCount: 12000 });

    expect(inspectCanonicalWave(bytes)).toEqual({
      container: "wav",
      codec: "pcm-s16le",
      sampleRateHz: 24000,
      channels: 1,
      bitDepth: 16,
      frameCount: 12000,
      durationMs: 500,
      byteLength: bytes.byteLength,
    });
  });

  it.each(AUDIO_IMPORT_POLICY.allowedSampleRatesHz)(
    "accepts the policy sample rate %i Hz",
    (sampleRateHz) => {
      const inspected = inspectCanonicalWave(
        makeCanonicalWave({ sampleRateHz, frameCount: sampleRateHz / 4 }),
      );
      expect(inspected.sampleRateHz).toBe(sampleRateHz);
      expect(inspected.durationMs).toBe(250);
    },
  );

  it("allows bounded, padded unknown chunks", () => {
    const bytes = makeCanonicalWave({
      chunksBeforeData: [makeChunk("JUNK", new Uint8Array([1, 2, 3]))],
    });

    expect(inspectCanonicalWave(bytes).durationMs).toBe(500);
  });

  it("rejects byte-level magic spoofing and truncated input", () => {
    const valid = makeCanonicalWave();
    const wrongRiff = valid.slice();
    writeFourCc(wrongRiff, 0, "RIFX");
    const wrongWave = valid.slice();
    writeFourCc(wrongWave, 8, "AVI ");

    expect(() => inspectCanonicalWave(wrongRiff)).toThrow(/missing RIFF magic/);
    expect(() => inspectCanonicalWave(wrongWave)).toThrow(/missing WAVE/);
    expect(() => inspectCanonicalWave(valid.slice(0, 11))).toThrow(/truncated RIFF/);
    expect(() => inspectCanonicalWave(valid.slice(0, -1))).toThrow(/RIFF size declares/);
  });

  it.each([
    ["non-PCM codec", { audioFormat: 3 }, /audio format must be PCM/],
    ["stereo audio", { channels: 2 }, /channel count must be 1/],
    ["8-bit audio", { bitDepth: 8 }, /bit depth must be 16/],
    ["unsupported rate", { sampleRateHz: 22050 }, /unsupported sample rate/],
  ] as const)("rejects %s", (_label, format, expectedError) => {
    const sampleRateHz =
      "sampleRateHz" in format ? format.sampleRateHz : undefined;
    expect(() =>
      inspectCanonicalWave(
        makeCanonicalWave({
          sampleRateHz,
          format,
        }),
      ),
    ).toThrow(expectedError);
  });

  it("rounds returned milliseconds without weakening exact duration bounds", () => {
    expect(
      inspectCanonicalWave(
        makeCanonicalWave({ sampleRateHz: 44100, frameCount: 11026 }),
      ).durationMs,
    ).toBe(250);
  });

  it("enforces inclusive duration bounds by frame count", () => {
    const sampleRateHz = 16000;
    const minimumFrames =
      (sampleRateHz * AUDIO_IMPORT_POLICY.minDurationMs) / 1000;
    const maximumFrames =
      (sampleRateHz * AUDIO_IMPORT_POLICY.maxDurationMs) / 1000;

    expect(
      inspectCanonicalWave(
        makeCanonicalWave({ sampleRateHz, frameCount: minimumFrames }),
      ).durationMs,
    ).toBe(AUDIO_IMPORT_POLICY.minDurationMs);
    expect(() =>
      inspectCanonicalWave(
        makeCanonicalWave({ sampleRateHz, frameCount: minimumFrames - 1 }),
      ),
    ).toThrow(/shorter than 250 ms/);

    expect(
      inspectCanonicalWave(
        makeCanonicalWave({ sampleRateHz, frameCount: maximumFrames }),
      ).durationMs,
    ).toBe(AUDIO_IMPORT_POLICY.maxDurationMs);
    expect(() =>
      inspectCanonicalWave(
        makeCanonicalWave({ sampleRateHz, frameCount: maximumFrames + 1 }),
      ),
    ).toThrow(/exceeds 600000 ms/);
  });

  it("rejects duplicate required chunks", () => {
    const format = makeFormatChunk();
    const data = makeChunk("data", new Uint8Array(8000));

    expect(() => inspectCanonicalWave(makeRiff([format, format, data]))).toThrow(
      /duplicate fmt/,
    );
    expect(() => inspectCanonicalWave(makeRiff([format, data, data]))).toThrow(
      /duplicate data/,
    );
  });

  it("rejects a data chunk encountered before the fmt chunk", () => {
    const format = makeFormatChunk();
    const data = makeChunk("data", new Uint8Array(8000));

    expect(() => inspectCanonicalWave(makeRiff([data, format]))).toThrow(
      /data chunk must follow fmt chunk/,
    );
  });

  it("rejects inconsistent format and frame headers", () => {
    expect(() =>
      inspectCanonicalWave(
        makeRiff([
          makeFormatChunk({ byteRate: 12345 }),
          makeChunk("data", new Uint8Array(8000)),
        ]),
      ),
    ).toThrow(/byte rate must be/);

    expect(() =>
      inspectCanonicalWave(
        makeRiff([
          makeFormatChunk({ blockAlign: 4, byteRate: 64000 }),
          makeChunk("data", new Uint8Array(8000)),
        ]),
      ),
    ).toThrow(/block align must be/);

    expect(() =>
      inspectCanonicalWave(
        makeRiff([
          makeFormatChunk(),
          makeChunk("data", new Uint8Array(7999)),
        ]),
      ),
    ).toThrow(/not a whole number of frames/);
  });

  it("rejects empty, missing, extended, or truncated required chunks", () => {
    const format = makeFormatChunk();
    const data = makeChunk("data", new Uint8Array(8000));

    expect(() =>
      inspectCanonicalWave(makeRiff([format, makeChunk("data", new Uint8Array())])),
    ).toThrow(/at least one frame/);
    expect(() =>
      inspectCanonicalWave(makeRiff([makeChunk("JUNK", new Uint8Array())])),
    ).toThrow(/missing fmt/);
    expect(() => inspectCanonicalWave(makeRiff([format]))).toThrow(/missing data/);
    expect(() =>
      inspectCanonicalWave(
        makeRiff([makeFormatChunk({ extraBytes: 2 }), data]),
      ),
    ).toThrow(/fmt chunk size must be 16/);
    expect(() =>
      inspectCanonicalWave(
        makeRiff([format, makeChunk("data", new Uint8Array(8000), 8002)]),
      ),
    ).toThrow(/truncated "data" chunk payload/);
  });

  it("bounds the number of chunks and total byte length", () => {
    const unknownChunks = Array.from({ length: 63 }, () =>
      makeChunk("JUNK", new Uint8Array()),
    );
    expect(() =>
      inspectCanonicalWave(
        makeRiff([
          makeFormatChunk(),
          ...unknownChunks,
          makeChunk("data", new Uint8Array(8000)),
        ]),
      ),
    ).toThrow(/more than 64 chunks/);

    const oversized = new Uint8Array(AUDIO_IMPORT_POLICY.maxByteLength + 1);
    expect(() => inspectCanonicalWave(oversized)).toThrow(/byte length .* exceeds/);
  });

  it("rejects a RIFF size that does not exactly match the input", () => {
    const chunks = [
      makeFormatChunk(),
      makeChunk("data", new Uint8Array(8000)),
    ];
    const bytes = makeRiff(chunks);
    const declaredSize = new DataView(bytes.buffer).getUint32(4, true);

    expect(() =>
      inspectCanonicalWave(
        makeRiff(chunks, { declaredRiffSize: declaredSize - 2 }),
      ),
    ).toThrow(/RIFF size declares/);
  });
});
