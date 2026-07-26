import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  parseLearningAttemptCommand,
  type LearningAttemptReceiptV1,
} from "../../../../src/learning/attemptProtocol";
import {
  AttemptDeviceSequenceConflictError,
  AttemptEnrollmentUnavailableError,
  AttemptIdempotencyConflictError,
  AttemptRepository,
  AttemptSessionUnavailableError,
} from "../../../../src/server/attemptRepository";
import {
  scoreObjectiveAttempt,
  UnsupportedAttemptActivityError,
} from "../../../../src/server/attemptScoring";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import { CourseVersionBindingError } from "../../../../src/server/courseVersionRepository";
import { LearningResetEpochConflictError } from "../../../../src/server/learningResetEpoch";
import {
  consumeMutationRateLimit,
  LEARNING_ATTEMPT_MUTATION_POLICY,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
} from "../../../../src/server/mutationRateLimit";
import { SyncRepository } from "../../../../src/server/syncRepository";
import {
  noStoreJsonHeaders,
  type SyncApiError,
} from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 32_000;

const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  Response.json(body, {
    status,
    headers: { ...noStoreJsonHeaders, ...headers },
  });

const requestIdentifier = (request: Request) => {
  const provided = request.headers.get("x-request-id")?.trim();
  return provided && provided.length <= 120 ? provided : crypto.randomUUID();
};

const errorResponse = (
  status: number,
  code: string,
  message: string,
  requestId: string,
  retryable = false,
  headers?: HeadersInit,
) => json({
  error: { code, message, requestId, retryable },
} satisfies SyncApiError, status, { "x-request-id": requestId, ...headers });

const sameOriginMutation = (request: Request) => {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
};

export async function POST(request: Request) {
  const requestId = requestIdentifier(request);
  try {
    if (!sameOriginMutation(request)) {
      return errorResponse(
        403,
        "CROSS_ORIGIN_BLOCKED",
        "Yêu cầu ghi attempt khác nguồn đã bị chặn.",
        requestId,
      );
    }
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Đăng nhập ChatGPT để ghi attempt lên cloud.",
        requestId,
      );
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const rateLimit = await consumeMutationRateLimit(
      database,
      userId,
      LEARNING_ATTEMPT_MUTATION_POLICY,
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "MUTATION_RATE_LIMITED",
        "Quá nhiều attempt trong một khoảng thời gian; hãy thử lại sau.",
        requestId,
        true,
        mutationRateLimitHeaders(rateLimit),
      );
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(
        415,
        "JSON_REQUIRED",
        "Attempt API chỉ nhận application/json.",
        requestId,
      );
    }
    const body = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
    if (!body.ok) {
      return errorResponse(
        413,
        "ATTEMPT_PAYLOAD_TOO_LARGE",
        "Attempt vượt giới hạn kích thước.",
        requestId,
      );
    }
    const raw = body.text;
    let input: unknown;
    try {
      input = JSON.parse(raw);
    } catch {
      return errorResponse(
        400,
        "INVALID_JSON",
        "Không thể đọc attempt JSON.",
        requestId,
      );
    }
    const parsed = parseLearningAttemptCommand(input);
    if (!parsed.ok) {
      return errorResponse(
        422,
        "INVALID_ATTEMPT_COMMAND",
        parsed.reason,
        requestId,
      );
    }
    const score = scoreObjectiveAttempt(parsed.command);
    const receipt: LearningAttemptReceiptV1 =
      await new AttemptRepository(database).commitObjectiveAttempt(
        userId,
        parsed.command,
        score,
      );
    return json(receipt, receipt.duplicate ? 200 : 201, {
      "x-request-id": requestId,
      ...mutationRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    if (error instanceof LearningResetEpochConflictError) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    if (error instanceof MutationRateLimitBackendError) {
      return errorResponse(
        503,
        error.code,
        "Không thể xác minh giới hạn ghi an toàn lúc này.",
        requestId,
        true,
      );
    }
    if (error instanceof CourseVersionBindingError) {
      return errorResponse(
        503,
        error.code,
        "Phiên bản nội dung trên cloud chưa khớp package bất biến hiện tại.",
        requestId,
        true,
      );
    }
    if (error instanceof UnsupportedAttemptActivityError) {
      return errorResponse(
        409,
        error.code,
        error.message,
        requestId,
      );
    }
    if (
      error instanceof AttemptIdempotencyConflictError
      || error instanceof AttemptDeviceSequenceConflictError
      || error instanceof AttemptEnrollmentUnavailableError
      || error instanceof AttemptSessionUnavailableError
    ) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "learning_attempt_failed",
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "ATTEMPT_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Không thể ghi attempt lúc này; client phải giữ command trong outbox.",
      requestId,
      true,
    );
  }
}
