import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { CommerceRepository } from "../../../../src/server/commerceRepository";
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
  const body = await readBoundedRequestText(request, 1000);
  if (!body.ok) return redirect(request, "Biểu mẫu quá dài.");
  const orderId = new URLSearchParams(body.text).get("orderId");
  if (!orderId || orderId.length > 80) return redirect(request, "Chọn giao dịch hợp lệ.");
  try {
    const authorized = await authorizeAdmin("commerce:manage", { stepUp: true });
    if (!authorized.ok) return redirect(request, "Cần xác minh lại tài khoản quản trị.");
    if (orderId.startsWith("hanzi:")) {
      await new HanziPremiumRepository(authorized.context.database).refundWithAudit(orderId.slice(6),
        authorized.context.account.userId, authorized.context.sessionId, requestCorrelationId(request));
      return redirect(request, "Đã hoàn Hanzi vào ví và tính lại thời hạn gói.");
    }
    await new CommerceRepository(authorized.context.database).refundWithAudit(orderId,
      authorized.context.account.userId, authorized.context.sessionId, requestCorrelationId(request));
    return redirect(request, "Đã hoàn giao dịch thử nghiệm và tính lại thời hạn gói.");
  } catch { return redirect(request, "Chưa xử lý được yêu cầu. Hãy thử lại."); }
}
