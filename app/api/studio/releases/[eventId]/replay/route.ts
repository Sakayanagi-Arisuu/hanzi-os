import { sameOriginMutation } from "../../../../../../src/server/authHttp";
import { requestCorrelationId } from "../../../../../../src/server/auditRepository";
import {
  authorizeStudio,
  studioError,
} from "../../../../../../src/server/contentStudioHttp";
import {
  ContentReleaseFenceError,
  ContentReleaseWorkerRepository,
} from "../../../../../../src/server/contentReleaseWorker";
import { noStoreJsonHeaders } from "../../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  if (!sameOriginMutation(request)) {
    return studioError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const authorized = await authorizeStudio("content:publish", { stepUp: true });
    if (!authorized.ok) return authorized.response;
    const { eventId } = await params;
    if (!eventId || eventId.length > 255 || eventId.includes("\0")) {
      return studioError(422, "CONTENT_RELEASE_REPLAY_INVALID", "Release event không hợp lệ.");
    }
    const correlationId = requestCorrelationId(request);
    const replayEventId = await new ContentReleaseWorkerRepository(
      authorized.context.database,
    ).replayDeadRelease({
      eventId,
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      correlationId,
    });
    return Response.json(
      { replayEventId, correlationId, delivery: "at-least-once" },
      { status: 202, headers: noStoreJsonHeaders },
    );
  } catch (error) {
    if (error instanceof ContentReleaseFenceError) {
      return studioError(409, error.failureCode, error.message);
    }
    return studioError(500, "CONTENT_RELEASE_REPLAY_FAILED", "Chưa thể replay release event.");
  }
}
