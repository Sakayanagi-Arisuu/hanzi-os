import { getChatGPTUser } from '../../../chatgpt-auth';
import { learningOwnerMismatch } from '../../../../src/server/learningOwnerHttp';
import { getD1Database } from '../../../../src/server/d1';
import { SyncRepository } from '../../../../src/server/syncRepository';
import { readAssessmentPracticeMistakes } from '../../../../src/server/assessmentPracticeMistakesRepository';
import { noStoreJsonHeaders } from '../../../../src/sync/protocol';
export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: noStoreJsonHeaders });
export async function GET(request: Request) {
  try {
    const identity = await getChatGPTUser();
    if (!identity) return json({ error: 'Authentication required' }, 401);
    const mismatch = await learningOwnerMismatch(request, identity);
    if (mismatch) return mismatch;
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    return json(await readAssessmentPracticeMistakes(database, userId));
  } catch { return json({ error: 'Practice history unavailable' }, 503); }
}
