import { getChatGPTUser } from "../../../../../chatgpt-auth";
import { hasPermission } from "../../../../../../src/auth/authorization";
import {
  AdminRoleSelfRevocationError,
  AuthorizationRepository,
  AuthorizationTargetNotFoundError,
  resolveAuthorizedAccount,
} from "../../../../../../src/server/authorizationRepository";
import { readBoundedRequestText } from "../../../../../../src/server/boundedRequestBody";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 2_048;

const errorJson = (status: number, code: string, message: string) =>
  Response.json(
    { error: { code, message, retryable: status >= 500 } },
    { status, headers: noStoreJsonHeaders },
  );

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return errorJson(403, "CROSS_ORIGIN_BLOCKED", "Yêu cầu khác nguồn đã bị chặn.");
  }
  const identity = await getChatGPTUser();
  if (!identity) {
    return errorJson(401, "AUTH_REQUIRED", "Đăng nhập để thay đổi quyền.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorJson(415, "JSON_REQUIRED", "API phân quyền chỉ nhận application/json.");
  }
  const boundedBody = await readBoundedRequestText(request, MAX_REQUEST_BYTES);
  if (!boundedBody.ok) {
    return errorJson(413, "ROLE_PAYLOAD_TOO_LARGE", "Yêu cầu phân quyền vượt giới hạn.");
  }
  let body: unknown;
  try {
    body = JSON.parse(boundedBody.text);
  } catch {
    return errorJson(400, "INVALID_JSON", "Không thể đọc yêu cầu phân quyền.");
  }
  if (
    !body
    || typeof body !== "object"
    || typeof (body as { admin?: unknown }).admin !== "boolean"
  ) {
    return errorJson(422, "INVALID_ROLE_CHANGE", "Trạng thái quyền quản trị không hợp lệ.");
  }

  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "admin:roles:write")) {
      return errorJson(403, "ADMIN_REQUIRED", "Tài khoản không có quyền phân quyền.");
    }
    const { userId } = await context.params;
    const authorization = await new AuthorizationRepository(database).setAdminRole(
      account.userId,
      userId,
      (body as { admin: boolean }).admin,
    );
    return Response.json(
      { userId, authorization },
      { headers: noStoreJsonHeaders },
    );
  } catch (error) {
    if (error instanceof AdminRoleSelfRevocationError) {
      return errorJson(409, error.code, "Không thể tự thu quyền quản trị của tài khoản đang dùng.");
    }
    if (error instanceof AuthorizationTargetNotFoundError) {
      return errorJson(404, error.code, "Không tìm thấy tài khoản cần phân quyền.");
    }
    const unavailable = error instanceof SyncBackendUnavailableError;
    return errorJson(
      unavailable ? 503 : 500,
      unavailable ? error.code : "ROLE_UPDATE_FAILED",
      unavailable ? error.message : "Không thể cập nhật quyền lúc này.",
    );
  }
}
