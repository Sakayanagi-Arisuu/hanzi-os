import { authorizeAdmin, adminError } from "../../../../src/server/adminHttp";
import {
  AUDIT_CATEGORIES,
  AuditRepository,
  type AuditCategory,
  type AuditOutcome,
} from "../../../../src/server/auditRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authorized = await authorizeAdmin("admin:audit:read");
    if (!authorized.ok) return authorized.response;
    const requested = new URL(request.url).searchParams.get("category");
    const params = new URL(request.url).searchParams;
    const category = requested && AUDIT_CATEGORIES.includes(requested as AuditCategory)
      ? requested as AuditCategory
      : null;
    const requestedOutcome = params.get("outcome");
    const outcome: AuditOutcome | null = requestedOutcome === "success"
      || requestedOutcome === "denied"
      || requestedOutcome === "failed"
      ? requestedOutcome
      : null;
    const limit = Math.max(1, Math.min(100, Number.parseInt(params.get("limit") ?? "25", 10) || 25));
    const offset = Math.max(0, Math.min(100_000, Number.parseInt(params.get("offset") ?? "0", 10) || 0));
    const page = await new AuditRepository(authorized.context.database).listPage({
      category,
      outcome,
      query: params.get("q")?.trim().slice(0, 120) ?? "",
      limit,
      offset,
    });
    return Response.json({ ...page, category, outcome, limit, offset }, { headers: noStoreJsonHeaders });
  } catch {
    return adminError(500, "AUDIT_READ_FAILED", "Không thể đọc nhật ký kiểm soát.");
  }
}
