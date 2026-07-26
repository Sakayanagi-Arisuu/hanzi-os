import { getChatGPTUser } from "../../../chatgpt-auth";
import {
  parseActivateCurrentEnrollmentCommand,
  type CurrentEnrollmentReceiptV1,
} from "../../../../src/learning/currentEnrollmentProtocol";
import { CourseVersionBindingError } from "../../../../src/server/courseVersionRepository";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import {
  CurrentEnrollmentContentUnavailableError,
  CurrentEnrollmentIntegrityError,
  CurrentEnrollmentProfileUnavailableError,
  CurrentEnrollmentRepository,
} from "../../../../src/server/currentEnrollmentRepository";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import {
  consumeMutationRateLimit,
  CURRENT_ENROLLMENT_ACTIVATE_MUTATION_POLICY,
  mutationRateLimitHeaders,
  MutationRateLimitBackendError,
} from "../../../../src/server/mutationRateLimit";
import { SyncRepository } from "../../../../src/server/syncRepository";
import {
  noStoreJsonHeaders,
  type SyncApiError,
} from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 1_000;

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
        "Cross-origin enrollment writes are blocked.",
        requestId,
      );
    }
    const identity = await getChatGPTUser();
    if (!identity) {
      return errorResponse(
        401,
        "AUTH_REQUIRED",
        "Sign in before activating a cloud learning enrollment.",
        requestId,
      );
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const rateLimit = await consumeMutationRateLimit(
      database,
      userId,
      CURRENT_ENROLLMENT_ACTIVATE_MUTATION_POLICY,
    );
    if (!rateLimit.allowed) {
      return errorResponse(
        429,
        "MUTATION_RATE_LIMITED",
        "Too many enrollment activations were requested; retry after the pacing window.",
        requestId,
        true,
        mutationRateLimitHeaders(rateLimit),
      );
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return errorResponse(
        415,
        "JSON_REQUIRED",
        "Enrollment API accepts application/json only.",
        requestId,
      );
    }
    const body = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
    if (!body.ok) {
      return errorResponse(
        413,
        "CURRENT_ENROLLMENT_PAYLOAD_TOO_LARGE",
        "Enrollment command exceeds the size limit.",
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
        "Enrollment JSON is invalid.",
        requestId,
      );
    }
    const parsed = parseActivateCurrentEnrollmentCommand(input);
    if (!parsed.ok) {
      return errorResponse(
        422,
        "INVALID_CURRENT_ENROLLMENT_COMMAND",
        parsed.reason,
        requestId,
      );
    }

    const receipt: CurrentEnrollmentReceiptV1 =
      await new CurrentEnrollmentRepository(database).activate(userId);
    return json(receipt, 200, {
      "x-request-id": requestId,
      ...mutationRateLimitHeaders(rateLimit),
    });
  } catch (error) {
    if (error instanceof MutationRateLimitBackendError) {
      return errorResponse(
        503,
        error.code,
        "Unable to verify the persistent enrollment pacing limit.",
        requestId,
        true,
      );
    }
    if (
      error instanceof CurrentEnrollmentContentUnavailableError
      || error instanceof CurrentEnrollmentProfileUnavailableError
    ) {
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
    if (error instanceof CurrentEnrollmentIntegrityError) {
      console.error(JSON.stringify({
        level: "error",
        event: "current_enrollment_integrity_failed",
        requestId,
        errorName: error.name,
      }));
      return errorResponse(
        503,
        error.code,
        "Unable to establish one safe current enrollment.",
        requestId,
        true,
      );
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    console.error(JSON.stringify({
      level: "error",
      event: "current_enrollment_failed",
      requestId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    }));
    return errorResponse(
      unavailable ? 503 : 500,
      unavailable ? error.code : "CURRENT_ENROLLMENT_INTERNAL_ERROR",
      unavailable
        ? error.message
        : "Unable to activate the current enrollment.",
      requestId,
      true,
    );
  }
}
