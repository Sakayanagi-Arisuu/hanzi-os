import {
  createServerRequestId,
} from "../../../../src/server/structuredLogger";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const responseHeaders = (requestId: string) => ({
  ...noStoreJsonHeaders,
  "x-request-id": requestId,
  "x-robots-tag": "noindex, nofollow",
});

const liveResponse = (head: boolean) => {
  const requestId = createServerRequestId();
  return head
    ? new Response(null, {
        status: 200,
        headers: responseHeaders(requestId),
      })
    : Response.json({ status: "live" }, {
        status: 200,
        headers: responseHeaders(requestId),
      });
};

/** Process liveness only; this route does not touch D1 or release gates. */
export async function GET() {
  return liveResponse(false);
}

export async function HEAD() {
  return liveResponse(true);
}
