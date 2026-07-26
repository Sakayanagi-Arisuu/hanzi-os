export type OperationalLogEvent = "operational_readiness_failed";

export type OperationalFailureClass =
  | "backend-unavailable"
  | "schema-sentinel-missing"
  | "unexpected";

export type OperationalLogInput = {
  event: OperationalLogEvent;
  requestId: string;
  status: 503;
  retryable: true;
  failureClass: OperationalFailureClass;
};

/**
 * Emits a deliberately small allow-listed envelope. Callers cannot attach
 * identities, request bodies, answers, transcripts, object keys, or raw errors.
 */
export function writeOperationalLog(input: OperationalLogInput) {
  console.error(JSON.stringify({
    level: "error",
    event: input.event,
    requestId: input.requestId,
    status: input.status,
    retryable: input.retryable,
    failureClass: input.failureClass,
  }));
}

export const createServerRequestId = () => crypto.randomUUID();
