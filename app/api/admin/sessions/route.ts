import { authorizeAdmin, adminError } from "../../../../src/server/adminHttp";
import { AuthorizationRepository } from "../../../../src/server/authorizationRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(request = new Request("http://localhost/api/admin/sessions")) {
  try {
    const authorized = await authorizeAdmin("admin:sessions:read");
    if (!authorized.ok) return authorized.response;
    const params = new URL(request.url).searchParams;
    const status = params.get("status");
    const limit = Math.max(1, Math.min(50, Number.parseInt(params.get("limit") ?? "25", 10) || 25));
    const offset = Math.max(0, Math.min(10_000, Number.parseInt(params.get("offset") ?? "0", 10) || 0));
    const page = await new AuthorizationRepository(
      authorized.context.database,
    ).listSessionPage({
      limit,
      offset,
      query: params.get("q")?.trim().slice(0, 120) ?? "",
      status: status === "active" || status === "revoked" ? status : "all",
    });
    return Response.json({ ...page, limit, offset }, { headers: noStoreJsonHeaders });
  } catch {
    return adminError(500, "ADMIN_SESSION_LIST_FAILED", "Không thể đọc danh sách phiên.");
  }
}
