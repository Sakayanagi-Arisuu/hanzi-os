import { openSyncDatabase, ACTIVE_OWNER_GENERATION_KEY, SYNC_META_STORE, StaleOwnerGenerationError, type OwnerGeneration } from '../sync/indexedDb';
import { avatarStorageKey, parseAvatarRecord, type AvatarRecord } from './avatarContract';
import { assertOwnerRecoveryIdle } from '../sync/ownerRecoveryFence';

export const AVATAR_CHANGED = 'hanzi-avatar-changed';
const requestValue = <Value>(request: IDBRequest<Value>) => new Promise<Value>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const completed = (transaction: IDBTransaction) => new Promise<void>((resolve, reject) => {
  transaction.oncomplete = () => resolve(); transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Avatar transaction failed'));
});
async function requireOwner(store: IDBObjectStore, owner: OwnerGeneration) {
  await assertOwnerRecoveryIdle(store);
  const active = await requestValue(store.get(ACTIVE_OWNER_GENERATION_KEY)) as { value?: OwnerGeneration } | undefined;
  if (active?.value?.ownerKey !== owner.ownerKey || active.value.generation !== owner.generation) throw new StaleOwnerGenerationError();
}
export async function readAvatar(owner: OwnerGeneration) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(SYNC_META_STORE, 'readonly'), done = completed(transaction);
  try {
    const store = transaction.objectStore(SYNC_META_STORE);
    await requireOwner(store, owner);
    const saved = await requestValue(store.get(avatarStorageKey(owner.ownerKey))) as { value?: unknown } | undefined;
    const record = parseAvatarRecord(saved?.value, owner.ownerKey);
    await done; return record;
  } catch (error) { try { transaction.abort(); } catch { await done.catch(() => undefined); } await done.catch(() => undefined); throw error; }
}
/** Server-validated account media only. This derived private cache grants no
 * authentication or upload permission and cannot replace a newer revision. */
export async function cacheAccountAvatar(owner: OwnerGeneration, record: AvatarRecord | null) {
  if (owner.ownerKey.startsWith('anonymous:')) throw Error('Account cache cannot adopt guest media');
  if (record !== null) parseAvatarRecord(record, owner.ownerKey);
  const database = await openSyncDatabase();
  const transaction = database.transaction(SYNC_META_STORE, 'readwrite'), done = completed(transaction);
  try {
    const store = transaction.objectStore(SYNC_META_STORE);
    await requireOwner(store, owner);
    const key = avatarStorageKey(owner.ownerKey);
    const saved = await requestValue(store.get(key)) as { value?: unknown } | undefined;
    const previous = parseAvatarRecord(saved?.value, owner.ownerKey);
    const selected = (previous?.revision ?? 0) > (record?.revision ?? 0) ? previous : record;
    if (selected !== null && selected === record) store.put({ key, value: record });
    await done;
    return selected;
  } catch (error) { try { transaction.abort(); } catch { await done.catch(() => undefined); } await done.catch(() => undefined); throw error; }
}

export async function saveGuestAvatar(owner: OwnerGeneration, expectedRevision: number, blob: Blob | null) {
  if (!owner.ownerKey.startsWith('anonymous:')) throw new Error('Ảnh tài khoản cần adapter máy chủ; chưa gửi ảnh lên cloud.');
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER) throw new Error('Avatar revision is invalid');
  const record: AvatarRecord = { version: 1, ownerKey: owner.ownerKey, revision: expectedRevision + 1,
    updatedAt: new Date().toISOString(), blob };
  parseAvatarRecord(record, owner.ownerKey);
  const database = await openSyncDatabase();
  const transaction = database.transaction(SYNC_META_STORE, 'readwrite'), done = completed(transaction);
  try {
    const store = transaction.objectStore(SYNC_META_STORE);
    await requireOwner(store, owner);
    const key = avatarStorageKey(owner.ownerKey);
    const saved = await requestValue(store.get(key)) as { value?: unknown } | undefined;
    const previous = parseAvatarRecord(saved?.value, owner.ownerKey);
    if ((previous?.revision ?? 0) !== expectedRevision) throw new Error('Ảnh đã đổi ở cửa sổ khác. Mở lại ảnh mới nhất rồi thử lại.');
    store.put({ key, value: record });
    await done;
  } catch (error) { try { transaction.abort(); } catch { await done.catch(() => undefined); } await done.catch(() => undefined); throw error; }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AVATAR_CHANGED));
  if (typeof BroadcastChannel !== 'undefined') {
    try { const channel = new BroadcastChannel(AVATAR_CHANGED); channel.postMessage(owner.ownerKey); channel.close(); }
    catch { if (typeof window !== 'undefined') window.dispatchEvent(new Event(AVATAR_CHANGED)); }
  }
  return record;
}
