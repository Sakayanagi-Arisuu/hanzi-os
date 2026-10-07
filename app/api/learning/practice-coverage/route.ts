import { getChatGPTUser } from "../../../chatgpt-auth";
import { getD1Database } from "../../../../src/server/d1";
import { SyncRepository } from "../../../../src/server/syncRepository";
import { readCurrentLearningResetEpoch } from "../../../../src/server/learningResetEpoch";
import { publishedPracticeCatalog } from "../../../../src/server/practiceQuestionCatalog";
import { noStoreJsonHeaders } from "../../../../src/sync/protocol";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const database = await getD1Database();
    const identity = await getChatGPTUser();
    const catalog = await publishedPracticeCatalog(database);
    let observed: string[] = [];
    let resetEpoch: number | null = null;
    if (identity) {
      const userId = await new SyncRepository(database).resolveUser(identity);
      resetEpoch = await readCurrentLearningResetEpoch(database, userId);
      const rows = await database.prepare(`SELECT DISTINCT activity_id AS id FROM learning_attempts WHERE user_id=? AND reset_epoch=?
        UNION SELECT DISTINCT activity_id AS id FROM lesson_page_attempts WHERE user_id=? AND reset_epoch=?
        UNION SELECT DISTINCT 'assessment:' || item_id AS id FROM assessment_attempts WHERE user_id=? AND reset_epoch=?`)
        .bind(userId, resetEpoch, userId, resetEpoch, userId, resetEpoch).all<{ id: string }>();
      if (!rows.success || !rows.results || await readCurrentLearningResetEpoch(database, userId) !== resetEpoch) throw new Error("Coverage unavailable");
      observed = rows.results.map(row => row.id);
    }
    // Only question identities, never prompts, answers, transcripts or another owner's evidence.
    return Response.json({ catalog, observed, authenticated: Boolean(identity), resetEpoch }, { headers: noStoreJsonHeaders });
  } catch {
    return Response.json({ error: "Chưa tải được tổng số câu luyện." }, { status: 503, headers: noStoreJsonHeaders });
  }
}
