import { getChatGPTUser } from "../../app/chatgpt-auth";
import { noStoreJsonHeaders, type SyncApiError } from "../sync/protocol";
import { readBoundedRequestText } from "./boundedRequestBody";
import { CourseVersionBindingError } from "./courseVersionRepository";
import { getD1Database, SyncBackendUnavailableError } from "./d1";
import { LearningResetEpochConflictError } from "./learningResetEpoch";
import {
  consumeMutationRateLimit,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
  type MutationRateLimitPolicy,
} from "./mutationRateLimit";
import {
  ReaderAttemptConflictError,
  ReaderContentUnavailableError,
  ReaderDeviceSequenceConflictError,
  ReaderEnrollmentUnavailableError,
  ReaderFormUnavailableError,
  ReaderIdempotencyConflictError,
  ReaderRepository,
  ReaderSessionUnavailableError,
  ReaderSubmissionIncompleteError,
} from "./readerRepository";
import { SyncRepository } from "./syncRepository";

const MAX_READER_REQUEST_BYTES = 16_000;

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

type ReaderParseResult<T> =
  | { ok: true; command: T }
  | { ok: false; reason: string };

export type ReaderMutationRouteConfig<TCommand, TReceipt> = {
  operationName: string;
  authMessage: string;
  invalidCode: string;
  payloadTooLargeCode: string;
  policy: MutationRateLimitPolicy;
  parse: (input: unknown) => ReaderParseResult<TCommand>;
  execute: (
    repository: ReaderRepository,
    userId: string,
    command: TCommand,
  ) => Promise<TReceipt & { duplicate: boolean }>;
};

const knownConflict = (error: unknown) =>
  error instanceof ReaderIdempotencyConflictError
  || error instanceof ReaderDeviceSequenceConflictError
  || error instanceof ReaderContentUnavailableError
  || error instanceof ReaderEnrollmentUnavailableError
  || error instanceof ReaderFormUnavailableError
  || error instanceof ReaderSessionUnavailableError
  || error instanceof ReaderAttemptConflictError
  || error instanceof ReaderSubmissionIncompleteError;

export const handleReaderMutation = async <TCommand, TReceipt>(
  request: Request,
  config: ReaderMutationRouteConfig<TCommand, TReceipt>,
) => {
  const requestId = requestIdentifier(request);
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return errorResponse(
        403,
        "CROSS_ORIGIN_BLOCKED",
        "Cross-origin Reader writes are blocked.",
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
        "Reader command rate limit reached; retry after the pacing window.",
        requestId,
        true,
        mutationRateLimitHeaders(rateLimit),
      );
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith(
      "application/json",
    )) {
      return errorResponse(
        415,
        "JSON_REQUIRED",
        "Reader APIs accept application/json only.",
        requestId,
      );
    }
    const body = await readBoundedRequestText(
      request,
      MAX_READER_REQUEST_BYTES,
    );
    if (!body.ok) {
      return errorResponse(
        413,
        config.payloadTooLargeCode,
        "Reader command exceeds the size limit.",
        requestId,
      );
    }
    let input: unknown;
    try {
      input = JSON.parse(body.text);
    } catch {
      return errorResponse(
        400,
        "INVALID_JSON",
        "Reader command JSON is invalid.",
        requestId,
      );
    }
    const parsed = config.parse(input);
    if (!parsed.ok) {
      return errorResponse(422, config.invalidCode, parsed.reason, requestId);
    }
    const receipt = await config.execute(
      new ReaderRepository(database),
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
        "Unable to verify the persistent Reader pacing limit.",
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
      event: "reader_mutation_failed",
      operation: config.operationName,
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "READER_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Unable to commit the Reader command; keep it in the client outbox.",
      requestId,
      true,
    );
  }
};
