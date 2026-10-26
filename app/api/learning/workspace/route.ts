import { getAuthenticatedUser } from '../../../chatgpt-auth';
import { deriveAccountKey } from '../../../../src/lib/accountKey';
import { getD1Database } from '../../../../src/server/d1';
import { SyncRepository } from '../../../../src/server/syncRepository';
import { WorkspaceRepository } from '../../../../src/server/workspaceRepository';
import { LearningResetEpochConflictError } from '../../../../src/server/learningResetEpoch';
import { readBoundedRequestText } from '../../../../src/server/boundedRequestBody';
import { noStoreJsonHeaders } from '../../../../src/sync/protocol';
import { validWorkspaceEntry, workspaceEntriesForClient, WORKSPACE_EXTENSIONS_HEADER } from '../../../../src/sync/workspaceProtocol';
import { consumeMutationRateLimit, mutationRateLimitHeaders } from '../../../../src/server/mutationRateLimit';

export const dynamic = 'force-dynamic';
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: noStoreJsonHeaders });
export async function POST(request: Request) {
  if ((request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin)
    || request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross origin' }, 403);
  try {
    const identity = await getAuthenticatedUser();
    if (!identity) return json({ error: 'Authentication required' }, 401);
    const owner = await deriveAccountKey(identity.userId || identity.email);
    if (request.headers.get('x-learning-owner') !== owner) return json({ error: 'Owner changed' }, 409);
    const raw = await readBoundedRequestText(request, 512_000);
    if (!raw.ok) return json({ error: 'Workspace too large' }, 413);
    let body;
    try { body = JSON.parse(raw.text); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (body.version !== 1 || !Array.isArray(body.entries) || body.entries.length > 100
      || !body.entries.every(validWorkspaceEntry) || !Number.isSafeInteger(body.resetEpoch) || body.resetEpoch < 0) return json({ error: 'Invalid workspace' }, 400);
    const database = await getD1Database();
    const userId = await new SyncRepository(database).resolveUser(identity);
    const limit = await consumeMutationRateLimit(database, userId, { scope: 'learning.workspace.exchange', policyVersion: '2026-10-09.v1', maxRequests: 120, windowSeconds: 600 });
    if (!limit.allowed) return Response.json({ error: 'Retry workspace later' }, { status: 429, headers: { ...noStoreJsonHeaders, ...mutationRateLimitHeaders(limit) } });
    const document = await new WorkspaceRepository(database).exchange(userId, body.resetEpoch, body.entries);
    const extension = request.headers.get(WORKSPACE_EXTENSIONS_HEADER);
    return json({ ...document, entries: workspaceEntriesForClient(document.entries, extension === '2' || extension === '3', extension === '3') });
  } catch (error) {
    if (error instanceof LearningResetEpochConflictError) return json({ error: 'Reset changed' }, 409);
    return json({ error: 'Workspace unavailable' }, 503);
  }
}
