import { getAuthenticatedUser } from '../../../chatgpt-auth';
import { deriveAccountKey } from '../../../../src/lib/accountKey';
import { getD1Database } from '../../../../src/server/d1';
import { SyncRepository } from '../../../../src/server/syncRepository';
import { LearningProjectionContentUnavailableError, LearningProjectionRepository } from '../../../../src/server/learningProjectionRepository';
import { requireCurrentLearningResetEpoch, LearningResetEpochConflictError } from '../../../../src/server/learningResetEpoch';
import { noStoreJsonHeaders } from '../../../../src/sync/protocol';
import { AdaptiveUnitUnavailableError, materializeAccountPilotUnit, parseAdaptiveUnitRequest } from '../../../../src/server/adaptivePilotPlan';
import { requirePremiumLesson } from '../../../../src/server/premiumAccess';
import { consumeMutationRateLimit, mutationRateLimitHeaders } from '../../../../src/server/mutationRateLimit';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreJsonHeaders });
export async function GET(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross origin' }, 403);
  try {
    const identity = await getAuthenticatedUser();
    if (!identity) return json({ error: 'Authentication required' }, 401);
    const ownerKey = await deriveAccountKey(identity.userId || identity.email);
    if (request.headers.get('x-learning-owner') !== ownerKey) return json({ error: 'Owner changed' }, 409);
    let query;
    try { query = parseAdaptiveUnitRequest(new URL(request.url)); } catch { return json({ error: 'Invalid unit request' }, 400); }
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const limit = await consumeMutationRateLimit(database, userId, { scope: 'learning.adaptive.unit',
      policyVersion: '2026-10-21.v1', maxRequests: 120, windowSeconds: 600 });
    if (!limit.allowed) return Response.json({ error: 'Retry unit later' }, { status: 429,
      headers: { ...noStoreJsonHeaders, ...mutationRateLimitHeaders(limit) } });
    await requireCurrentLearningResetEpoch(database, userId, query.resetEpoch);
    const projection = await new LearningProjectionRepository(database).read(userId);
    const result = await materializeAccountPilotUnit({ request: query, resetEpoch: query.resetEpoch, ownerKey, projection,
      entitlementAllowed: async lessonId => (await requirePremiumLesson(request, lessonId)) === null });
    await requireCurrentLearningResetEpoch(database, userId, query.resetEpoch);
    return json(result);
  } catch (error) {
    if (error instanceof LearningProjectionContentUnavailableError) return json({ error: 'LEARNING_PROJECTION_CONTENT_UNAVAILABLE' }, 409);
    if (error instanceof LearningResetEpochConflictError) return json({ error: 'Reset changed' }, 409);
    if (error instanceof AdaptiveUnitUnavailableError) return json({ error: 'ADAPTIVE_SOURCE_UNAVAILABLE' }, 409);
    return json({ error: 'Adaptive unit unavailable' }, 503);
  }
}
