import { AUTH_JSON_HEADERS, resolveCurrentAccount, sameOriginMutation } from "../../../src/server/authHttp";
import { readBoundedRequestText } from "../../../src/server/boundedRequestBody";
import { getD1Database } from "../../../src/server/d1";
import { consumeMutationRateLimit } from "../../../src/server/mutationRateLimit";
import { PremiumSupportConflict, PremiumSupportRepository, type PremiumSupportCategory } from "../../../src/server/premiumSupportRepository";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: AUTH_JSON_HEADERS });
const error = (message: string, status: number) => json({ error: { message } }, status);

export async function GET() {
  try {
    const database = await getD1Database();
    const account = await resolveCurrentAccount(database);
    if (!account) return error("Đăng nhập để xem yêu cầu hỗ trợ.", 401);
    return json({ tickets: await new PremiumSupportRepository(database).forOwner(account.userId) });
  } catch { return error("Chưa tải được yêu cầu hỗ trợ. Hãy thử lại.", 503); }
}

export async function POST(request: Request) {
  if (!sameOriginMutation(request)) return error("Yêu cầu không hợp lệ.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return error("Yêu cầu không hợp lệ.", 415);
  const body = await readBoundedRequestText(request, 4000);
  if (!body.ok) return error("Nội dung quá dài.", 413);
  let input: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(body.text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return error("Yêu cầu không hợp lệ.", 422);
    input = parsed as Record<string, unknown>;
  } catch { return error("Yêu cầu không hợp lệ.", 400); }
  const category = input.category;
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if ((category !== "access" && category !== "billing" && category !== "technical") || subject.length < 5 || subject.length > 120 || message.length < 10 || message.length > 2000) {
    return error("Chọn chủ đề và mô tả vấn đề đủ rõ (10–2.000 ký tự).", 422);
  }
  try {
    const database = await getD1Database();
    const account = await resolveCurrentAccount(database);
    if (!account) return error("Đăng nhập để gửi yêu cầu hỗ trợ.", 401);
    const pacing = await consumeMutationRateLimit(database, account.userId, { scope: "premium.support", policyVersion: "1", maxRequests: 5, windowSeconds: 3600 });
    if (!pacing.allowed) return error("Bạn đã gửi nhiều yêu cầu. Hãy thử lại sau.", 429);
    const ticket = await new PremiumSupportRepository(database).create(account.userId, category as PremiumSupportCategory, subject, message);
    return json({ ticket }, 201);
  } catch (cause) {
    return error(cause instanceof PremiumSupportConflict ? cause.message : "Chưa gửi được yêu cầu. Hãy thử lại.", cause instanceof PremiumSupportConflict ? 409 : 503);
  }
}
