import { readActiveOwnerLearningScope, readLessonResume, writeLessonResume, deleteLessonResume, StaleOwnerGenerationError } from './indexedDb';

const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const CACHEABLE_PATHS = new Set([
  '/api/content/runtime', '/api/content/premium-rich', '/api/content/premium-level-check',
  '/api/learning/mistakes', '/api/learning/practice-coverage', '/api/learning/analytics',
  '/api/learning/practice-mistakes',
  '/api/reader/editorial/catalog', '/api/reader/editorial/chapter',
  '/api/exams/catalog', '/api/exams/history', '/api/learning/xp',
  '/api/content/offline-inventory',
]);
type SavedRead = { version: 1; savedAt: number; body: string; contentType: string };
type OfflineReadInit = RequestInit & { offlineTimeoutMs?: number };

/** Explicit learner reads only. Never caches session, credentials, mutations or admin APIs.
 * HTTP denials invalidate the saved response; outages can use the exact owner/reset copy.
 */
export async function offlineRead(input: RequestInfo | URL, options?: OfflineReadInit, send: typeof fetch = fetch): Promise<Response> {
  const { offlineTimeoutMs = 12_000, ...init } = options ?? {};
  const timeoutMs = Math.min(60_000, Math.max(1_000, offlineTimeoutMs));
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    typeof location === 'undefined' ? 'http://localhost' : location.origin);
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (method !== 'GET' || !(CACHEABLE_PATHS.has(url.pathname) || /^\/api\/reader\/editorial\/chapters\/[^/]+\/[^/]+$/.test(url.pathname)
    || /^\/api\/exams\/hsk[1-4]\/[a-l]\/practice$/.test(url.pathname))
    || (typeof location !== 'undefined' && url.origin !== location.origin)) return send(input, init);
  const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
  const active = await readActiveOwnerLearningScope().catch(() => null);
  if (!active) return send(input, init);
  const scope = { expectedOwnerGeneration: active.ownerGeneration, resetEpoch: active.resetEpoch,
    entryKey: `offline-read:v1:${url.pathname}${url.search}` };
  const stillOwned = async () => {
    const current = await readActiveOwnerLearningScope();
    if (!current || current.ownerGeneration.ownerKey !== active.ownerGeneration.ownerKey
      || current.ownerGeneration.generation !== active.ownerGeneration.generation || current.resetEpoch !== active.resetEpoch) {
      throw new StaleOwnerGenerationError();
    }
  };
  const fallback = async (): Promise<Response | null> => {
    if (signal?.aborted) throw signal.reason;
    const record = await readLessonResume<SavedRead>(scope);
    const saved = record?.value;
    if (!saved || saved.version !== 1 || Date.now() - saved.savedAt < 0 || Date.now() - saved.savedAt > MAX_AGE) return null;
    await stillOwned();
    return new Response(saved.body, { headers: { 'content-type': saved.contentType, 'x-hanzi-offline': '1', 'cache-control': 'no-store' } });
  };
  let response: Response;
  try {
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    headers.set('x-learning-owner', active.ownerGeneration.ownerKey);
    response = await send(input, { ...init, headers, signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const saved = await fallback();
    if (saved) return saved;
    throw error;
  }
  await stillOwned();
  if (response.status === 401 || response.status === 403 || response.status === 404) {
    await deleteLessonResume(scope);
    return response;
  }
  if (response.status >= 500 || response.status === 408 || response.status === 429) return await fallback() ?? response;
  if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
    const body = await response.clone().text();
    // A partial or non-JSON response must never replace a usable snapshot.
    JSON.parse(body);
    try {
      await writeLessonResume({ ...scope, value: { version: 1, savedAt: Date.now(), body,
        contentType: 'application/json' } satisfies SavedRead });
    } catch (error) {
      if (error instanceof StaleOwnerGenerationError) throw error;
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('hanzi-storage-error'));
    }
  }
  return response;
}
