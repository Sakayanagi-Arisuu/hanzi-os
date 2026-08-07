import { authorizeAdmin, adminError } from "../../../../src/server/adminHttp";
import { AuthorizationRepository } from "../../../../src/server/authorizationRepository";
import {
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorized = await authorizeAdmin("admin:users:read");
    if (!authorized.ok) return authorized.response;
    const users = await new AuthorizationRepository(
      authorized.context.database,
    ).listUsers();
    return Response.json(
      { users, requestedBy: authorized.context.account.userId },
      { headers: noStoreJsonHeaders },
    );
  } catch (error) {
    const unavailable = error instanceof SyncBackendUnavailableError;
    return adminError(
      unavailable ? 503 : 500,
      unavailable ? error.code : "ADMIN_USER_LIST_FAILED",
      unavailable ? error.message : "Không thể đọc danh sách tài khoản lúc này.",
    );
  }
}
