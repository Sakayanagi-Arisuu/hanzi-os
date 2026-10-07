import { AUTH_JSON_HEADERS, resolveCurrentAccount, sameOriginMutation } from "../../../../src/server/authHttp";
import { getD1Database } from "../../../../src/server/d1";
import { sandboxCommerceEnabled } from "../../../../src/server/premiumAccess";
import { consumeMutationRateLimit } from "../../../../src/server/mutationRateLimit";
import { LevelRewardRepository } from "../../../../src/server/levelRewardRepository";

export const dynamic = "force-dynamic";
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: AUTH_JSON_HEADERS });
async function handle(request: Request, claim: boolean) {
  if (!sandboxCommerceEnabled(request.url) || (claim && !sameOriginMutation(request))) return json({ error: "Phần thưởng chưa khả dụng." }, 403);
  try {
    const database = await getD1Database();
    const account = await resolveCurrentAccount(database);
    if (!account) return json({ error: "Đăng nhập để nhận và lưu Hanzi xu." }, 401);
    if (claim) {
      const limit = await consumeMutationRateLimit(database, account.userId, { scope: "hanzi.level.reward", policyVersion: "1", maxRequests: 15, windowSeconds: 600 });
      if (!limit.allowed) return json({ error: "Hãy đợi một chút rồi nhận thưởng tiếp." }, 429);
    }
    const repository = new LevelRewardRepository(database);
    return json(claim ? await repository.claim(account.userId) : await repository.read(account.userId));
  } catch { return json({ error: "Chưa tải được phần thưởng. Hãy thử lại." }, 503); }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
