import { authorizeAdmin } from "../../../../src/server/adminHttp";
import { sameOriginMutation } from "../../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { HanziWalletRepository } from "../../../../src/server/hanziWalletRepository";
import { consumeMutationRateLimit } from "../../../../src/server/mutationRateLimit";
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
  const userId = form.get("userId")?.trim();
  const amount = Number(form.get("amount"));
  const referenceId = form.get("referenceId");
  if (!userId || userId.length > 100 || !referenceId || !Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
    return redirect(request, "Tài khoản hoặc số Hanzi không hợp lệ.");
  }
  try {
    const authorized = await authorizeAdmin("commerce:manage", { stepUp: true });
    if (!authorized.ok) return redirect(request, "Cần xác minh lại tài khoản quản trị.");
    const pacing = await consumeMutationRateLimit(authorized.context.database, authorized.context.account.userId,
      { scope: "hanzi.wallet.admin", policyVersion: "1", maxRequests: 20, windowSeconds: 600 });
    if (!pacing.allowed) return redirect(request, "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.");
    await new HanziWalletRepository(authorized.context.database).adjustByAdmin(userId, amount,
      authorized.context.account.userId, authorized.context.sessionId, referenceId);
    return redirect(request, "Đã cập nhật Ví Hanzi và ghi nhật ký quản trị.");
  } catch { return redirect(request, "Chưa cập nhật được ví. Kiểm tra tài khoản, số dư và thử lại."); }
}
