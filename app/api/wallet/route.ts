import { AUTH_JSON_HEADERS, resolveCurrentAccount, sameOriginMutation } from "../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { getD1Database } from "../../../src/server/d1";
import { HanziWalletRepository } from "../../../src/server/hanziWalletRepository";
import { asCommerceOrder, HanziPremiumConflict, HanziPremiumRepository } from "../../../src/server/hanziPremiumRepository";
import { consumeMutationRateLimit } from "../../../src/server/mutationRateLimit";
import { sandboxCommerceEnabled } from "../../../src/server/premiumAccess";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!sandboxCommerceEnabled(request.url)) return Response.json({ error: { message: "Ví Hanzi chưa khả dụng trên môi trường này." } }, { status: 403, headers: AUTH_JSON_HEADERS });
  try {
    const database = await getD1Database();
    const account = await resolveCurrentAccount(database);
    if (!account) return Response.json({ error: { message: "Đăng nhập để xem Ví Hanzi." } }, { status: 401, headers: AUTH_JSON_HEADERS });
    return Response.json(await new HanziWalletRepository(database).forOwner(account.userId), { headers: AUTH_JSON_HEADERS });
  } catch {
    return Response.json({ error: { message: "Chưa tải được Ví Hanzi." } }, { status: 503, headers: AUTH_JSON_HEADERS });
  }
}
export async function POST(request: Request) {
  if (!sameOriginMutation(request) || !sandboxCommerceEnabled(request.url)) return Response.json({ error: { message: "Thao tác không khả dụng." } }, { status: 403, headers: AUTH_JSON_HEADERS });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: { message: "Yêu cầu không hợp lệ." } }, { status: 415, headers: AUTH_JSON_HEADERS });
  const body = await readBoundedRequestText(request, 1000);
  if (!body.ok) return Response.json({ error: { message: "Yêu cầu quá dài." } }, { status: 413, headers: AUTH_JSON_HEADERS });
  let input: unknown;
  try { input = JSON.parse(body.text); } catch { return Response.json({ error: { message: "Yêu cầu không hợp lệ." } }, { status: 400, headers: AUTH_JSON_HEADERS }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: { message: "Yêu cầu không hợp lệ." } }, { status: 422, headers: AUTH_JSON_HEADERS });
  const { planId, key, expectedAmount } = input as Record<string, unknown>;
  if ((planId !== "hsk4-month" && planId !== "hsk4-year") || typeof key !== "string"
    || !Number.isSafeInteger(expectedAmount) || Number(expectedAmount) < 1 || Number(expectedAmount) > 1_000_000) {
    return Response.json({ error: { message: "Chọn gói và giá hợp lệ." } }, { status: 422, headers: AUTH_JSON_HEADERS });
  }
  try {
    const database = await getD1Database();
    const account = await resolveCurrentAccount(database);
    if (!account) return Response.json({ error: { message: "Đăng nhập để dùng Ví Hanzi." } }, { status: 401, headers: AUTH_JSON_HEADERS });
    const pacing = await consumeMutationRateLimit(database, account.userId, { scope: "hanzi.wallet.purchase", policyVersion: "1", maxRequests: 15, windowSeconds: 600 });
    if (!pacing.allowed) return Response.json({ error: { message: "Bạn thao tác quá nhanh. Hãy thử lại sau ít phút." } }, { status: 429, headers: AUTH_JSON_HEADERS });
    const order = await new HanziPremiumRepository(database).purchase(account.userId, planId, key, Number(expectedAmount));
    return Response.json({ order: asCommerceOrder(order) }, { headers: AUTH_JSON_HEADERS });
  } catch (error) {
    return Response.json({ error: { message: error instanceof HanziPremiumConflict ? error.message : "Chưa mua được gói bằng Hanzi. Hãy thử lại." } },
      { status: error instanceof HanziPremiumConflict ? 409 : 503, headers: AUTH_JSON_HEADERS });
  }
}
