import { getAuthenticatedUser, type ChatGPTUser } from "../../app/chatgpt-auth";
import { hasPermission, type AppPermission } from "../auth/authorization";
import { noStoreJsonHeaders } from "../sync/protocol";
import { recentFirstPartySession } from "./authHttp";
import {
  resolveAuthorizedAccount,
  type AuthorizedAccount,
} from "./authorizationRepository";
import { getD1Database, type D1Database } from "./d1";

export const adminError = (status: number, code: string, message: string) =>
  Response.json(
    { error: { code, message, retryable: status >= 500 } },
    { status, headers: noStoreJsonHeaders },
  );

type AdminContext = {
  database: D1Database;
  identity: ChatGPTUser;
  account: AuthorizedAccount;
  sessionId: string | null;
};

export async function authorizeAdmin(
  permission: AppPermission,
  options: { stepUp?: boolean } = {},
): Promise<{ ok: true; context: AdminContext } | { ok: false; response: Response }> {
  const identity = await getAuthenticatedUser();
  if (!identity) {
    return {
      ok: false,
      response: adminError(401, "AUTH_REQUIRED", "Đăng nhập để mở Cổng Quản Trị."),
    };
  }
  const database = await getD1Database();
  const account = await resolveAuthorizedAccount(database, identity);
  if (!hasPermission(account.authorization, permission)) {
    return {
      ok: false,
      response: adminError(403, "ADMIN_REQUIRED", "Tài khoản không có quyền cho thao tác này."),
    };
  }
  const recentSession = recentFirstPartySession(identity);
  if (options.stepUp && !recentSession) {
    return {
      ok: false,
      response: adminError(
        428,
        "STEP_UP_REQUIRED",
        "Hãy xác minh lại bằng Google, email hoặc passkey trước thao tác nhạy cảm.",
      ),
    };
  }
  return {
    ok: true,
    context: {
      database,
      identity,
      account,
      sessionId: recentSession?.sessionId ?? null,
    },
  };
}
