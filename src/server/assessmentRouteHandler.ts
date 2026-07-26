import { getChatGPTUser } from "../../app/chatgpt-auth";
import type { MutationRateLimitPolicy } from "./mutationRateLimit";
import {
  consumeMutationRateLimit,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
} from "./mutationRateLimit";
import { CourseVersionBindingError } from "./courseVersionRepository";
import { getD1Database, SyncBackendUnavailableError } from "./d1";
import { readBoundedRequestText } from "./boundedRequestBody";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import {
  AssessmentAttemptConflictError,
  AssessmentContentUnavailableError,
  AssessmentDeviceSequenceConflictError,
  AssessmentEnrollmentUnavailableError,
  AssessmentFormUnavailableError,
  AssessmentIdempotencyConflictError,
  AssessmentRepository,
  AssessmentSessionUnavailableError,
  AssessmentSubmissionIncompleteError,
} from "./assessmentRepository";
import { SyncRepository } from "./syncRepository";
import { noStoreJsonHeaders, type SyncApiError } from "../sync/protocol";

const MAX_ASSESSMENT_REQUEST_BYTES = 16_000;

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

type AssessmentParseResult<T> =
  | { ok: true; command: T }
  | { ok: false; reason: string };

export type AssessmentMutationRouteConfig<TCommand, TReceipt> = {
  operationName: string;
  authMessage: string;
  invalidCode: string;
  payloadTooLargeCode: string;
  policy: MutationRateLimitPolicy;
  parse: (input: unknown) => AssessmentParseResult<TCommand>;
  execute: (
    repository: AssessmentRepository,
    userId: string,
    command: TCommand,
  ) => Promise<TReceipt & { duplicate: boolean }>;
};

const knownConflict = (error: unknown) =>
  error instanceof AssessmentIdempotencyConflictError
  || error instanceof AssessmentDeviceSequenceConflictError
  || error instanceof AssessmentContentUnavailableError
  || error instanceof AssessmentEnrollmentUnavailableError
  || error instanceof AssessmentFormUnavailableError
  || error instanceof AssessmentSessionUnavailableError
  || error instanceof AssessmentAttemptConflictError
  || error instanceof AssessmentSubmissionIncompleteError;

export const handleAssessmentMutation = async <TCommand, TReceipt>(
  request: Request,
  config: AssessmentMutationRouteConfig<TCommand, TReceipt>,
) => {
  const requestId = requestIdentifier(request);
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return errorResponse(
        403,
        "CROSS_ORIGIN_BLOCKED",
        "Cross-origin assessment writes are blocked.",
        requestId,
      );
    }
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(401, "AUTH_REQUIRED", config.authMessage, requestId);
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const rateLimit = await consumeMutationRateLimit(
      database,
      userId,
      config.policy,
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "MUTATION_RATE_LIMITED",
        "Assessment command rate limit reached; retry after the pacing window.",
        requestId,
        true,
        mutationRateLimitHeaders(rateLimit),
      );
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(
        415,
        "JSON_REQUIRED",
        "Assessment APIs accept application/json only.",
        requestId,
      );
    }
    const body = await readBoundedRequestText(
      request,
      MAX_ASSESSMENT_REQUEST_BYTES,
    );
    if (!body.ok) {
      return errorResponse(
        413,
        config.payloadTooLargeCode,
        "Assessment command exceeds the size limit.",
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
        "Assessment command JSON is invalid.",
        requestId,
      );
    }
    const parsed = config.parse(input);
    if (!parsed.ok) {
      return errorResponse(422, config.invalidCode, parsed.reason, requestId);
    }
    const receipt = await config.execute(
      new AssessmentRepository(database),
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
        "Unable to verify the persistent assessment pacing limit.",
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
    if (knownConflict(error)) {
      const conflict = error as Error & { code: string };
      return errorResponse(409, conflict.code, conflict.message, requestId);
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "assessment_mutation_failed",
      operation: config.operationName,
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "ASSESSMENT_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Unable to commit the assessment command; keep it in the client outbox.",
      requestId,
      true,
    );
  }
};
