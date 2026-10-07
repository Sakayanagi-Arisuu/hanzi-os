import { PremiumVndPriceRepository } from "../../../../src/server/premiumVndPriceRepository";
import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { requestCorrelationId } from "../../../../src/server/auditRepository";
import { HanziPremiumRepository } from "../../../../src/server/hanziPremiumRepository";
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
  const planId = form.get("planId");
  const amount = Number(form.get("amount"));
  const currency = form.get("currency") ?? "hanzi";
  if (currency !== "hanzi" && currency !== "vnd") return redirect(request, "Đơn vị giá không hợp lệ.");
  if ((planId !== "hsk4-month" && planId !== "hsk4-year") || !Number.isSafeInteger(amount) || amount < 1 || amount > (currency === "vnd" ? 100_000_000 : 1_000_000)) {
    return redirect(request, "Gói hoặc giá không hợp lệ.");
  }
  try {
    const authorized = await authorizeAdmin("commerce:manage", { stepUp: true });
    if (!authorized.ok) return redirect(request, "Cần xác minh lại tài khoản quản trị.");
    const repository = currency === "vnd" ? new PremiumVndPriceRepository(authorized.context.database) : new HanziPremiumRepository(authorized.context.database);
    await repository.setPrice(planId, amount,
      authorized.context.account.userId, authorized.context.sessionId, requestCorrelationId(request));
    return redirect(request, currency === "vnd" ? "Đã cập nhật giá niêm yết VNĐ. Thanh toán tiền thật vẫn đóng." : "Đã đặt giá Hanzi cho gói thử nghiệm.");
  } catch { return redirect(request, "Chưa đặt được giá. Hãy thử lại."); }
}
