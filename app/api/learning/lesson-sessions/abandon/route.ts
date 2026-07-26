import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  parseAbandonLessonSessionCommand,
  type AbandonLessonSessionReceiptV1,
} from "../../../../../src/learning/lessonSessionAbandonmentProtocol";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../../src/server/d1";
import { readBoundedRequestText } from "../../../../../src/server/boundedRequestBody";
import { LearningResetEpochConflictError } from "../../../../../src/server/learningResetEpoch";
import {
  LessonSessionAbandonmentDeviceSequenceConflictError,
  LessonSessionAbandonmentIdempotencyConflictError,
  LessonSessionAbandonmentRepository,
  LessonSessionAbandonmentUnavailableError,
} from "../../../../../src/server/lessonSessionAbandonmentRepository";
import {
  consumeMutationRateLimit,
  LESSON_SESSION_ABANDON_MUTATION_POLICY,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
} from "../../../../../src/server/mutationRateLimit";
import { SyncRepository } from "../../../../../src/server/syncRepository";
import {
  noStoreJsonHeaders,
  type SyncApiError,
} from "../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 16_000;

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
        "Cross-origin lesson-session abandonment is blocked.",
        requestId,
      );
    }
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Sign in before abandoning a cloud lesson session.",
        requestId,
      );
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const rateLimit = await consumeMutationRateLimit(
      database,
      userId,
      LESSON_SESSION_ABANDON_MUTATION_POLICY,
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "MUTATION_RATE_LIMITED",
        "Too many lesson sessions were abandoned; retry after the pacing window.",
        requestId,
        true,
        mutationRateLimitHeaders(rateLimit),
      );
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(
        415,
        "JSON_REQUIRED",
        "Lesson-session abandonment API accepts application/json only.",
        requestId,
      );
    }
    const body = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
    if (!body.ok) {
      return errorResponse(
        413,
        "LESSON_SESSION_ABANDONMENT_TOO_LARGE",
        "Lesson-session abandonment exceeds the size limit.",
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
        "Lesson-session abandonment JSON is invalid.",
        requestId,
      );
    }
    const parsed = parseAbandonLessonSessionCommand(input);
    if (!parsed.ok) {
      return errorResponse(
        422,
        "INVALID_LESSON_SESSION_ABANDONMENT",
        parsed.reason,
        requestId,
      );
    }

    const receipt: AbandonLessonSessionReceiptV1 =
      await new LessonSessionAbandonmentRepository(database).abandon(
        userId,
        parsed.command,
      );
    return json(receipt, receipt.duplicate ? 200 : 201, {
      "x-request-id": requestId,
      ...mutationRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    if (error instanceof MutationRateLimitBackendError) {
      return errorResponse(
        503,
        error.code,
        "Unable to verify the persistent lesson-abandonment pacing limit.",
        requestId,
        true,
      );
    }
    if (error instanceof LearningResetEpochConflictError) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    if (
      error instanceof LessonSessionAbandonmentIdempotencyConflictError
      || error instanceof LessonSessionAbandonmentDeviceSequenceConflictError
      || error instanceof LessonSessionAbandonmentUnavailableError
    ) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "lesson_session_abandon_failed",
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "LESSON_SESSION_ABANDONMENT_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Unable to abandon the lesson session; keep the command for retry.",
      requestId,
      true,
    );
  }
}
