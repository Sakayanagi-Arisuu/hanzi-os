import { authorizeAdmin, adminError } from "../../../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../../../src/server/authHttp";
import { requestCorrelationId } from "../../../../../../src/server/auditRepository";
import {
  AdminSelfLockError,
  AuthorizationConcurrencyError,
  AuthorizationRepository,
  AuthorizationTargetNotFoundError,
  LastAdminProtectionError,
} from "../../../../../../src/server/authorizationRepository";
import { readBoundedRequestText } from "../../../../../../src/server/boundedRequestBody";
import { noStoreJsonHeaders } from "../../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  if (!sameOriginMutation(request)) {
    return adminError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return adminError(415, "JSON_REQUIRED", "API trạng thái chỉ nhận application/json.");
  }
  const bounded = await readBoundedRequestText(request, 2_048);
  if (!bounded.ok) return adminError(413, "STATUS_PAYLOAD_TOO_LARGE", "Yêu cầu quá lớn.");
  let body: unknown;
  try {
    body = JSON.parse(bounded.text);
  } catch {
    return adminError(400, "INVALID_JSON", "Không thể đọc yêu cầu trạng thái.");
  }
  const input = body as {
    locked?: unknown;
    reason?: unknown;
    expectedRevision?: unknown;
  };
  if (
    !body
    || typeof body !== "object"
    || typeof input.locked !== "boolean"
    || typeof input.reason !== "string"
    || typeof input.expectedRevision !== "number"
    || !Number.isInteger(input.expectedRevision)
  ) {
    return adminError(422, "INVALID_STATUS_CHANGE", "Yêu cầu khóa tài khoản không hợp lệ.");
  }
  try {
    const authorized = await authorizeAdmin("admin:users:lock", { stepUp: true });
    if (!authorized.ok) return authorized.response;
    const { userId } = await context.params;
    const result = await new AuthorizationRepository(
      authorized.context.database,
    ).setAccountLocked({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      targetUserId: userId,
      locked: input.locked,
      reason: input.reason,
      expectedRevision: input.expectedRevision,
      requestId: requestCorrelationId(request),
    });
    return Response.json({ userId, ...result }, { headers: noStoreJsonHeaders });
  } catch (error) {
    if (error instanceof AuthorizationTargetNotFoundError) {
      return adminError(404, error.code, "Không tìm thấy tài khoản.");
    }
    if (error instanceof AuthorizationConcurrencyError) {
      return adminError(409, error.code, "Tài khoản đã đổi ở phiên quản trị khác.");
    }
    if (error instanceof AdminSelfLockError || error instanceof LastAdminProtectionError) {
      return adminError(409, error.code, "Không thể khóa tài khoản quản trị đang dùng hoặc quản trị viên cuối cùng.");
    }
    return adminError(500, "ACCOUNT_STATUS_UPDATE_FAILED", "Không thể đổi trạng thái tài khoản.");
  }
}
