import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { HanziPremiumRepository } from "../../../../src/server/hanziPremiumRepository";
import { sandboxCommerceEnabled } from "../../../../src/server/premiumAccess";
import { requestCorrelationId } from "../../../../src/server/auditRepository";

const redirect = (request: Request, notice: string) => {
  const destination = new URL("/admin/premium", request.url);
  destination.searchParams.set("notice", notice);
  return Response.redirect(destination, 303);
};

export async function POST(request: Request) {
  if (!sameOriginMutation(request) || !sandboxCommerceEnabled(request.url)) return redirect(request, "Thao tác không khả dụng.");
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) return redirect(request, "Biểu mẫu không hợp lệ.");
  const body = await readBoundedRequestText(request, 1600);
  if (!body.ok) return redirect(request, "Biểu mẫu quá dài.");
  const form = new URLSearchParams(body.text);
  const orderId = form.get("orderId");
  const reason = form.get("reason")?.trim();
  if (!orderId?.startsWith("hanzi:") || orderId.length > 80 || orderId.length <= 6 || !reason || reason.length < 10 || reason.length > 500) {
    return redirect(request, "Giao dịch hoặc lý do từ chối không hợp lệ.");
  }
  try {
    const authorized = await authorizeAdmin("commerce:manage", { stepUp: true });
    if (!authorized.ok) return redirect(request, "Cần xác minh lại tài khoản quản trị.");
    await new HanziPremiumRepository(authorized.context.database).rejectRefundWithAudit(orderId.slice(6),
      authorized.context.account.userId, authorized.context.sessionId, reason, requestCorrelationId(request));
    return redirect(request, "Đã từ chối yêu cầu và gửi lý do đến hồ sơ người học.");
  } catch { return redirect(request, "Chưa xử lý được yêu cầu. Hãy thử lại."); }
}
