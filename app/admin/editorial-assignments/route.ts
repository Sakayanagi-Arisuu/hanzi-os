import { boundedReturnTo, sameOriginMutation } from "../../../src/server/authHttp";
import { requestCorrelationId } from "../../../src/server/auditRepository";
import { authorizeAdmin } from "../../../src/server/adminHttp";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import {
  ContentStudioRepository,
  STUDIO_ASSIGNMENT_PRIORITIES,
  type StudioAssignmentPriority,
} from "../../../src/server/contentStudioRepository";

export const dynamic = "force-dynamic";

const redirect = (request: Request, key: "updated" | "error", message: string, returnTo?: string | null) => {
  const target = new URL(boundedReturnTo(returnTo ?? null, "/admin"), request.url);
  target.searchParams.set(key, message.slice(0, 400));
  if (target.pathname === "/admin") target.hash = "editorial-operations";
  return Response.redirect(target, 303);
};

const isPriority = (value: string): value is StudioAssignmentPriority =>
  STUDIO_ASSIGNMENT_PRIORITIES.includes(value as StudioAssignmentPriority);

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) {
    return redirect(request, "error", "Yêu cầu khác nguồn đã bị chặn.");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return redirect(request, "error", "Biểu mẫu phân công không hợp lệ.");
  }
  const authorized = await authorizeAdmin("content:approve");
  if (!authorized.ok) {
    return redirect(request, "error", "Tài khoản không có quyền phân công nội dung.");
  }
  let returnTo: string | null = null;
  try {
    const bounded = await readBoundedRequestText(request, 20_000);
    if (!bounded.ok) throw new TypeError("Biểu mẫu phân công vượt giới hạn an toàn.");
    const form = new URLSearchParams(bounded.text);
    returnTo = form.get("returnTo");
    const revisionId = form.get("revisionId") ?? "";
    const priority = form.get("priority") ?? "";
    const dueValue = (form.get("dueAt") ?? "").trim();
    const dueAt = dueValue ? Date.parse(dueValue) : null;
    if (!revisionId || revisionId.length > 255 || !isPriority(priority)) {
      throw new TypeError("Nội dung hoặc mức ưu tiên không hợp lệ.");
    }
    if (dueAt !== null && !Number.isFinite(dueAt)) {
      throw new TypeError("Hạn xử lý không hợp lệ.");
    }
    await new ContentStudioRepository(authorized.context.database).setAssignment({
      actorUserId: authorized.context.account.userId,
      actorSessionId: authorized.context.sessionId,
      revisionId,
      expectedRowVersion: Number(form.get("expectedAssignmentRowVersion")),
      ownerUserId: form.get("ownerUserId") ?? "",
      reviewerUserId: form.get("reviewerUserId") || null,
      priority,
      dueAt,
      note: form.get("note") || null,
      idempotencyKey: form.get("idempotencyKey") ?? "",
      requestId: requestCorrelationId(request),
    });
    return redirect(request, "updated", "Đã cập nhật người phụ trách, người duyệt và hạn xử lý.", returnTo);
  } catch (error) {
    return redirect(
      request,
      "error",
      error instanceof Error ? error.message : "Chưa thể cập nhật phân công nội dung.",
      returnTo,
    );
  }
}
