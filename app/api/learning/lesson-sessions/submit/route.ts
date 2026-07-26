import { getChatGPTUser } from "../../../../chatgpt-auth";
import {
  parseSubmitLessonSessionCommand,
  type SubmitLessonSessionReceiptV1,
} from "../../../../../src/learning/lessonSessionSubmissionProtocol";
import { CourseVersionBindingError } from "../../../../../src/server/courseVersionRepository";
import { readBoundedRequestText } from "../../../../../src/server/boundedRequestBody";
import { LearningResetEpochConflictError } from "../../../../../src/server/learningResetEpoch";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../../src/server/d1";
import {
  LessonSessionSubmissionDeviceSequenceConflictError,
  LessonSessionSubmissionEvidenceConflictError,
  LessonSessionSubmissionIdempotencyConflictError,
  LessonSessionSubmissionIncompleteError,
  LessonSessionSubmissionRepository,
  LessonSessionSubmissionUnavailableError,
} from "../../../../../src/server/lessonSessionSubmissionRepository";
import { SyncRepository } from "../../../../../src/server/syncRepository";
import {
  consumeMutationRateLimit,
  LESSON_SESSION_SUBMIT_MUTATION_POLICY,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
} from "../../../../../src/server/mutationRateLimit";
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
        "Cross-origin lesson-session submissions are blocked.",
        requestId,
      );
    }
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Sign in before submitting a cloud lesson session.",
        requestId,
      );
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const rateLimit = await consumeMutationRateLimit(
      database,
      userId,
      LESSON_SESSION_SUBMIT_MUTATION_POLICY,
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "MUTATION_RATE_LIMITED",
        "Too many lesson submissions were sent; retry after the pacing window.",
        requestId,
        true,
        mutationRateLimitHeaders(rateLimit),
      );
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(
        415,
        "JSON_REQUIRED",
        "Lesson-session submission API accepts application/json only.",
        requestId,
      );
    }
    const body = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
    if (!body.ok) {
      return errorResponse(
        413,
        "LESSON_SESSION_SUBMISSION_TOO_LARGE",
        "Lesson-session submission exceeds the size limit.",
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
        "Lesson-session submission JSON is invalid.",
        requestId,
      );
    }
    const parsed = parseSubmitLessonSessionCommand(input);
    if (!parsed.ok) {
      return errorResponse(
        422,
        "INVALID_LESSON_SESSION_SUBMISSION",
        parsed.reason,
        requestId,
      );
    }

    const receipt: SubmitLessonSessionReceiptV1 =
      await new LessonSessionSubmissionRepository(database).submit(
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
        "Unable to verify the persistent lesson-submission pacing limit.",
        requestId,
        true,
      );
    }
    if (error instanceof LearningResetEpochConflictError) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    if (error instanceof CourseVersionBindingError) {
      return errorResponse(
        503,
        error.code,
        "Cloud content does not match the immutable current package.",
        requestId,
        true,
      );
    }
    if (
      error instanceof LessonSessionSubmissionIdempotencyConflictError
      || error instanceof LessonSessionSubmissionDeviceSequenceConflictError
      || error instanceof LessonSessionSubmissionUnavailableError
      || error instanceof LessonSessionSubmissionIncompleteError
      || error instanceof LessonSessionSubmissionEvidenceConflictError
    ) {
      return errorResponse(409, error.code, error.message, requestId);
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "lesson_session_submit_failed",
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "LESSON_SESSION_SUBMISSION_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Unable to submit the lesson session; keep the command in the client outbox.",
      requestId,
      true,
    );
  }
}
