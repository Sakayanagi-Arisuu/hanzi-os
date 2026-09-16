import { getChatGPTUser } from "../../../chatgpt-auth";
import { AnalyticsRepository } from "../../../../src/server/analyticsRepository";
import { getD1Database } from "../../../../src/server/d1";
import { SyncRepository } from "../../../../src/server/syncRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreJsonHeaders });
async function handle(request: Request, write: boolean) {
  if (write && ((request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin)
    || request.headers.get("sec-fetch-site") === "cross-site")) return json({ error: "Truy cập không hợp lệ." }, 403);
  try {
    const identity = await getChatGPTUser();
    if (!identity) return json({ error: "Cần đăng nhập." }, 401);
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const repository = new AnalyticsRepository(database);
    if (write) { await repository.recordAccess(userId); return json({ ok: true }); }
    return json(await repository.read(userId));
  } catch {
    return json({ error: "Chưa tải được dấu chân tu luyện. Vui lòng thử lại." }, 503);
  }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
