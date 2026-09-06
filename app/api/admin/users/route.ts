import { authorizeAdmin, adminError } from "../../../../src/server/adminHttp";
import { AuthorizationRepository } from "../../../../src/server/authorizationRepository";
import {
  SyncBackendUnavailableError,
} from "../../../../src/server/d1";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(request = new Request("http://localhost/api/admin/users")) {
  try {
    const authorized = await authorizeAdmin("admin:users:read");
    if (!authorized.ok) return authorized.response;
    const params = new URL(request.url).searchParams;
    const role = params.get("role");
    const status = params.get("status");
    const limit = Math.max(1, Math.min(50, Number.parseInt(params.get("limit") ?? "25", 10) || 25));
    const offset = Math.max(0, Math.min(10_000, Number.parseInt(params.get("offset") ?? "0", 10) || 0));
    const page = await new AuthorizationRepository(
      authorized.context.database,
    ).listUserPage({
      limit,
      offset,
      query: params.get("q")?.trim().slice(0, 120) ?? "",
      role: role === "learner_only" || role === "content_editor" || role === "admin" ? role : "all",
      status: status === "active" || status === "locked" ? status : "all",
    });
    return Response.json(
      { ...page, limit, offset, requestedBy: authorized.context.account.userId },
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
