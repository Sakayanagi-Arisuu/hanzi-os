import { getAuthenticatedUser } from '../../../chatgpt-auth';
import { deriveAccountKey } from '../../../../src/lib/accountKey';
import { getD1Database } from '../../../../src/server/d1';
import { SyncRepository } from '../../../../src/server/syncRepository';
import { LearningProjectionContentUnavailableError, LearningProjectionRepository } from '../../../../src/server/learningProjectionRepository';
import { WorkspaceRepository } from '../../../../src/server/workspaceRepository';
import { workspaceHistoryEvents } from '../../../../src/sync/workspaceHistory';
import { requireCurrentLearningResetEpoch, LearningResetEpochConflictError } from '../../../../src/server/learningResetEpoch';
import { readBoundedRequestText } from '../../../../src/server/boundedRequestBody';
import { noStoreJsonHeaders } from '../../../../src/sync/protocol';
import { buildAccountAdaptivePilotPlan, parseAdaptivePlanMode, parseAdaptivePlanRequest } from '../../../../src/server/adaptivePilotPlan';
import { requirePremiumLesson } from '../../../../src/server/premiumAccess';
import { consumeMutationRateLimit, mutationRateLimitHeaders } from '../../../../src/server/mutationRateLimit';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreJsonHeaders });
export async function POST(request: Request) {
  if ((request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin)
    || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross origin' }, 403);
  try {
    const identity = await getAuthenticatedUser();
    if (!identity) return json({ error: 'Authentication required' }, 401);
    const ownerKey = await deriveAccountKey(identity.userId || identity.email);
    if (request.headers.get('x-learning-owner') !== ownerKey) return json({ error: 'Owner changed' }, 409);
    const raw = await readBoundedRequestText(request, 16_000);
    if (!raw.ok) return json({ error: 'Request too large' }, 413);
    let body, mode;
    try { body = parseAdaptivePlanRequest(JSON.parse(raw.text)); mode = parseAdaptivePlanMode(new URL(request.url)); }
    catch { return json({ error: 'Invalid plan request' }, 400); }
    const database = await getD1Database();
    const syncRepository = new SyncRepository(database);
    const userId = await syncRepository.resolveUser(identity);
    const limit = await consumeMutationRateLimit(database, userId, { scope: 'learning.adaptive.plan',
      policyVersion: '2026-10-21.v1', maxRequests: 60, windowSeconds: 600 });
    if (!limit.allowed) return Response.json({ error: 'Retry planning later' }, { status: 429,
      headers: { ...noStoreJsonHeaders, ...mutationRateLimitHeaders(limit) } });
    const usesHistory = body.preferences?.allowInference === true;
    const inferenceAllowed = async () => (await syncRepository.getLearningDocument(userId))?.document.profile.value.learningPreferences?.allowInference === true;
    if (usesHistory && !await inferenceAllowed()) return json({error:'PREFERENCE_CHANGED'},409);
    const projection = await new LearningProjectionRepository(database).read(userId);
    await requireCurrentLearningResetEpoch(database, userId, body.resetEpoch);
    const workspace = usesHistory ? await new WorkspaceRepository(database).exchange(userId, body.resetEpoch, []) : null;
    const result = await buildAccountAdaptivePilotPlan({ request: body, mode, ownerKey, projection,
      events: workspace ? workspaceHistoryEvents({ ownerKey, resetEpoch: body.resetEpoch }, workspace.entries, [], true) : [],
      entitlementAllowed: async lessonId => (await requirePremiumLesson(request, lessonId)) === null,
      now: new Date().toISOString() });
    await requireCurrentLearningResetEpoch(database, userId, body.resetEpoch);
    if (usesHistory && !await inferenceAllowed()) return json({error:'PREFERENCE_CHANGED'},409);
    return json(result);
  } catch (error) {
    if (error instanceof LearningProjectionContentUnavailableError) return json({ error: 'LEARNING_PROJECTION_CONTENT_UNAVAILABLE' }, 409);
    if (error instanceof LearningResetEpochConflictError) return json({ error: 'Reset changed' }, 409);
    return json({ error: 'Adaptive plan unavailable' }, 503);
  }
}
