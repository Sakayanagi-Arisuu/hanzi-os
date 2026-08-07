import {
  authError,
  clearedSessionResponseHeaders,
  loadAuthRuntime,
  resolveRequestSession,
  sameOriginMutation,
} from "../../../../src/server/authHttp";
import { AuditRepository, requestCorrelationId } from "../../../../src/server/auditRepository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const { database, repository } = await loadAuthRuntime();
    const session = await resolveRequestSession(request, repository);
    if (session) {
      await repository.revokeSession(session.userId, session.sessionId);
      await new AuditRepository(database).appendBestEffort({
        category: "auth",
        action: "auth.session.signed_out",
        outcome: "success",
        actorUserId: session.userId,
        actorSessionId: session.sessionId,
        targetType: "session",
        targetId: session.sessionId,
        requestId: requestCorrelationId(request),
      });
    }
    return Response.json({ signedOut: true }, {
      headers: clearedSessionResponseHeaders(),
    });
  } catch {
    return Response.json({ signedOut: true }, {
      headers: clearedSessionResponseHeaders(),
    });
  }
}
