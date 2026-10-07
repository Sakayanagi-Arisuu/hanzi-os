import { PremiumVndPriceRepository } from "../../../src/server/premiumVndPriceRepository";
import { premiumPlan, premiumAccess } from "../../../src/commerce/policy";
import { AUTH_JSON_HEADERS, resolveCurrentAccount, sameOriginMutation } from "../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { CommerceConflict, CommerceRepository } from "../../../src/server/commerceRepository";
import { getD1Database } from "../../../src/server/d1";
import { sandboxCommerceEnabled } from "../../../src/server/premiumAccess";
import { consumeMutationRateLimit } from "../../../src/server/mutationRateLimit";
import { asCommerceOrder, HanziPremiumConflict, HanziPremiumRepository } from "../../../src/server/hanziPremiumRepository";
import { LessonAccessRepository } from "../../../src/server/lessonAccessRepository";
import { requestCorrelationId } from "../../../src/server/auditRepository";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_JSON_HEADERS });
const error = (message: string, status: number) => json({ error: { message } }, status);
export async function GET(request: Request) {
  try {
    const sandbox = sandboxCommerceEnabled(request.url);
    if (!sandbox) return json({ authenticated: false, sandbox: false, orders: [], ...premiumAccess([]), serverNow: Date.now() });
    const database = await getD1Database();
    const account = await resolveCurrentAccount(database);
    const orders = account && sandbox ? await new CommerceRepository(database).orders(account.userId) : [];
    const wallet = new HanziPremiumRepository(database);
    const walletOrders = account && sandbox ? (await wallet.orders(account.userId)).map(asCommerceOrder) : [];
    const combined = [...orders, ...walletOrders].sort((a, b) => b.createdAt - a.createdAt);
    return json({ authenticated: Boolean(account), sandbox, orders: combined, prices: await wallet.prices(), vndPrices: await new PremiumVndPriceRepository(database).prices(),
      freeHsk4LessonIds: await new LessonAccessRepository(database).freeHsk4LessonIds(),
      ...premiumAccess(combined), serverNow: Date.now() });
  } catch { return error("Chưa tải được gói học. Hãy thử lại.", 503); }
}
export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return error("Yêu cầu không hợp lệ.", 403);
  if (!sandboxCommerceEnabled(request.url)) return error("Thanh toán chưa được mở trên môi trường này.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return error("Yêu cầu không hợp lệ.", 415);
  const body = await readBoundedRequestText(request, 4096);
  if (!body.ok) return error("Yêu cầu quá dài.", 413);
  let input: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(body.text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return error("Yêu cầu không hợp lệ.", 422);
    input = parsed as Record<string, unknown>;
  } catch { return error("Yêu cầu không hợp lệ.", 400); }
  try {
    const database = await getD1Database();
    const account = await resolveCurrentAccount(database);
    if (!account) return error("Đăng nhập để quản lý Premium.", 401);
    const pacing = await consumeMutationRateLimit(database, account.userId, { scope: "commerce.sandbox", policyVersion: "1", maxRequests: 30, windowSeconds: 600 });
    if (!pacing.allowed) return error("Bạn thao tác quá nhanh. Hãy thử lại sau ít phút.", 429);
    const repository = new CommerceRepository(database);
    const hanzi = new HanziPremiumRepository(database);
    if (input.action === "create") {
      const plan = premiumPlan(input.planId);
      if (!plan || typeof input.key !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(input.key)) return error("Chọn gói hợp lệ và thử lại.", 422);
      if ((await hanzi.prices()).length > 0) return error("Thử nghiệm không thu tiền đã đóng. Hãy chọn gói có giá Hanzi.", 409);
      return json({ order: await repository.create(account.userId, plan.id, input.key) });
    }
    if (typeof input.orderId !== "string" || input.orderId.length > 80) return error("Chọn một giao dịch hợp lệ.", 422);
    if (input.action === "pay" || input.action === "fail" || input.action === "cancel") {
      if (input.action === "pay") {
        await repository.get(account.userId, input.orderId);
        if ((await hanzi.prices()).length > 0) return error("Thử nghiệm không thu tiền đã đóng. Hãy chọn gói có giá Hanzi.", 409);
      }
      return json({ order: await repository.settle(account.userId, input.orderId, input.action === "pay" ? "paid" : input.action === "fail" ? "failed" : "cancelled") });
    }
    if (input.action === "request-refund" && typeof input.reason === "string" && input.reason.trim().length >= 5 && input.reason.trim().length <= 500) {
      if (input.orderId.startsWith("hanzi:")) {
        const walletOrder = await new HanziPremiumRepository(database).requestRefund(account.userId, input.orderId.slice(6), input.reason.trim(), requestCorrelationId(request));
        return json({ order: walletOrder ? asCommerceOrder(walletOrder) : null });
      }
      return json({ order: await repository.requestRefund(account.userId, input.orderId, input.reason.trim()) });
    }
    return error("Yêu cầu chưa đủ thông tin.", 422);
  } catch (cause) {
    const conflict = cause instanceof CommerceConflict || cause instanceof HanziPremiumConflict;
    return error(conflict ? cause.message : "Chưa xử lý được giao dịch. Hãy thử lại; yêu cầu lặp không cấp quyền hai lần.", conflict ? 409 : 503);
  }
}
