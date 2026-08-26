import { ACOUSTIC_VOICE_CONSENT_POLICY_VERSION } from "../lib/acousticVoiceConsent";
import type { MandarinPcmQualityMetadata } from "./mandarinPcmRecorder";

const ACOUSTIC_ASSESSMENT_ENDPOINT = "/api/speech/pronunciation/assess";
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;
const MAX_WAV_BYTES = 512 * 1024;
const MAX_RESPONSE_CHARACTERS = 160 * 1024;
const MAX_WORDS = 64;
const MAX_PHONEMES_PER_WORD = 32;
const MIN_USABLE_RMS_AMPLITUDE = 0.006;
const MIN_USABLE_PEAK_AMPLITUDE = 0.018;
const MAX_CLIPPED_SAMPLE_RATIO = 0.001;

export type AcousticPronunciationPhoneme = Readonly<{
  phoneme: string;
  accuracyScore: number;
}>;

export type AcousticPronunciationWord = Readonly<{
  word: string;
  accuracyScore: number;
  errorType: string;
  phonemes: readonly AcousticPronunciationPhoneme[];
}>;

export type AcousticPronunciationAssessment = Readonly<{
  provider: "azure-speech-pronunciation-assessment";
  providerApi: "short-audio-rest-v1";
  locale: "zh-CN";
  transcript: string;
  aggregate: Readonly<{
    accuracyScore: number;
    fluencyScore: number;
    completenessScore: number;
    pronunciationScore: number;
  }>;
  words: readonly AcousticPronunciationWord[];
  lexicalToneAssessment: "not-reported-by-provider";
  calibration: "unapproved";
  masteryEligible: false;
}>;

export type AcousticPronunciationResponse = Readonly<{
  schemaVersion: 1;
  activityId: string;
  assessment: AcousticPronunciationAssessment;
}>;

export type AcousticPronunciationClientErrorCode =
  | "invalid-request"
  | "consent-required"
  | "no-match"
  | "timeout"
  | "quota-unavailable"
  | "service-unavailable"
  | "invalid-response"
  | "cancelled";

export class AcousticPronunciationClientError extends Error {
  readonly name = "AcousticPronunciationClientError";

  constructor(
    readonly code: AcousticPronunciationClientErrorCode,
    readonly userMessage: string,
  ) {
    super(userMessage);
  }
}

export type AcousticPronunciationFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type AssessAcousticPronunciationInput = Readonly<{
  activityId: string;
  audio: Blob;
  quality?: MandarinPcmQualityMetadata;
  signal?: AbortSignal;
  fetchImpl?: AcousticPronunciationFetch;
  /** Test override. Product callers should keep the bounded default. */
  timeoutMs?: number;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const containsControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127;
  });

const safeText = (value: unknown, maximumLength: number): value is string =>
  typeof value === "string"
  && value.length > 0
  && value.length <= maximumLength
  && !containsControlCharacter(value);

const score = (value: unknown): value is number =>
  typeof value === "number"
  && Number.isFinite(value)
  && value >= 0
  && value <= 100;

const parsePhoneme = (value: unknown): AcousticPronunciationPhoneme | null => {
  if (!isRecord(value) || !safeText(value.phoneme, 32) || !score(value.accuracyScore)) {
    return null;
  }
  const phoneme = value.phoneme;
  return Object.freeze({
    phoneme,
    accuracyScore: value.accuracyScore,
  });
};

const parseWord = (value: unknown): AcousticPronunciationWord | null => {
  if (
    !isRecord(value)
    || !safeText(value.word, 32)
    || !safeText(value.errorType, 48)
    || !score(value.accuracyScore)
    || !Array.isArray(value.phonemes)
    || value.phonemes.length > MAX_PHONEMES_PER_WORD
  ) return null;

  const word = value.word;
  const errorType = value.errorType;
  const phonemes = value.phonemes.map(parsePhoneme);
  if (phonemes.some((item) => item === null)) return null;
  return Object.freeze({
    word,
    accuracyScore: value.accuracyScore,
    errorType,
    phonemes: Object.freeze(phonemes as AcousticPronunciationPhoneme[]),
  });
};

const invalidResponse = (): never => {
  throw new AcousticPronunciationClientError(
    "invalid-response",
    "Kết quả chấm âm học chưa hợp lệ. Bản thu không được dùng để tính tiến độ.",
  );
};

export const parseAcousticPronunciationResponse = (
  value: unknown,
  expectedActivityId: string,
): AcousticPronunciationResponse => {
  if (
    !isRecord(value)
    || value.schemaVersion !== 1
    || value.activityId !== expectedActivityId
    || !isRecord(value.assessment)
  ) return invalidResponse();

  const assessment = value.assessment;
  const aggregate = assessment.aggregate;
  if (
    assessment.provider !== "azure-speech-pronunciation-assessment"
    || assessment.providerApi !== "short-audio-rest-v1"
    || assessment.locale !== "zh-CN"
    || !safeText(assessment.transcript, 256)
    || !isRecord(aggregate)
    || !score(aggregate.accuracyScore)
    || !score(aggregate.fluencyScore)
    || !score(aggregate.completenessScore)
    || !score(aggregate.pronunciationScore)
    || !Array.isArray(assessment.words)
    || assessment.words.length > MAX_WORDS
    || assessment.lexicalToneAssessment !== "not-reported-by-provider"
    || assessment.calibration !== "unapproved"
    || assessment.masteryEligible !== false
  ) return invalidResponse();

  const transcript = assessment.transcript;
  const words = assessment.words.map(parseWord);
  if (words.some((item) => item === null)) return invalidResponse();

  return Object.freeze({
    schemaVersion: 1,
    activityId: expectedActivityId,
    assessment: Object.freeze({
      provider: "azure-speech-pronunciation-assessment",
      providerApi: "short-audio-rest-v1",
      locale: "zh-CN",
      transcript,
      aggregate: Object.freeze({
        accuracyScore: aggregate.accuracyScore,
        fluencyScore: aggregate.fluencyScore,
        completenessScore: aggregate.completenessScore,
        pronunciationScore: aggregate.pronunciationScore,
      }),
      words: Object.freeze(words as AcousticPronunciationWord[]),
      lexicalToneAssessment: "not-reported-by-provider",
      calibration: "unapproved",
      masteryEligible: false,
    }),
  }) satisfies AcousticPronunciationResponse;
};

const mappedApiErrors: Readonly<Record<string, Readonly<{
  code: AcousticPronunciationClientErrorCode;
  message: string;
}>>> = {
  ACOUSTIC_CONSENT_REQUIRED: {
    code: "consent-required",
    message: "Cần xác nhận lại trước khi gửi bản thu để chấm âm học.",
  },
  PRONUNCIATION_NO_MATCH: {
    code: "no-match",
    message: "Chưa nghe rõ đủ câu. Hãy đưa micro gần hơn, đọc trọn câu rồi thử lại.",
  },
  PRONUNCIATION_TIMEOUT: {
    code: "timeout",
    message: "Đối chiếu mất quá lâu. Bản thu không được lưu; hãy thử lại khi kết nối ổn định.",
  },
  PRONUNCIATION_FREE_QUOTA_UNAVAILABLE: {
    code: "quota-unavailable",
    message: "Hạn mức chấm miễn phí đang tạm bận. Bạn vẫn có thể luyện bằng nhận dạng và đo thanh trên máy.",
  },
  PRONUNCIATION_LOCAL_CONFIG_UNAVAILABLE: {
    code: "service-unavailable",
    message: "Chấm âm học beta chưa sẵn sàng trên máy này. Các chế độ luyện còn lại vẫn dùng được.",
  },
  PRONUNCIATION_PROVIDER_AUDIO_REJECTED: {
    code: "no-match",
    message: "Đoạn ghi âm chưa đủ rõ để phân tích. Hãy nói gần micro, đọc trọn câu rồi thử lại.",
  },
  PRONUNCIATION_PROVIDER_REGION_UNAVAILABLE: {
    code: "service-unavailable",
    message: "Dịch vụ chấm âm học chưa sẵn sàng ở vùng đã cấu hình. Các chế độ luyện còn lại vẫn dùng được.",
  },
  PRONUNCIATION_PROVIDER_NETWORK_UNAVAILABLE: {
    code: "service-unavailable",
    message: "Không thể kết nối tới dịch vụ chấm âm học. Bản thu không được lưu; hãy kiểm tra mạng rồi thử lại.",
  },
  PRONUNCIATION_SERVICE_UNAVAILABLE: {
    code: "service-unavailable",
    message: "Dịch vụ chấm âm học đang tạm gián đoạn. Bản thu không được tính vào tiến độ.",
  },
};

const readJsonBody = async (response: Response): Promise<unknown> => {
  const raw = await response.text();
  if (!raw || raw.length > MAX_RESPONSE_CHARACTERS) return invalidResponse();
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return invalidResponse();
  }
};

const apiErrorFrom = (value: unknown) => {
  const apiError = isRecord(value) && isRecord(value.error)
    ? value.error
    : null;
  const mapped = apiError && typeof apiError.code === "string"
    ? mappedApiErrors[apiError.code]
    : undefined;
  if (mapped) {
    return new AcousticPronunciationClientError(mapped.code, mapped.message);
  }
  return new AcousticPronunciationClientError(
    "service-unavailable",
    "Chưa thể chấm âm học lúc này. Bản thu không được lưu hay tính vào tiến độ.",
  );
};

const validateInput = (input: AssessAcousticPronunciationInput) => {
  if (
    !input.activityId.startsWith("pronunciation:")
    || input.activityId.length > 240
    || containsControlCharacter(input.activityId)
    || input.audio.type !== "audio/wav"
    || input.audio.size < 44
    || input.audio.size > MAX_WAV_BYTES
  ) {
    throw new AcousticPronunciationClientError(
      "invalid-request",
      "Bản thu chưa đúng định dạng an toàn để chấm âm học.",
    );
  }
  if (input.quality) {
    if (
      !Number.isFinite(input.quality.rmsAmplitude)
      || !Number.isFinite(input.quality.peakAmplitude)
      || !Number.isFinite(input.quality.clippedSampleRatio)
      || input.quality.rmsAmplitude < MIN_USABLE_RMS_AMPLITUDE
      || input.quality.peakAmplitude < MIN_USABLE_PEAK_AMPLITUDE
    ) {
      throw new AcousticPronunciationClientError(
        "invalid-request",
        "Tín hiệu giọng quá nhỏ để chấm đáng tin cậy. Hãy đưa micro gần hơn và đọc lại.",
      );
    }
    if (
      input.quality.clippingDetected
      || input.quality.clippedSampleRatio >= MAX_CLIPPED_SAMPLE_RATIO
    ) {
      throw new AcousticPronunciationClientError(
        "invalid-request",
        "Bản thu bị vỡ tiếng nên chưa thể chấm đáng tin cậy. Hãy lùi micro ra một chút và đọc lại.",
      );
    }
  }
};

export const assessAcousticPronunciation = async (
  input: AssessAcousticPronunciationInput,
): Promise<AcousticPronunciationResponse> => {
  validateInput(input);
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new AcousticPronunciationClientError(
      "service-unavailable",
      "Trình duyệt này chưa hỗ trợ gửi bản thu để chấm âm học.",
    );
  }

  const timeoutMs = input.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    throw new AcousticPronunciationClientError(
      "invalid-request",
      "Không thể mở phiên chấm âm học an toàn.",
    );
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(input.signal?.reason);
  input.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeoutHandle = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(ACOUSTIC_ASSESSMENT_ENDPOINT, {
      method: "POST",
      body: input.audio,
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "content-type": "audio/wav",
        "x-hanzi-acoustic-consent-policy": ACOUSTIC_VOICE_CONSENT_POLICY_VERSION,
        "x-hanzi-pronunciation-activity-id": input.activityId,
      },
      signal: controller.signal,
    });
    const payload = await readJsonBody(response);
    if (!response.ok) throw apiErrorFrom(payload);
    return parseAcousticPronunciationResponse(payload, input.activityId);
  } catch (error) {
    if (error instanceof AcousticPronunciationClientError) throw error;
    if (timedOut) {
      throw new AcousticPronunciationClientError(
        "timeout",
        "Đối chiếu mất quá lâu. Bản thu không được lưu; hãy thử lại khi kết nối ổn định.",
      );
    }
    if (input.signal?.aborted) {
      throw new AcousticPronunciationClientError(
        "cancelled",
        "Lượt chấm âm học đã được hủy.",
      );
    }
    throw new AcousticPronunciationClientError(
      "service-unavailable",
      "Không kết nối được dịch vụ chấm âm học. Bản thu không được lưu hay tính vào tiến độ.",
    );
  } finally {
    globalThis.clearTimeout(timeoutHandle);
    input.signal?.removeEventListener("abort", abortFromCaller);
  }
};
