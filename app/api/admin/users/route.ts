import { getChatGPTUser } from "../../../chatgpt-auth";
import { hasPermission } from "../../../../src/auth/authorization";
import {
  AuthorizationRepository,
  resolveAuthorizedAccount,
} from "../../../../src/server/authorizationRepository";
import {
  getD1Database,
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

const errorJson = (status: number, code: string, message: string) =>
  Response.json(
    { error: { code, message, retryable: status >= 500 } },
    { status, headers: noStoreJsonHeaders },
  );

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) {
    return errorJson(401, "AUTH_REQUIRED", "Đăng nhập để mở Cổng Quản Trị.");
  }
  try {
    const database = await getD1Database();
    const account = await resolveAuthorizedAccount(database, identity);
    if (!hasPermission(account.authorization, "admin:users:read")) {
      return errorJson(403, "ADMIN_REQUIRED", "Tài khoản không có quyền quản trị.");
    }
    const users = await new AuthorizationRepository(database).listUsers();
    return Response.json(
      { users, requestedBy: account.userId },
      { headers: noStoreJsonHeaders },
    );
  } catch (error) {
    const unavailable = error instanceof SyncBackendUnavailableError;
    return errorJson(
      unavailable ? 503 : 500,
      unavailable ? error.code : "ADMIN_USER_LIST_FAILED",
      unavailable ? error.message : "Không thể đọc danh sách tài khoản lúc này.",
    );
  }
}
