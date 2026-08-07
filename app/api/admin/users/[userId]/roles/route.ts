import { authorizeAdmin, adminError } from "../../../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../../../src/server/authHttp";
import {
  AdminRoleSelfRevocationError,
  AuthorizationConcurrencyError,
  AuthorizationRepository,
  AuthorizationTargetNotFoundError,
  LastAdminProtectionError,
} from "../../../../../../src/server/authorizationRepository";
import { requestCorrelationId } from "../../../../../../src/server/auditRepository";
import { readBoundedRequestText } from "../../../../../../src/server/boundedRequestBody";
import { SyncBackendUnavailableError } from "../../../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 2_048;

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  if (!sameOriginMutation(request)) {
    return adminError(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return adminError(415, "JSON_REQUIRED", "API phân quyền chỉ nhận application/json.");
  }
  const boundedBody = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
  if (!boundedBody.ok) {
    return adminError(413, "ROLE_PAYLOAD_TOO_LARGE", "Yêu cầu phân quyền vượt giới hạn.");
  }
  let body: unknown;
  try {
    body = JSON.parse(boundedBody.text);
  } catch {
    return adminError(400, "INVALID_JSON", "Không thể đọc yêu cầu phân quyền.");
  }
  if (
    !body
    || typeof body !== "object"
    || !new Set(["content_editor", "admin"]).has(
      String((body as { role?: unknown }).role),
    )
    || typeof (body as { enabled?: unknown }).enabled !== "boolean"
    || !Number.isInteger((body as { expectedRevision?: unknown }).expectedRevision)
  ) {
    return adminError(422, "INVALID_ROLE_CHANGE", "Yêu cầu phân quyền không hợp lệ.");
  }

  try {
    const authorized = await authorizeAdmin("admin:roles:write", { stepUp: true });
    if (!authorized.ok) return authorized.response;
    const { userId } = await context.params;
    const input = body as {
      role: "content_editor" | "admin";
      enabled: boolean;
      expectedRevision: number;
    };
    const result = await new AuthorizationRepository(
      authorized.context.database,
    ).setRole({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId as string,
      targetUserId: userId,
      role: input.role,
      enabled: input.enabled,
      expectedRevision: input.expectedRevision,
      requestId: requestCorrelationId(request),
    });
    return Response.json(
      { userId, ...result },
      { headers: noStoreJsonHeaders },
    );
  } catch (error) {
    if (error instanceof AdminRoleSelfRevocationError) {
      return adminError(409, error.code, "Không thể tự thu quyền quản trị của tài khoản đang dùng.");
    }
    if (error instanceof AuthorizationTargetNotFoundError) {
      return adminError(404, error.code, "Không tìm thấy tài khoản cần phân quyền.");
    }
    if (error instanceof AuthorizationConcurrencyError) {
      return adminError(409, error.code, "Tài khoản vừa được cập nhật ở phiên quản trị khác.");
    }
    if (error instanceof LastAdminProtectionError) {
      return adminError(409, error.code, "Không thể thu quyền quản trị viên hoạt động cuối cùng.");
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    return adminError(
      unavailable ? 503 : 500,
      unavailable ? error.code : "ROLE_UPDATE_FAILED",
      unavailable ? error.message : "Không thể cập nhật quyền lúc này.",
    );
  }
}
