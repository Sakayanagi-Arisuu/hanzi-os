import type { CommerceSnapshot } from './policy';
import { readActiveOwnerLearningScope, readLessonResume, writeLessonResume, deleteLessonResume } from '../sync/indexedDb';

const ENTRY = 'offline-entitlement:v1';
const MAX_AGE = 30 * 86400_000;
type Saved = { savedAt: number; snapshot: CommerceSnapshot };
/** Saved permission is for downloaded learning only; purchase APIs always verify online. */
export async function readCommerceWithOfflineFallback(ownerKey: string, signal: AbortSignal, send: typeof fetch = fetch) {
  const active = await readActiveOwnerLearningScope();
  const scope = active?.ownerGeneration.ownerKey === ownerKey
    ? { expectedOwnerGeneration: active.ownerGeneration, resetEpoch: active.resetEpoch, entryKey: ENTRY } : null;
  const restore = async () => {
    if (signal.aborted || !scope) return null;
    const saved = (await readLessonResume<Saved>(scope))?.value;
    if (!saved) return null;
    const elapsed = Date.now() - saved.savedAt;
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > MAX_AGE) return null;
    const serverNow = saved.snapshot.serverNow + elapsed;
    return { ...saved.snapshot, serverNow,
      active: saved.snapshot.active && saved.snapshot.expiresAt !== null && saved.snapshot.expiresAt > serverNow };
  };
  let response: Response;
  try {
    response = await send('/api/commerce', { cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]) });
  } catch (cause) {
    const saved = await restore();
    if (saved) return saved;
    throw cause;
  }
  if (response.status === 401 || response.status === 403) {
    if (scope) await deleteLessonResume(scope);
    throw new Error('Hãy đăng nhập lại để xác minh gói học.');
  }
  if (!response.ok) {
    if (response.status >= 500 || response.status === 429) {
      const saved = await restore();
      if (saved) return saved;
    }
    throw new Error('Chưa xác minh được gói học. Hãy kết nối lại và thử lại.');
  }
  const value = await response.json() as CommerceSnapshot;
  if (typeof value.active !== 'boolean' || !Number.isFinite(value.serverNow)
    || !(value.expiresAt === null || Number.isFinite(value.expiresAt))) throw new Error('Gói học chưa hợp lệ.');
  if (scope) await writeLessonResume({ ...scope, value: { savedAt: Date.now(),
    snapshot: { authenticated: value.authenticated, sandbox: value.sandbox, active: value.active,
      expiresAt: value.expiresAt, serverNow: value.serverNow, freeHsk4LessonIds: value.freeHsk4LessonIds,
      orders: [] } } satisfies Saved });
  return value;
}
