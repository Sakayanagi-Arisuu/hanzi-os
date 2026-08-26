import {
  CONTENT_VERSION,
  RELEASED_VOCABULARY,
} from "../data/curriculum";
import { ACOUSTIC_VOICE_CONSENT_POLICY_VERSION } from "../lib/acousticVoiceConsent";
import {
  assessAzurePronunciation,
  AzurePronunciationAudioError,
  AzurePronunciationConfigurationError,
  AzurePronunciationNoMatchError,
  AzurePronunciationProtocolError,
  AzurePronunciationRemoteError,
  AzurePronunciationTimeoutError,
  type AssessAzurePronunciationInput,
  type AzurePronunciationAssessment,
} from "./azurePronunciation";

const MAX_WAV_BYTES = 512 * 1024;
const REQUIRED_CONTENT_TYPE = "audio/wav";
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

const NO_STORE_JSON_HEADERS = {
  "cache-control": "private, no-store, max-age=0",
  pragma: "no-cache",
  expires: "0",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
  "cross-origin-resource-policy": "same-origin",
} as const;

const REFERENCE_BY_ACTIVITY_ID = new Map(
  RELEASED_VOCABULARY.map((word) => [
    `pronunciation:${CONTENT_VERSION}:${word.id}`,
    word.example,
  ]),
);

export type LocalPronunciationEnvironment = Readonly<{
  NODE_ENV?: string;
  HANZI_OS_AZURE_PRONUNCIATION_LOCAL_ENABLED?: string;
  AZURE_SPEECH_SUBSCRIPTION_KEY?: string;
  AZURE_SPEECH_REGION?: string;
}>;

export type LocalPronunciationAssessor = (
  input: AssessAzurePronunciationInput,
) => Promise<AzurePronunciationAssessment>;

export type LocalPronunciationRouteDependencies = Readonly<{
  environment?: LocalPronunciationEnvironment;
  assessor?: LocalPronunciationAssessor;
}>;

type ApiError = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
    retryable: boolean;
  }>;
}>;

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: NO_STORE_JSON_HEADERS,
});

const errorResponse = (
  status: number,
  code: string,
  message: string,
  retryable = false,
) => json({
  error: { code, message, retryable },
} satisfies ApiError, status);

const notFound = () => errorResponse(
  404,
  "LOCAL_PRONUNCIATION_NOT_FOUND",
  "Không tìm thấy tài nguyên.",
);

const isLoopbackRequest = (request: Request): boolean => {
  try {
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    const origin = request.headers.get("origin");
    if (
      !host
      || !origin
      || !LOOPBACK_HOSTNAMES.has(requestUrl.hostname.toLowerCase())
      || host.toLowerCase() !== requestUrl.host.toLowerCase()
    ) {
      return false;
    }

    const originUrl = new URL(origin);
    if (
      originUrl.origin !== requestUrl.origin
      || !LOOPBACK_HOSTNAMES.has(originUrl.hostname.toLowerCase())
    ) {
      return false;
    }

    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    return (!forwardedHost || forwardedHost.toLowerCase() === host.toLowerCase())
      && (!forwardedProto || forwardedProto.toLowerCase() === requestUrl.protocol.slice(0, -1));
  } catch {
    return false;
  }
};

const isLocallyEnabled = (environment: LocalPronunciationEnvironment) =>
  environment.NODE_ENV === "development"
  && environment.HANZI_OS_AZURE_PRONUNCIATION_LOCAL_ENABLED === "true";

const stringBinding = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const resolveLocalPronunciationEnvironment = async (
  provided?: LocalPronunciationEnvironment,
): Promise<LocalPronunciationEnvironment> => {
  if (provided) return provided;

  let runtimeBindings: Record<string, unknown> = {};
  try {
    const runtime = await import("cloudflare:workers");
    runtimeBindings = runtime.env as Record<string, unknown>;
  } catch {
    // Node/Vitest use process.env; Vinext dev injects .dev.vars through the
    // Cloudflare runtime binding exposed above.
  }

  return {
    NODE_ENV: process.env.NODE_ENV,
    HANZI_OS_AZURE_PRONUNCIATION_LOCAL_ENABLED:
      stringBinding(runtimeBindings.HANZI_OS_AZURE_PRONUNCIATION_LOCAL_ENABLED)
      ?? process.env.HANZI_OS_AZURE_PRONUNCIATION_LOCAL_ENABLED,
    AZURE_SPEECH_SUBSCRIPTION_KEY:
      stringBinding(runtimeBindings.AZURE_SPEECH_SUBSCRIPTION_KEY)
      ?? process.env.AZURE_SPEECH_SUBSCRIPTION_KEY,
    AZURE_SPEECH_REGION:
      stringBinding(runtimeBindings.AZURE_SPEECH_REGION)
      ?? process.env.AZURE_SPEECH_REGION,
  };
};

type BoundedBinaryBody =
  | Readonly<{ ok: true; bytes: Uint8Array }>
  | Readonly<{ ok: false }>;

const readBoundedBinaryBody = async (
  request: Request,
  maximumBytes: number,
): Promise<BoundedBinaryBody> => {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^(0|[1-9]\d*)$/u.test(declaredLength)) return { ok: false };
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length > maximumBytes) {
      return { ok: false };
    }
  }
  if (!request.body) return { ok: true, bytes: new Uint8Array() };

  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let byteLength = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      byteLength += chunk.value.byteLength;
      if (byteLength > maximumBytes) {
        await reader.cancel("pronunciation-audio-too-large").catch(() => undefined);
        return { ok: false };
      }
      chunks.push(Uint8Array.from(chunk.value));
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
};

const providerErrorResponse = (error: unknown): Response => {
  if (error instanceof AzurePronunciationNoMatchError) {
    return errorResponse(
      422,
      "PRONUNCIATION_NO_MATCH",
      "Chưa nghe rõ đủ câu để chấm. Hãy nói gần micro và thử lại.",
      true,
    );
  }
  if (error instanceof AzurePronunciationTimeoutError) {
    return errorResponse(
      504,
      "PRONUNCIATION_TIMEOUT",
      "Đối chiếu mất quá lâu. Đoạn ghi âm không được lưu; hãy thử lại.",
      true,
    );
  }
  if (error instanceof AzurePronunciationAudioError) {
    return errorResponse(
      422,
      "PRONUNCIATION_AUDIO_INVALID",
      "Đoạn ghi âm chưa đúng định dạng PCM 16 kHz mono hoặc vượt giới hạn 15 giây.",
    );
  }
  if (error instanceof AzurePronunciationConfigurationError) {
    return errorResponse(
      503,
      "PRONUNCIATION_LOCAL_CONFIG_UNAVAILABLE",
      "Chấm phát âm miễn phí chưa được cấu hình trên máy này.",
    );
  }
  if (error instanceof AzurePronunciationProtocolError) {
    return errorResponse(
      502,
      "PRONUNCIATION_RESULT_INVALID",
      "Dịch vụ chấm phát âm trả về kết quả chưa hợp lệ. Hãy thử lại.",
      true,
    );
  }
  if (error instanceof AzurePronunciationRemoteError) {
    if (error.status === 429) {
      return errorResponse(
        429,
        "PRONUNCIATION_FREE_QUOTA_UNAVAILABLE",
        "Hạn mức miễn phí đang tạm hết hoặc dịch vụ yêu cầu chờ. Hãy thử lại sau.",
        true,
      );
    }
    if (error.status === 401 || error.status === 403) {
      return errorResponse(
        503,
        "PRONUNCIATION_LOCAL_CONFIG_UNAVAILABLE",
        "Cấu hình chấm phát âm miễn phí trên máy này chưa hợp lệ.",
      );
    }
    if (error.status === 408 || error.status === 504) {
      return errorResponse(
        504,
        "PRONUNCIATION_TIMEOUT",
        "Đối chiếu mất quá lâu. Đoạn ghi âm không được lưu; hãy thử lại.",
        true,
      );
    }
    if (error.status === 400 || error.status === 422) {
      return errorResponse(
        422,
        "PRONUNCIATION_PROVIDER_AUDIO_REJECTED",
        "Đoạn ghi âm chưa đủ rõ để dịch vụ phân tích. Hãy nói gần micro và thử lại.",
        true,
      );
    }
    if (error.status === 404) {
      return errorResponse(
        503,
        "PRONUNCIATION_PROVIDER_REGION_UNAVAILABLE",
        "Dịch vụ chấm phát âm chưa sẵn sàng ở vùng đã cấu hình.",
      );
    }
    if (error.status === null) {
      return errorResponse(
        503,
        "PRONUNCIATION_PROVIDER_NETWORK_UNAVAILABLE",
        "Không thể kết nối tới dịch vụ chấm phát âm. Hãy kiểm tra mạng và thử lại.",
        true,
      );
    }
  }
  return errorResponse(
    503,
    "PRONUNCIATION_SERVICE_UNAVAILABLE",
    "Dịch vụ chấm phát âm đang tạm thời không sẵn sàng.",
    true,
  );
};

export const handleLocalPronunciationAssessment = async (
  request: Request,
  dependencies: LocalPronunciationRouteDependencies = {},
): Promise<Response> => {
  const environment = await resolveLocalPronunciationEnvironment(
    dependencies.environment,
  );
  if (!isLocallyEnabled(environment) || !isLoopbackRequest(request)) {
    return notFound();
  }
  if (request.method !== "POST") {
    return errorResponse(
      405,
      "PRONUNCIATION_METHOD_NOT_ALLOWED",
      "Chỉ hỗ trợ gửi đoạn ghi âm bằng POST.",
    );
  }
  if (request.headers.get("content-type") !== REQUIRED_CONTENT_TYPE) {
    return errorResponse(
      415,
      "PRONUNCIATION_WAV_REQUIRED",
      "Chỉ nhận tệp WAV PCM 16 kHz mono.",
    );
  }
  if (
    request.headers.get("x-hanzi-acoustic-consent-policy")
    !== ACOUSTIC_VOICE_CONSENT_POLICY_VERSION
  ) {
    return errorResponse(
      428,
      "ACOUSTIC_CONSENT_REQUIRED",
      "Cần xác nhận lại việc gửi đoạn ghi âm tới dịch vụ chấm phát âm.",
    );
  }

  const activityId = request.headers.get("x-hanzi-pronunciation-activity-id");
  const referenceText = activityId && activityId.length <= 240
    ? REFERENCE_BY_ACTIVITY_ID.get(activityId)
    : undefined;
  if (!activityId || !referenceText) {
    return errorResponse(
      422,
      "PRONUNCIATION_ACTIVITY_UNKNOWN",
      "Câu luyện đọc không thuộc nội dung đã phát hành.",
    );
  }

  const body = await readBoundedBinaryBody(request, MAX_WAV_BYTES);
  if (!body.ok) {
    return errorResponse(
      413,
      "PRONUNCIATION_AUDIO_TOO_LARGE",
      "Đoạn ghi âm vượt giới hạn 512 KiB.",
    );
  }

  try {
    const assessment = await (dependencies.assessor ?? assessAzurePronunciation)({
      config: {
        subscriptionKey: environment.AZURE_SPEECH_SUBSCRIPTION_KEY ?? "",
        region: environment.AZURE_SPEECH_REGION ?? "",
      },
      referenceText,
      wavBytes: body.bytes,
    });
    return json({
      schemaVersion: 1,
      activityId,
      assessment,
    });
  } catch (error) {
    return providerErrorResponse(error);
  }
};
