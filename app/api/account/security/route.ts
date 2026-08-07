import {
  AUTH_JSON_HEADERS,
  authError,
  clearedSessionResponseHeaders,
  loadAuthRuntime,
  resolveCurrentAccount,
  resolveRequestSession,
  sameOriginMutation,
} from "../../../../src/server/authHttp";
import { AuditRepository, requestCorrelationId } from "../../../../src/server/auditRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { database, repository } = await loadAuthRuntime();
    const account = await resolveCurrentAccount(database);
    if (!account) return authError(401, "AUTH_REQUIRED", "Hãy đăng nhập để xem bảo mật.");
    const currentSession = await resolveRequestSession(request, repository);
    const [identities, sessions] = await Promise.all([
      repository.listIdentities(account.userId),
      repository.listSessions(account.userId, currentSession?.sessionId ?? null),
    ]);
    return Response.json({
      account: {
        displayName: account.identity.displayName,
        email: account.identity.email,
      },
      identities,
      sessions,
    }, { headers: AUTH_JSON_HEADERS });
  } catch {
    return authError(503, "ACCOUNT_SECURITY_UNAVAILABLE", "Chưa thể tải bảo mật tài khoản.");
  }
}
export async function DELETE(request: Request) {
  if (!sameOriginMutation(request)) {
    return authError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const body: unknown = await request.json();
    const sessionId = body && typeof body === "object"
      ? (body as { sessionId?: unknown }).sessionId
      : null;
    if (typeof sessionId !== "string" || sessionId.length > 128) {
      return authError(422, "SESSION_INVALID", "Phiên cần thu hồi không hợp lệ.");
    }
    const { database, repository } = await loadAuthRuntime();
    const account = await resolveCurrentAccount(database);
    if (!account) return authError(401, "AUTH_REQUIRED", "Hãy đăng nhập lại.");
    const currentSession = await resolveRequestSession(request, repository);
    const revoked = await repository.revokeSession(account.userId, sessionId);
    if (revoked) {
      await new AuditRepository(database).appendBestEffort({
        category: "auth",
        action: "auth.session.revoked",
        outcome: "success",
        actorUserId: account.userId,
        actorSessionId: currentSession?.sessionId ?? null,
        targetType: "session",
        targetId: sessionId,
        requestId: requestCorrelationId(request),
      });
    }
    return Response.json({ revoked }, {
      headers: currentSession?.sessionId === sessionId
        ? clearedSessionResponseHeaders()
        : AUTH_JSON_HEADERS,
    });
  } catch {
    return authError(503, "SESSION_REVOKE_FAILED", "Chưa thể thu hồi phiên lúc này.");
  }
}
