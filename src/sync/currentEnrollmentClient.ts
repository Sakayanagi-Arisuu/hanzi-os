import {
  CURRENT_ENROLLMENT_PROTOCOL_VERSION,
  parseCurrentEnrollmentReceipt,
  type CurrentEnrollmentReceiptV1,
} from "../learning/currentEnrollmentProtocol";

export const CURRENT_ENROLLMENT_ENDPOINT =
  "/api/learning/enrollment" as const;

export type ActivateCurrentEnrollmentInput = {
  fetch?: typeof fetch;
  origin?: string;
  signal?: AbortSignal;
  now?: () => Date;
};

export type ActivateCurrentEnrollmentResult =
  | {
      state: "activated";
      receipt: CurrentEnrollmentReceiptV1;
    }
  | {
      state: "permanent-unavailable";
      status: number;
      reason:
        | "authentication-required"
        | "content-unavailable"
        | "profile-unavailable"
        | "request-rejected";
    }
  | {
      state: "retryable";
      status: number | null;
      reason:
        | "network-unavailable"
        | "rate-limited"
        | "server-unavailable"
        | "invalid-response";
      retryAfterMs: number;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const serverErrorCode = async (response: Response) => {
  let value: unknown;
  try {
    value = await response.json() as unknown;
  } catch {
    return null;
  }
  return isRecord(value)
    && isRecord(value.error)
    && typeof value.error.code === "string"
    ? value.error.code
    : null;
};

const retryAfterMs = (value: string | null, nowMs: number) => {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(24 * 60 * 60_000, Math.ceil(seconds * 1_000));
  }
  const retryAt = new Date(value).getTime();
  return Number.isNaN(retryAt)
    ? 0
    : Math.min(24 * 60 * 60_000, Math.max(0, retryAt - nowMs));
};

const retryable = (
  status: number | null,
  reason: Extract<
    ActivateCurrentEnrollmentResult,
    { state: "retryable" }
  >["reason"],
  delay = 0,
): ActivateCurrentEnrollmentResult => ({
  state: "retryable",
  status,
  reason,
  retryAfterMs: delay,
});

/**
 * Activates only the server-owned current enrollment. Callers cannot provide a
 * URL, course, content version, goal, release state, or enrollment identifier.
 */
export async function activateCurrentEnrollment(
  input: ActivateCurrentEnrollmentInput = {},
): Promise<ActivateCurrentEnrollmentResult> {
  const currentOrigin = input.origin
    ?? (typeof location === "undefined" ? null : location.origin);
  if (!currentOrigin) {
    throw new Error("Current origin is required for enrollment activation.");
  }
  const origin = new URL(currentOrigin).origin;
  const endpoint = new URL(CURRENT_ENROLLMENT_ENDPOINT, origin);
  if (
    endpoint.origin !== origin
    || endpoint.pathname !== CURRENT_ENROLLMENT_ENDPOINT
    || endpoint.search
    || endpoint.hash
    || endpoint.username
    || endpoint.password
  ) {
    throw new Error("Enrollment endpoint must remain same-origin.");
  }
  const now = input.now ?? (() => new Date());
  const requestStartedAt = now().getTime();
  if (Number.isNaN(requestStartedAt)) {
    throw new Error("Enrollment client clock is invalid.");
  }

  let response: Response;
  try {
    response = await (input.fetch ?? fetch)(CURRENT_ENROLLMENT_ENDPOINT, {
      method: "POST",
      credentials: "same-origin",
      redirect: "error",
      cache: "no-store",
      signal: input.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocolVersion: CURRENT_ENROLLMENT_PROTOCOL_VERSION,
      }),
    });
  } catch {
    return retryable(null, "network-unavailable");
  }

  if (response.status === 401) {
    return {
      state: "permanent-unavailable",
      status: response.status,
      reason: "authentication-required",
    };
  }
  if (response.status === 409) {
    const code = await serverErrorCode(response);
    const reason = code === "CURRENT_ENROLLMENT_CONTENT_UNAVAILABLE"
      ? "content-unavailable"
      : code === "CURRENT_ENROLLMENT_PROFILE_UNAVAILABLE"
        ? "profile-unavailable"
        : "request-rejected";
    return {
      state: "permanent-unavailable",
      status: response.status,
      reason,
    };
  }
  if (response.status === 429) {
    return retryable(
      response.status,
      "rate-limited",
      retryAfterMs(response.headers.get("Retry-After"), requestStartedAt),
    );
  }
  if (response.status >= 500 && response.status <= 599) {
    return retryable(response.status, "server-unavailable");
  }
  if (response.status !== 200) {
    return response.status >= 400 && response.status <= 499
      ? {
          state: "permanent-unavailable",
          status: response.status,
          reason: "request-rejected",
        }
      : retryable(response.status, "invalid-response");
  }

  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    return retryable(response.status, "invalid-response");
  }
  const receipt = parseCurrentEnrollmentReceipt(body);
  return receipt
    ? { state: "activated", receipt }
    : retryable(response.status, "invalid-response");
}
