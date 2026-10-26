import { canonicalStringify } from './canonicalHash';
import { assertOwnerRecoveryIdle } from './ownerRecoveryFence';
import { ACTIVE_OWNER_GENERATION_KEY, SYNC_META_STORE, openSyncDatabase, readActiveOwnerLearningScope,
  readSyncMeta, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';

type Binding = { installationId: string; deviceId: string };
const keyName = (binding: Binding) => `owner-recovery-seal:v1:${JSON.stringify(binding.installationId)}`;
const result = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const finished = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve(); transaction.onabort = transaction.onerror = () => reject(transaction.error ?? Error('Recovery seal transaction failed'));
});
function validKey(value: unknown): value is CryptoKey {
  const key = value as CryptoKey | null;
  const algorithm = key?.algorithm as HmacKeyAlgorithm | undefined;
  return Boolean(key && key.type === 'secret' && key.extractable === false && algorithm?.name === 'HMAC'
    && algorithm.hash?.name === 'SHA-256' && key.usages.includes('sign') && key.usages.includes('verify'));
}
async function requireScope(scope: ActiveOwnerLearningScope) {
  const active = await readActiveOwnerLearningScope({ allowRecoveryPreview: true });
  if (!active || active.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
    || active.ownerGeneration.generation !== scope.ownerGeneration.generation || active.resetEpoch !== scope.resetEpoch) throw new StaleOwnerGenerationError();
}
async function signingKey(scope: ActiveOwnerLearningScope, binding: Binding) {
  await requireScope(scope);
  const existing = await readSyncMeta<unknown>(keyName(binding));
  if (existing !== null) {
    if (!validKey(existing)) throw Error('Unknown recovery seal key; retain original metadata');
    return existing;
  }
  const candidate = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  await requireScope(scope);
  const db = await openSyncDatabase(), tx = db.transaction(SYNC_META_STORE, 'readwrite'), done = finished(tx);
  try {
    const store = tx.objectStore(SYNC_META_STORE);
    await assertOwnerRecoveryIdle(store);
    const owner = await result(store.get(ACTIVE_OWNER_GENERATION_KEY)) as { value?: ActiveOwnerLearningScope['ownerGeneration'] } | undefined;
    if (owner?.value?.ownerKey !== scope.ownerGeneration.ownerKey || owner.value.generation !== scope.ownerGeneration.generation) throw new StaleOwnerGenerationError();
    const saved = await result(store.get(keyName(binding))) as { value?: unknown } | undefined;
    if (saved && !validKey(saved.value)) throw Error('Unknown recovery seal key; retain original metadata');
    const key = saved ? saved.value as CryptoKey : candidate;
    if (!saved) store.put({ key: keyName(binding), value: key });
    await done; return key;
  } catch (error) { try { tx.abort(); } catch { /* Already complete. */ } await done.catch(() => undefined); throw error; }
}

/** Local authenticity only. This key is never exported and cannot grant server authority. */
export async function sealOwnerRecovery(scope: ActiveOwnerLearningScope, binding: Binding, envelope: unknown) {
  const key = await signingKey(scope, binding);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonicalStringify(envelope)));
  await requireScope(scope);
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyOwnerRecoverySeal(scope: ActiveOwnerLearningScope, binding: Binding, envelope: unknown, seal: unknown) {
  if (typeof seal !== 'string' || !/^[a-f0-9]{64}$/.test(seal)) return false;
  await requireScope(scope);
  const key = await readSyncMeta<unknown>(keyName(binding));
  if (!validKey(key)) return false;
  const valid = await crypto.subtle.verify('HMAC', key, Uint8Array.from(seal.match(/../g)!, hex => parseInt(hex, 16)),
    new TextEncoder().encode(canonicalStringify(envelope)));
  await requireScope(scope);
  return valid;
}
