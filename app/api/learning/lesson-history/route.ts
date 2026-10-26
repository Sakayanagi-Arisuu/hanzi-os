import { getChatGPTUser } from "../../../chatgpt-auth";
import { deriveAccountKey } from "../../../../src/lib/accountKey";
import { getD1Database } from "../../../../src/server/d1";
import { learningOwnerMismatch } from "../../../../src/server/learningOwnerHttp";
import { LessonHistoryRepository } from "../../../../src/server/lessonHistoryRepository";
import { LearningResetEpochConflictError } from "../../../../src/server/learningResetEpoch";
import { SyncRepository } from "../../../../src/server/syncRepository";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";
import type { LessonHistoryPageV1 } from "../../../../src/learning/lessonHistory";

export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreJsonHeaders });

export async function GET(request: Request) {
  try {
    const identity = await getChatGPTUser();
    const mismatch = await learningOwnerMismatch(request, identity);
    if (mismatch) return mismatch;
    if (!identity) return json({ error: { code: "AUTH_REQUIRED", message: "Đăng nhập để đọc lịch sử đã đồng bộ." } }, 401);
    const query = new URL(request.url).searchParams;
    const epochText = query.get("resetEpoch");
    const limitText = query.get("limit") ?? "50";
    if (epochText === null || !/^\d+$/.test(epochText) || !/^\d+$/.test(limitText))
      return json({ error: { code: "INVALID_HISTORY_QUERY" } }, 400);
    let cursor: LessonHistoryPageV1["nextCursor"] = null;
    const cursorText = query.get("cursor");
    if (cursorText) {
      if (cursorText.length > 400) return json({ error: { code: "INVALID_HISTORY_CURSOR" } }, 400);
      try { cursor = JSON.parse(cursorText) as LessonHistoryPageV1["nextCursor"]; }
      catch { return json({ error: { code: "INVALID_HISTORY_CURSOR" } }, 400); }
      if (!cursor || typeof cursor !== "object" || Array.isArray(cursor))
        return json({ error: { code: "INVALID_HISTORY_CURSOR" } }, 400);
    }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const ownerKey = await deriveAccountKey(identity.userId || identity.email);
    return json(await new LessonHistoryRepository(database).readPage(userId, ownerKey, Number(epochText),
      { limit: Number(limitText), cursor }));
  } catch (error) {
    if (error instanceof TypeError) return json({ error: { code: "INVALID_HISTORY_QUERY" } }, 400);
    if (error instanceof LearningResetEpochConflictError) return json({ error: { code: error.code, retryable: true } }, 409);
    return json({ error: { code: "HISTORY_UNAVAILABLE", message: "Chưa đọc được lịch sử; dữ liệu trên thiết bị vẫn được giữ.", retryable: true } }, 503);
  }
}
