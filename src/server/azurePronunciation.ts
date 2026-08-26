const AZURE_SPEECH_HOST_SUFFIX = ".stt.speech.microsoft.com";
const AZURE_SHORT_AUDIO_PATH =
  "/speech/recognition/conversation/cognitiveservices/v1";
const AZURE_LOCALE = "zh-CN";
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_AUDIO_BYTES = 512 * 1024;
const MAX_PCM_DATA_BYTES = 16_000 * 2 * 15;
const MAX_REFERENCE_CODE_POINTS = 64;
const MAX_REFERENCE_HAN_CHARACTERS = 30;
const MAX_RESPONSE_BYTES = 128 * 1024;
const MAX_WORDS = 64;
const MAX_PHONEMES_PER_WORD = 32;

export type AzurePronunciationConfig = Readonly<{
  /** Azure Speech resource key. This value must only exist on the server. */
  subscriptionKey: string;
  /** Azure Speech resource region, for example `southeastasia`. */
  region: string;
}>;

export type AzurePcmWavMetadata = Readonly<{
  byteLength: number;
  dataByteLength: number;
  durationMs: number;
  sampleRate: 16_000;
  channels: 1;
  bitsPerSample: 16;
}>;

export type AzurePronunciationPhonemeEvidence = Readonly<{
  phoneme: string;
  accuracyScore: number;
}>;

export type AzurePronunciationWordEvidence = Readonly<{
  word: string;
  accuracyScore: number;
  errorType: string;
  phonemes: readonly AzurePronunciationPhonemeEvidence[];
}>;

export type AzurePronunciationAssessment = Readonly<{
  provider: "azure-speech-pronunciation-assessment";
  providerApi: "short-audio-rest-v1";
  locale: typeof AZURE_LOCALE;
  transcript: string;
  aggregate: Readonly<{
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    pronunciationScore: number;
  }>;
  words: readonly AzurePronunciationWordEvidence[];
  /** Azure's zh-CN payload does not report a distinct lexical-tone score. */
  lexicalToneAssessment: "not-reported-by-provider";
  calibration: "unapproved";
  masteryEligible: false;
}>;

export type AzurePronunciationFetch = (
  input: string | URL,
  init: RequestInit,
) => Promise<Response>;

export type AssessAzurePronunciationInput = Readonly<{
  config: AzurePronunciationConfig;
  referenceText: string;
  wavBytes: Uint8Array;
  fetchImpl?: AzurePronunciationFetch;
  /** Test/runtime override. Production callers should keep the 15 second default. */
  timeoutMs?: number;
}>;

export class AzurePronunciationConfigurationError extends Error {
  readonly code = "AZURE_PRONUNCIATION_CONFIGURATION_INVALID";
}

export class AzurePronunciationAudioError extends Error {
  readonly code = "AZURE_PRONUNCIATION_AUDIO_INVALID";
}

export class AzurePronunciationProtocolError extends Error {
  readonly code = "AZURE_PRONUNCIATION_PROTOCOL_INVALID";
}

export class AzurePronunciationRemoteError extends Error {
  readonly code = "AZURE_PRONUNCIATION_REMOTE_ERROR";

  constructor(readonly status: number | null) {
    super(
      status === null
        ? "Azure Speech could not be reached."
        : `Azure Speech returned HTTP ${status}.`,
    );
  }
}

export class AzurePronunciationNoMatchError extends Error {
  readonly code = "AZURE_PRONUNCIATION_NO_MATCH";

  constructor() {
    super("Azure Speech could not match the recording to the reference text.");
  }
}

export class AzurePronunciationTimeoutError extends Error {
  readonly code = "AZURE_PRONUNCIATION_TIMEOUT";

  constructor() {
    super("Azure Speech pronunciation assessment timed out.");
  }
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const containsControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127;
  });

const configurationError = (message: string): never => {
  throw new AzurePronunciationConfigurationError(message);
};

const audioError = (message: string): never => {
  throw new AzurePronunciationAudioError(message);
};

const protocolError = (message: string): never => {
  throw new AzurePronunciationProtocolError(message);
};

export const validateAzurePronunciationConfig = (
  config: AzurePronunciationConfig,
): AzurePronunciationConfig => {
  if (
    config.subscriptionKey.length < 16
    || config.subscriptionKey.length > 128
    || /\s/u.test(config.subscriptionKey)
    || containsControlCharacter(config.subscriptionKey)
  ) {
    configurationError("Azure Speech resource key is absent or malformed.");
  }
  if (!/^[a-z][a-z0-9]{1,31}$/u.test(config.region)) {
    configurationError("Azure Speech resource region is absent or malformed.");
  }
  return Object.freeze({ ...config });
};

export const validateAzurePronunciationReference = (value: string): string => {
  if (value.length === 0 || value !== value.trim()) {
    configurationError("Reference text must be non-empty and already trimmed.");
  }
  const characters = Array.from(value);
  if (characters.length > MAX_REFERENCE_CODE_POINTS) {
    configurationError("Reference text exceeds the short-audio safety bound.");
  }

  let hanCharacters = 0;
  for (const character of characters) {
    if (/\p{Script=Han}/u.test(character)) {
      hanCharacters += 1;
      continue;
    }
    if (!/[ ，。！？、；：“”‘’（）《》〈〉—…·,.!?:;]/u.test(character)) {
      configurationError("Reference text contains unsupported characters.");
    }
  }
  if (hanCharacters === 0 || hanCharacters > MAX_REFERENCE_HAN_CHARACTERS) {
    configurationError(
      `Reference text must contain between 1 and ${MAX_REFERENCE_HAN_CHARACTERS} Han characters.`,
    );
  }
  return value;
};

const readAscii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...bytes.subarray(offset, offset + length));

export const validateAzurePcmWav = (
  wavBytes: Uint8Array,
): AzurePcmWavMetadata => {
  if (!(wavBytes instanceof Uint8Array)) {
    audioError("Audio must be provided as bytes.");
  }
  if (wavBytes.byteLength < 44 || wavBytes.byteLength > MAX_AUDIO_BYTES) {
    audioError("Audio exceeds the bounded PCM WAV size.");
  }
  if (
    readAscii(wavBytes, 0, 4) !== "RIFF"
    || readAscii(wavBytes, 8, 4) !== "WAVE"
  ) {
    audioError("Audio must be a RIFF/WAVE container.");
  }

  const view = new DataView(
    wavBytes.buffer,
    wavBytes.byteOffset,
    wavBytes.byteLength,
  );
  if (view.getUint32(4, true) + 8 !== wavBytes.byteLength) {
    audioError("RIFF length does not match the uploaded audio.");
  }

  let offset = 12;
  let formatSeen = false;
  let dataByteLength: number | null = null;
  while (offset + 8 <= wavBytes.byteLength) {
    const chunkId = readAscii(wavBytes, offset, 4);
    const chunkLength = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;
    const chunkEnd = chunkDataOffset + chunkLength;
    if (chunkEnd > wavBytes.byteLength) {
      audioError("WAV chunk exceeds the container boundary.");
    }

    if (chunkId === "fmt ") {
      if (formatSeen || chunkLength < 16) {
        audioError("WAV format chunk is missing or duplicated.");
      }
      formatSeen = true;
      const audioFormat = view.getUint16(chunkDataOffset, true);
      const channels = view.getUint16(chunkDataOffset + 2, true);
      const sampleRate = view.getUint32(chunkDataOffset + 4, true);
      const byteRate = view.getUint32(chunkDataOffset + 8, true);
      const blockAlign = view.getUint16(chunkDataOffset + 12, true);
      const bitsPerSample = view.getUint16(chunkDataOffset + 14, true);
      if (
        audioFormat !== 1
        || channels !== 1
        || sampleRate !== 16_000
        || byteRate !== 32_000
        || blockAlign !== 2
        || bitsPerSample !== 16
      ) {
        audioError("Audio must be PCM16, 16 kHz, mono WAV.");
      }
    } else if (chunkId === "data") {
      if (dataByteLength !== null || chunkLength === 0 || chunkLength % 2 !== 0) {
        audioError("WAV data chunk is empty, malformed, or duplicated.");
      }
      dataByteLength = chunkLength;
    }

    offset = chunkEnd + (chunkLength % 2);
  }

  if (offset !== wavBytes.byteLength || !formatSeen) {
    audioError("WAV is incomplete or has an invalid padded chunk.");
  }
  if (dataByteLength === null) {
    audioError("WAV is missing its audio data chunk.");
  }
  const validatedDataByteLength = dataByteLength as number;
  if (validatedDataByteLength > MAX_PCM_DATA_BYTES) {
    audioError("Audio exceeds the 15 second short-audio limit.");
  }

  return Object.freeze({
    byteLength: wavBytes.byteLength,
    dataByteLength: validatedDataByteLength,
    durationMs: Math.round((validatedDataByteLength / 32_000) * 1_000),
    sampleRate: 16_000,
    channels: 1,
    bitsPerSample: 16,
  });
};

const toBase64 = (bytes: Uint8Array): string => {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const packed = (first << 16) | (second << 8) | third;
    output += alphabet[(packed >>> 18) & 63];
    output += alphabet[(packed >>> 12) & 63];
    output += index + 1 < bytes.length ? alphabet[(packed >>> 6) & 63] : "=";
    output += index + 2 < bytes.length ? alphabet[packed & 63] : "=";
  }
  return output;
};

export const createAzurePronunciationAssessmentHeader = (
  referenceText: string,
): string => {
  const safeReference = validateAzurePronunciationReference(referenceText);
  const parameters = JSON.stringify({
    ReferenceText: safeReference,
    GradingSystem: "HundredMark",
    Granularity: "Phoneme",
    Dimension: "Comprehensive",
    EnableMiscue: true,
  });
  return toBase64(new TextEncoder().encode(parameters));
};

const parseRecord = (value: unknown, label: string): Record<string, unknown> => {
  if (!isPlainRecord(value)) {
    protocolError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const boundedString = (
  record: Record<string, unknown>,
  field: string,
  maximumLength: number,
) => {
  const value = record[field];
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > maximumLength
    || containsControlCharacter(value)
  ) {
    protocolError(`${field} must be a bounded string.`);
  }
  return value as string;
};

const score = (record: Record<string, unknown>, field: string) => {
  const value = record[field];
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < 0
    || value > 100
  ) {
    protocolError(`${field} must be a score from 0 to 100.`);
  }
  return value as number;
};

const documentedOrNestedAssessment = (
  record: Record<string, unknown>,
  documentedFields: readonly string[],
  label: string,
) => {
  // The short-audio REST API documents scores directly on NBest/Word/Phoneme.
  // A nested shape is accepted only as a compatibility fallback for SDK-shaped
  // fixtures/proxies; a partially present direct shape must still fail closed.
  if (documentedFields.some((field) => field in record)) return record;
  return parseRecord(record.PronunciationAssessment, label);
};

const parsePhoneme = (
  value: unknown,
): AzurePronunciationPhonemeEvidence => {
  const record = parseRecord(value, "Azure phoneme");
  const assessment = documentedOrNestedAssessment(
    record,
    ["AccuracyScore"],
    "Azure phoneme pronunciation assessment",
  );
  return Object.freeze({
    phoneme: boundedString(record, "Phoneme", 64),
    accuracyScore: score(assessment, "AccuracyScore"),
  });
};

const parseWord = (value: unknown): AzurePronunciationWordEvidence => {
  const record = parseRecord(value, "Azure word");
  const assessment = documentedOrNestedAssessment(
    record,
    ["AccuracyScore", "ErrorType"],
    "Azure word pronunciation assessment",
  );
  const phonemeValues = record.Phonemes;
  if (!Array.isArray(phonemeValues)) {
    protocolError("Azure word phonemes must be an array.");
  }
  const boundedPhonemeValues = phonemeValues as unknown[];
  if (boundedPhonemeValues.length > MAX_PHONEMES_PER_WORD) {
    protocolError("Azure word phonemes exceed the protocol safety bound.");
  }
  const errorType = boundedString(assessment, "ErrorType", 64);
  if (boundedPhonemeValues.length === 0 && errorType !== "Omission") {
    protocolError("A scored Azure word must contain phoneme evidence.");
  }
  return Object.freeze({
    word: boundedString(record, "Word", 128),
    accuracyScore: score(assessment, "AccuracyScore"),
    errorType,
    phonemes: Object.freeze(boundedPhonemeValues.map(parsePhoneme)),
  });
};

export const parseAzurePronunciationResponse = (
  input: unknown,
): AzurePronunciationAssessment => {
  const response = parseRecord(input, "Azure Speech response");
  const recognitionStatus = boundedString(response, "RecognitionStatus", 64);
  if (recognitionStatus === "NoMatch") {
    throw new AzurePronunciationNoMatchError();
  }
  if (recognitionStatus !== "Success") {
    protocolError("Azure Speech response is not a successful recognition result.");
  }

  const nBestValues = response.NBest;
  if (!Array.isArray(nBestValues)) {
    protocolError("Azure Speech NBest evidence must be an array.");
  }
  const boundedNBestValues = nBestValues as unknown[];
  if (boundedNBestValues.length === 0 || boundedNBestValues.length > 10) {
    protocolError("Azure Speech response must contain bounded NBest evidence.");
  }
  const best = parseRecord(boundedNBestValues[0], "Azure best hypothesis");
  const assessment = documentedOrNestedAssessment(
    best,
    ["AccuracyScore", "FluencyScore", "CompletenessScore", "PronScore"],
    "Azure aggregate pronunciation assessment",
  );
  const wordValues = best.Words;
  if (!Array.isArray(wordValues) || wordValues.length === 0 || wordValues.length > MAX_WORDS) {
    protocolError("Azure Speech response must contain bounded word evidence.");
  }

  const displayText =
    typeof response.DisplayText === "string" && response.DisplayText.length > 0
      ? boundedString(response, "DisplayText", 512)
      : boundedString(best, "Display", 512);

  return Object.freeze({
    provider: "azure-speech-pronunciation-assessment",
    providerApi: "short-audio-rest-v1",
    locale: AZURE_LOCALE,
    transcript: displayText,
    aggregate: Object.freeze({
      accuracyScore: score(assessment, "AccuracyScore"),
      fluencyScore: score(assessment, "FluencyScore"),
      completenessScore: score(assessment, "CompletenessScore"),
      pronunciationScore: score(assessment, "PronScore"),
    }),
    words: Object.freeze((wordValues as unknown[]).map(parseWord)),
    lexicalToneAssessment: "not-reported-by-provider",
    calibration: "unapproved",
    masteryEligible: false,
  });
};

const parseBoundedResponseBody = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isSafeInteger(parsedLength)
      || parsedLength < 0
      || parsedLength > MAX_RESPONSE_BYTES
    ) {
      protocolError("Azure Speech response exceeds the protocol safety bound.");
    }
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    protocolError("Azure Speech response must be JSON.");
  }
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) {
    protocolError("Azure Speech response exceeds the protocol safety bound.");
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return protocolError("Azure Speech response is not valid JSON.");
  }
};

const isKnownError = (error: unknown) =>
  error instanceof AzurePronunciationConfigurationError
  || error instanceof AzurePronunciationAudioError
  || error instanceof AzurePronunciationProtocolError
  || error instanceof AzurePronunciationRemoteError
  || error instanceof AzurePronunciationNoMatchError
  || error instanceof AzurePronunciationTimeoutError;

export const assessAzurePronunciation = async (
  input: AssessAzurePronunciationInput,
): Promise<AzurePronunciationAssessment> => {
  const config = validateAzurePronunciationConfig(input.config);
  validateAzurePcmWav(input.wavBytes);
  const pronunciationHeader = createAzurePronunciationAssessmentHeader(
    input.referenceText,
  );
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > DEFAULT_TIMEOUT_MS) {
    configurationError("Azure Speech timeout must be between 1 and 15000 ms.");
  }

  const endpoint = new URL(
    `https://${config.region}${AZURE_SPEECH_HOST_SUFFIX}${AZURE_SHORT_AUDIO_PATH}`,
  );
  endpoint.searchParams.set("language", AZURE_LOCALE);
  endpoint.searchParams.set("format", "detailed");
  endpoint.searchParams.set("profanity", "raw");

  const controller = new AbortController();
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new AzurePronunciationTimeoutError());
    }, timeoutMs);
  });
  const fetchImpl: AzurePronunciationFetch = input.fetchImpl ?? globalThis.fetch;

  const requestPromise = (async () => {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Ocp-Apim-Subscription-Key": config.subscriptionKey,
        "Pronunciation-Assessment": pronunciationHeader,
      },
      body: Uint8Array.from(input.wavBytes).buffer,
      // Cloudflare Workers does not implement redirect:"error". Manual mode
      // preserves the same fail-closed behavior because every 3xx response is
      // rejected below instead of forwarding the secret to a new origin.
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) {
      throw new AzurePronunciationProtocolError(
        "Azure Speech redirected a request that contains a server secret.",
      );
    }
    if (!response.ok) {
      throw new AzurePronunciationRemoteError(response.status);
    }
    return parseAzurePronunciationResponse(
      await parseBoundedResponseBody(response),
    );
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    if (timedOut || error instanceof AzurePronunciationTimeoutError) {
      throw new AzurePronunciationTimeoutError();
    }
    if (isKnownError(error)) throw error;
    // Never forward fetch/provider messages: they may include request headers,
    // endpoint diagnostics, or other details unsuitable for learner UI/logs.
    throw new AzurePronunciationRemoteError(null);
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
};
