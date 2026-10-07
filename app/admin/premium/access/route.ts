import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { requestCorrelationId } from "../../../../src/server/auditRepository";
import { LessonAccessRepository } from "../../../../src/server/lessonAccessRepository";
import { sandboxCommerceEnabled } from "../../../../src/server/premiumAccess";

const redirect = (request: Request, notice: string) => {
  const destination = new URL("/admin/premium", request.url);
  destination.searchParams.set("notice", notice);
  return Response.redirect(destination, 303);
};
export async function POST(request: Request) {
  if (!sameOriginMutation(request) || !sandboxCommerceEnabled(request.url)) return redirect(request, "Thao tác không khả dụng.");
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return redirect(request, "Biểu mẫu không hợp lệ.");
  const body = await readBoundedRequestText(request, 1000);
  if (!body.ok) return redirect(request, "Biểu mẫu quá dài.");
  const form = new URLSearchParams(body.text);
  const lessonId = form.get("lessonId");
  const tier = form.get("tier");
  if (!lessonId || lessonId.length > 120 || (tier !== "free" && tier !== "premium")) return redirect(request, "Bài hoặc quyền truy cập không hợp lệ.");
  try {
    const authorized = await authorizeAdmin("commerce:manage", { stepUp: true });
    if (!authorized.ok) return redirect(request, "Cần xác minh lại tài khoản quản trị.");
    await new LessonAccessRepository(authorized.context.database).setTier(lessonId, tier,
      authorized.context.account.userId, authorized.context.sessionId, requestCorrelationId(request));
    return redirect(request, "Đã cập nhật quyền bài Thiên Lộ.");
  } catch { return redirect(request, "Chưa cập nhật được quyền bài. Hãy thử lại."); }
}
