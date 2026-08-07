import {
  authError,
  clearedSessionResponseHeaders,
  loadAuthRuntime,
  resolveRequestSession,
  sameOriginMutation,
} from "../../../../src/server/authHttp";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const { repository } = await loadAuthRuntime();
    const session = await resolveRequestSession(request, repository);
    if (session) await repository.revokeSession(session.userId, session.sessionId);
    return Response.json({ signedOut: true }, {
      headers: clearedSessionResponseHeaders(),
    });
  } catch {
    return Response.json({ signedOut: true }, {
      headers: clearedSessionResponseHeaders(),
    });
  }
}
