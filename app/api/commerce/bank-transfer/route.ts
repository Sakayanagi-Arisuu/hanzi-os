import { resolveCurrentAccount, sameOriginMutation, AUTH_JSON_HEADERS } from "../../../../src/server/authHttp";
import { getD1Database } from "../../../../src/server/d1";
import { BankTransferRepository, cashLedgerEnabled } from "../../../../src/server/bankTransferRepository";
import { readBoundedRequestText } from "../../../../src/server/boundedRequestBody";
import { premiumPlan } from "../../../../src/commerce/policy";
import { consumeMutationRateLimit } from "../../../../src/server/mutationRateLimit";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_JSON_HEADERS });
export async function GET(request: Request) {
  if (!cashLedgerEnabled(request.url)) return json({ enabled:false,orders:[] });
  try {
    const db = await getD1Database(); const account = await resolveCurrentAccount(db);
    const repo = new BankTransferRepository(db);
    return json({ ...await repo.availability(request.url), orders:account ? await repo.orders(account.userId) : [] });
  } catch { return json({ error:{message:"Chưa tải được thông tin chuyển khoản."} },503); }
}
export async function POST(request: Request) {
  if (!sameOriginMutation(request) || !cashLedgerEnabled(request.url)) return json({error:{message:"Thanh toán chuyển khoản chưa được mở."}},403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json({error:{message:"Yêu cầu không hợp lệ."}},415);
  const body = await readBoundedRequestText(request,2048);
  if (!body.ok) return json({error:{message:"Yêu cầu quá dài."}},413);
  try {
    const input = JSON.parse(body.text) as Record<string,unknown>;
    if (!input || typeof input !== "object" || Array.isArray(input)) return json({error:{message:"Yêu cầu không hợp lệ."}},422);
    const db = await getD1Database(); const account = await resolveCurrentAccount(db);
    if (!account) return json({error:{message:"Đăng nhập để quản lý đơn hàng."}},401);
    const pacing=await consumeMutationRateLimit(db,account.userId,{scope:"commerce.bank",policyVersion:"1",maxRequests:15,windowSeconds:600});
    if (!pacing.allowed) return json({error:{message:"Thao tác quá nhanh. Vui lòng thử lại sau."}},429);
    const repo = new BankTransferRepository(db);
    if (input.action === "create") {
      const plan=premiumPlan(input.planId);
      if (!plan || typeof input.key!=="string" || typeof input.expectedAmount!=="number") return json({error:{message:"Chọn gói và giá hợp lệ."}},422);
      return json({order:await repo.create(account.userId,plan.id,input.key,input.expectedAmount,request.url)});
    }
    if (typeof input.orderId!=="string" || input.orderId.length>80) return json({error:{message:"Đơn hàng không hợp lệ."}},422);
    if (input.action === "cancel") await repo.cancel(account.userId,input.orderId);
    else if (input.action === "refund" && typeof input.reason === "string") await repo.requestRefund(account.userId,input.orderId,input.reason);
    else return json({error:{message:"Thao tác không hợp lệ."}},422);
    return json({ok:true});
  } catch (error) { return json({error:{message:error instanceof Error && !/SQL|D1|constraint|database/i.test(error.message) ? error.message : "Chưa xử lý được đơn. Hãy thử lại."}},409); }
}
