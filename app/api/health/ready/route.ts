import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import { operationalDatabaseIsReady } from "../../../../src/server/operationalHealth";
import {
  createServerRequestId,
  type OperationalFailureClass,
  writeOperationalLog,
} from "../../../../src/server/structuredLogger";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const responseHeaders = (requestId: string) => ({
  ...noStoreJsonHeaders,
  "x-request-id": requestId,
  "x-robots-tag": "noindex, nofollow",
});

const readyResponse = (requestId: string, head: boolean) => head
  ? new Response(null, {
      status: 200,
      headers: responseHeaders(requestId),
    })
  : Response.json({ status: "ready" }, {
      status: 200,
      headers: responseHeaders(requestId),
    });

const unavailableResponse = (requestId: string, head: boolean) => head
  ? new Response(null, {
      status: 503,
      headers: responseHeaders(requestId),
    })
  : Response.json({ status: "unavailable" }, {
      status: 503,
      headers: responseHeaders(requestId),
    });

const readinessResponse = async (head: boolean) => {
  const requestId = createServerRequestId();
  try {
    const database = await getD1Database();
    if (!await operationalDatabaseIsReady(database)) {
      writeOperationalLog({
        event: "operational_readiness_failed",
        requestId,
        status: 503,
        retryable: true,
        failureClass: "schema-sentinel-missing",
      });
      return unavailableResponse(requestId, head);
    }
    return readyResponse(requestId, head);
  } catch (error) {
    const failureClass: OperationalFailureClass =
      error instanceof SyncBackendUnavailableError
        ? "backend-unavailable"
        : "unexpected";
    writeOperationalLog({
      event: "operational_readiness_failed",
      requestId,
      status: 503,
      retryable: true,
      failureClass,
    });
    return unavailableResponse(requestId, head);
  }
};

/**
 * Runtime + D1 schema readiness only. This is not content, identity, security,
 * calibration, recovery, or deployment approval.
 */
export async function GET() {
  return readinessResponse(false);
}

export async function HEAD() {
  return readinessResponse(true);
}
