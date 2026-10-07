import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { PremiumSupportRepository } from "../../../../src/server/premiumSupportRepository";
import { requestCorrelationId } from "../../../../src/server/auditRepository";

const redirect = (request: Request, notice: string) => {
  const destination = new URL("/admin/premium", request.url);
  destination.searchParams.set("notice", notice);
  return Response.redirect(destination, 303);
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return redirect(request, "Thao tác không hợp lệ.");
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return redirect(request, "Biểu mẫu không hợp lệ.");
  const body = await readBoundedRequestText(request, 4000);
  if (!body.ok) return redirect(request, "Biểu mẫu quá dài.");
  const input = new URLSearchParams(body.text);
  const ticketId = input.get("ticketId") ?? "";
  const response = (input.get("response") ?? "").trim();
  if (ticketId.length < 1 || ticketId.length > 80 || response.length < 10 || response.length > 2000) return redirect(request, "Cần viết phản hồi từ 10 đến 2.000 ký tự.");
  try {
    const authorized = await authorizeAdmin("commerce:manage", { stepUp: true });
    if (!authorized.ok) return redirect(request, "Cần xác minh lại tài khoản quản trị.");
    await new PremiumSupportRepository(authorized.context.database).answerWithAudit(
      ticketId, authorized.context.account.userId, authorized.context.sessionId,
      response, requestCorrelationId(request),
    );
    return redirect(request, "Đã gửi phản hồi cho tài khoản.");
  } catch { return redirect(request, "Chưa xử lý được yêu cầu. Hãy tải lại và thử lại."); }
}
