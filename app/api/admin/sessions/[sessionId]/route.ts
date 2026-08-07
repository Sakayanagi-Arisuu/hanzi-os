import { authorizeAdmin, adminError } from "../../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../../src/server/authHttp";
import { requestCorrelationId } from "../../../../../src/server/auditRepository";
import {
  AdminCurrentSessionRevocationError,
  AuthorizationRepository,
  AuthorizationTargetNotFoundError,
} from "../../../../../src/server/authorizationRepository";
import { noStoreJsonHeaders } from "../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  if (!sameOriginMutation(request)) {
    return adminError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  try {
    const authorized = await authorizeAdmin("admin:sessions:revoke", { stepUp: true });
    if (!authorized.ok) return authorized.response;
    const { sessionId } = await context.params;
    await new AuthorizationRepository(authorized.context.database).revokeManagedSession({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      sessionId,
      requestId: requestCorrelationId(request),
    });
    return Response.json({ revoked: true, sessionId }, { headers: noStoreJsonHeaders });
  } catch (error) {
    if (error instanceof AuthorizationTargetNotFoundError) {
      return adminError(404, error.code, "Không tìm thấy phiên.");
    }
    if (error instanceof AdminCurrentSessionRevocationError) {
      return adminError(409, error.code, "Dùng nút đăng xuất để kết thúc phiên quản trị hiện tại.");
    }
    return adminError(500, "ADMIN_SESSION_REVOKE_FAILED", "Không thể thu hồi phiên.");
  }
}
