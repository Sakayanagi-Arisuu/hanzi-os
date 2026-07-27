const MAX_WAVE_CHUNKS = 64;

export const AUDIO_IMPORT_POLICY = Object.freeze({
  schemaVersion: 1,
  container: "wav",
  codec: "pcm-s16le",
  channels: 1,
  bitDepth: 16,
  allowedSampleRatesHz: Object.freeze([16000, 24000, 44100, 48000]),
  minDurationMs: 250,
  maxDurationMs: 600000,
  maxByteLength: 64 * 1024 * 1024,
});

const ALLOWED_SAMPLE_RATES = new Set(
  AUDIO_IMPORT_POLICY.allowedSampleRatesHz,
);

const invalidWave = (message) => {
  throw new Error(`Invalid canonical WAV: ${message}`);
};

const hasFourCc = (bytes, offset, value) =>
  bytes[offset] === value.charCodeAt(0) &&
  bytes[offset + 1] === value.charCodeAt(1) &&
  bytes[offset + 2] === value.charCodeAt(2) &&
  bytes[offset + 3] === value.charCodeAt(3);

const readFourCc = (bytes, offset) =>
  String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );

/**
 * Inspect an immutable WAV byte sequence without decoding or trusting its name.
 *
 * @param {Uint8Array} bytes
 * @returns {{
 *   container: "wav";
 *   codec: "pcm-s16le";
 *   sampleRateHz: number;
 *   channels: number;
 *   bitDepth: number;
 *   frameCount: number;
 *   durationMs: number;
 *   byteLength: number;
 * }}
 */
export const inspectCanonicalWave = (bytes) => {
  if (!(bytes instanceof Uint8Array)) {
    invalidWave("input must be a Uint8Array");
  }

  if (bytes.byteLength > AUDIO_IMPORT_POLICY.maxByteLength) {
    invalidWave(
      `byte length ${bytes.byteLength} exceeds ${AUDIO_IMPORT_POLICY.maxByteLength}`,
    );
  }

  if (bytes.byteLength < 12) {
    invalidWave("truncated RIFF header");
  }

  if (!hasFourCc(bytes, 0, "RIFF")) {
    invalidWave("missing RIFF magic");
  }
  if (!hasFourCc(bytes, 8, "WAVE")) {
    invalidWave("missing WAVE format magic");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declaredByteLength = view.getUint32(4, true) + 8;
  if (declaredByteLength !== bytes.byteLength) {
    invalidWave(
      `RIFF size declares ${declaredByteLength} bytes, received ${bytes.byteLength}`,
    );
  }

  let offset = 12;
  let chunkCount = 0;
  let format = null;
  let dataByteLength = null;

  while (offset < bytes.byteLength) {
    if (bytes.byteLength - offset < 8) {
      invalidWave(`truncated chunk header at byte ${offset}`);
    }

    chunkCount += 1;
    if (chunkCount > MAX_WAVE_CHUNKS) {
      invalidWave(`contains more than ${MAX_WAVE_CHUNKS} chunks`);
    }

    const chunkId = readFourCc(bytes, offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const payloadOffset = offset + 8;
    const payloadEnd = payloadOffset + chunkSize;
    const paddedEnd = payloadEnd + (chunkSize % 2);

    if (payloadEnd > bytes.byteLength) {
      invalidWave(
        `truncated ${JSON.stringify(chunkId)} chunk payload at byte ${offset}`,
      );
    }
    if (paddedEnd > bytes.byteLength) {
      invalidWave(
        `missing padding byte for ${JSON.stringify(chunkId)} chunk at byte ${offset}`,
      );
    }

    if (chunkId === "fmt ") {
      if (format !== null) {
        invalidWave("contains duplicate fmt chunks");
      }
      if (chunkSize !== 16) {
        invalidWave(`fmt chunk size must be 16, received ${chunkSize}`);
      }

      format = {
        audioFormat: view.getUint16(payloadOffset, true),
        channels: view.getUint16(payloadOffset + 2, true),
        sampleRateHz: view.getUint32(payloadOffset + 4, true),
        byteRate: view.getUint32(payloadOffset + 8, true),
        blockAlign: view.getUint16(payloadOffset + 12, true),
        bitDepth: view.getUint16(payloadOffset + 14, true),
      };
    } else if (chunkId === "data") {
      if (format === null) {
        invalidWave("data chunk must follow fmt chunk");
      }
      if (dataByteLength !== null) {
        invalidWave("contains duplicate data chunks");
      }
      dataByteLength = chunkSize;
    }

    offset = paddedEnd;
  }

  if (format === null) {
    invalidWave("missing fmt chunk");
  }
  if (dataByteLength === null) {
    invalidWave("missing data chunk");
  }

  if (format.audioFormat !== 1) {
    invalidWave(
      `audio format must be PCM (1), received ${format.audioFormat}`,
    );
  }
  if (format.channels !== AUDIO_IMPORT_POLICY.channels) {
    invalidWave(
      `channel count must be ${AUDIO_IMPORT_POLICY.channels}, received ${format.channels}`,
    );
  }
  if (!ALLOWED_SAMPLE_RATES.has(format.sampleRateHz)) {
    invalidWave(`unsupported sample rate ${format.sampleRateHz} Hz`);
  }
  if (format.bitDepth !== AUDIO_IMPORT_POLICY.bitDepth) {
    invalidWave(
      `bit depth must be ${AUDIO_IMPORT_POLICY.bitDepth}, received ${format.bitDepth}`,
    );
  }

  const expectedBlockAlign =
    (format.channels * format.bitDepth) / 8;
  if (format.blockAlign !== expectedBlockAlign) {
    invalidWave(
      `block align must be ${expectedBlockAlign}, received ${format.blockAlign}`,
    );
  }

  const expectedByteRate = format.sampleRateHz * expectedBlockAlign;
  if (format.byteRate !== expectedByteRate) {
    invalidWave(
      `byte rate must be ${expectedByteRate}, received ${format.byteRate}`,
    );
  }

  if (dataByteLength === 0) {
    invalidWave("data chunk must contain at least one frame");
  }
  if (dataByteLength % expectedBlockAlign !== 0) {
    invalidWave(
      `data chunk byte length ${dataByteLength} is not a whole number of frames`,
    );
  }

  const frameCount = dataByteLength / expectedBlockAlign;
  const durationNumerator = frameCount * 1000;
  if (
    durationNumerator <
    format.sampleRateHz * AUDIO_IMPORT_POLICY.minDurationMs
  ) {
    invalidWave(
      `duration is shorter than ${AUDIO_IMPORT_POLICY.minDurationMs} ms`,
    );
  }
  if (
    durationNumerator >
    format.sampleRateHz * AUDIO_IMPORT_POLICY.maxDurationMs
  ) {
    invalidWave(
      `duration exceeds ${AUDIO_IMPORT_POLICY.maxDurationMs} ms`,
    );
  }

  return {
    container: AUDIO_IMPORT_POLICY.container,
    codec: AUDIO_IMPORT_POLICY.codec,
    sampleRateHz: format.sampleRateHz,
    channels: format.channels,
    bitDepth: format.bitDepth,
    frameCount,
    durationMs: Math.round(durationNumerator / format.sampleRateHz),
    byteLength: bytes.byteLength,
  };
};
