import { getD1Database } from '../../../../src/server/d1';
import { requestPremiumAccess, sandboxCommerceEnabled } from '../../../../src/server/premiumAccess';
import { cashLedgerEnabled } from '../../../../src/server/bankTransferRepository';
import { LessonAccessRepository } from '../../../../src/server/lessonAccessRepository';
import { LESSONS } from '../../../../src/data/curriculum';
import { getHskLessonPathId } from '../../../../src/data/hskCurriculumGraph';
import { noStoreJsonHeaders } from '../../../../src/sync/protocol';
import { getAuthenticatedUser } from '../../../chatgpt-auth';
import { learningOwnerMismatch } from '../../../../src/server/learningOwnerHttp';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const mismatch = await learningOwnerMismatch(request, await getAuthenticatedUser());
    if (mismatch) return mismatch;
    const database = await getD1Database();
    const premium = await requestPremiumAccess(request, database);
    const free = sandboxCommerceEnabled(request.url) || cashLedgerEnabled(request.url)
      ? await new LessonAccessRepository(database).freeHsk4LessonIds() : [];
    const premiumLessonIds = LESSONS.filter(lesson => getHskLessonPathId(lesson.id) === 'hsk4'
      && (premium || free.includes(lesson.id))).map(lesson => lesson.id);
    return Response.json({ version: 1, premiumLessonIds }, { headers: noStoreJsonHeaders });
  } catch { return Response.json({ error: 'Preparation unavailable' }, { status: 503, headers: noStoreJsonHeaders }); }
}
