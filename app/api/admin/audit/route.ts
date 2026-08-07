import { authorizeAdmin, adminError } from "../../../../src/server/adminHttp";
import {
  AUDIT_CATEGORIES,
  AuditRepository,
  type AuditCategory,
} from "../../../../src/server/auditRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorized = await authorizeAdmin("admin:audit:read");
    if (!authorized.ok) return authorized.response;
    const requested = new URL(request.url).searchParams.get("category");
    const category = requested && AUDIT_CATEGORIES.includes(requested as AuditCategory)
      ? requested as AuditCategory
      : null;
    const events = await new AuditRepository(authorized.context.database).list({
      category,
      limit: 100,
    });
    return Response.json({ events, category }, { headers: noStoreJsonHeaders });
  } catch {
    return adminError(500, "AUDIT_READ_FAILED", "Không thể đọc nhật ký kiểm soát.");
  }
}
