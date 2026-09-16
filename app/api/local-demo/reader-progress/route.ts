import { getChatGPTUser } from '../../../chatgpt-auth';
import { getD1Database } from '../../../../src/server/d1';
import { readCurrentLearningResetEpoch } from '../../../../src/server/learningResetEpoch';

export const dynamic = 'force-dynamic';

/** Local fixture delivery only; neither a public API nor learning authority. */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404, headers });
  const user = await getChatGPTUser();
  if (user?.userId !== 'local-demo-user-1') return new Response(null, { status: 404, headers });
  const database = await getD1Database();
  const row = await database.prepare('SELECT metadata_json FROM audit_events WHERE id=? AND target_id=?')
    .bind('demo-journey-quarter-v1', user.userId).first<{ metadata_json: string }>();
  if (!row) return new Response(null, { status: 404, headers });
  const metadata = JSON.parse(row.metadata_json);
  const resetEpoch = await readCurrentLearningResetEpoch(database, user.userId);
  if (metadata.readerProgress?.resetEpoch !== resetEpoch) return new Response(null, { status: 404, headers });
  return Response.json({ readerProgress: metadata.readerProgress }, { headers });
}
