import { authorizeAdmin, adminError } from "../../../../src/server/adminHttp";
import { AuthorizationRepository } from "../../../../src/server/authorizationRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorized = await authorizeAdmin("admin:sessions:read");
    if (!authorized.ok) return authorized.response;
    const sessions = await new AuthorizationRepository(
      authorized.context.database,
    ).listSessions();
    return Response.json({ sessions }, { headers: noStoreJsonHeaders });
  } catch {
    return adminError(500, "ADMIN_SESSION_LIST_FAILED", "Không thể đọc danh sách phiên.");
  }
}
