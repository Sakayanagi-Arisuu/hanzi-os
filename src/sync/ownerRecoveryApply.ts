import { avatarStorageKey } from '../profile/avatarContract';
import { LEARNING_OWNER_STORAGE_KEY, LEARNING_STORAGE_KEY } from '../lib/storageKeys';
import { readerProgressStorageKey } from '../reader/library/readerProgressStorage';
import { canonicalStringify, sha256Hex } from './canonicalHash';
import { ACTIVE_OWNER_GENERATION_KEY, OWNER_RECOVERY_STORES, SYNC_META_STORE, openSyncDatabase,
  type ActiveOwnerLearningScope, type OwnerRecoverySnapshot } from './indexedDb';
import { createOwnerRecoveryArchive, ownerRecoveryResourceIntegrity } from './ownerRecoveryArchive';
import { createOwnerDeviceRecoveryArchive, stageOwnerDeviceRecoveryArchive } from './ownerDeviceRecovery';
import { ACTIVE_OWNER_RECOVERY_KEY, ACTIVE_OWNER_RECOVERY_PREVIEW_KEY, announceOwnerRecovery, assertOwnerRecoveryIdle, recoveryJobKey,
  type OwnerRecoveryFence } from './ownerRecoveryFence';
import type { CloudSyncDocumentV1, SyncClock } from './types';

type Binding = { installationId: string; deviceId: string };
type LocalEntry = { key: string; value: string | null };
type LocalStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Image = { snapshot: OwnerRecoverySnapshot; local: LocalEntry[]; originalHeadClock?: SyncClock };
export type RecoveryJob = { version: 1; id: string; scope: ActiveOwnerLearningScope; generation: number;
  phase: 'applying-local' | 'awaiting-confirmation' | 'rolling-back-local' | 'rollback-ready'; before: Image; after: Image;
  beforeHash: string; afterHash: string };
export type RecoveryPreview = { version: 1; id: string; scope: ActiveOwnerLearningScope; binding: Binding; source: string; sourceHash: string };
const request = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
});

const transactionActivators = new WeakMap<IDBTransaction, () => Promise<void>>();
async function awaitExternal<T>(tx: IDBTransaction, pending: Promise<T>): Promise<T> {
  const value = await pending;
  const activate = transactionActivators.get(tx);
  if (!activate) throw Error('Recovery transaction ended; retain all data');
  // A pending request keeps a transaction alive, but a Worker/Web Crypto event
  // does not make it active. Resume from the next IndexedDB success callback.
  await activate();
  return value;
}

/** Keep this transaction alive while hashing Blob bytes; no partially written backup can commit. */
async function transaction<T>(work: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openSyncDatabase();
  const tx = db.transaction([SYNC_META_STORE, ...OWNER_RECOVERY_STORES], 'readwrite');
  let pumping = true;
  const waiters: { resolve: () => void; reject: (error: Error) => void }[] = [];
  transactionActivators.set(tx, () => new Promise<void>((resolve, reject) => {
    if (!pumping) reject(Error('Recovery transaction ended; retain all data'));
    else waiters.push({ resolve, reject });
  }));
  const stop = () => {
    pumping = false;
    transactionActivators.delete(tx);
    for (const waiter of waiters.splice(0)) waiter.reject(Error('Recovery transaction ended; retain all data'));
  };
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => { stop(); resolve(); };
    tx.onabort = tx.onerror = () => { stop(); reject(tx.error ?? Error('Recovery transaction aborted')); };
  });
  // Attach a rejection handler immediately, including when work is awaiting Web Crypto.
  void done.catch(() => undefined);
  const pump = () => {
    if (!pumping) return;
    const req = tx.objectStore(SYNC_META_STORE).get(ACTIVE_OWNER_RECOVERY_KEY);
    req.onsuccess = () => {
      pump();
      for (const waiter of waiters.splice(0)) waiter.resolve();
    };
  };
  pump();
  try { const value = await work(tx); pumping = false; await done; return value; }
  catch (error) { pumping = false; try { tx.abort(); } catch { /* Already aborted. */ } await done.catch(() => undefined); throw error; }
}

async function readImage(tx: IDBTransaction, scope: ActiveOwnerLearningScope): Promise<OwnerRecoverySnapshot> {
  const stores = Object.fromEntries(await Promise.all(OWNER_RECOVERY_STORES.map(async name => {
    const store = tx.objectStore(name);
    const rows = name === 'documents' || name === 'local-states'
      ? [await request(store.get(scope.ownerGeneration.ownerKey))].filter(row => row !== undefined)
      : await request(store.index('ownerKey').getAll(scope.ownerGeneration.ownerKey));
    return [name, rows];
  }))) as OwnerRecoverySnapshot['stores'];
  const avatar = await request(tx.objectStore(SYNC_META_STORE).get(avatarStorageKey(scope.ownerGeneration.ownerKey))) ?? null;
  return { version: 1, databaseVersion: tx.db.version, coverage: 'indexeddb-owner-only', scope, capturedAt: '', stores, avatar,
    excluded: ['localStorage', 'CacheStorage', 'authentication', 'global-device-metadata'] };
}
const fingerprint = (snapshot: OwnerRecoverySnapshot, tx?: IDBTransaction) => {
  const pending = ownerRecoveryResourceIntegrity({ stores: snapshot.stores, avatar: snapshot.avatar });
  return tx ? awaitExternal(tx, pending) : pending;
};

function profile(snapshot: OwnerRecoverySnapshot) {
  const docs = snapshot.stores.documents as { document?: { schemaVersion?: number; reset?: { epoch?: number }; profile?: unknown; state?: { profile?: unknown } } }[];
  const states = snapshot.stores['local-states'] as { state?: { profile?: unknown } }[];
  if (docs.length !== 1 || states.length !== 1 || docs[0].document?.schemaVersion !== 1
    || docs[0].document.reset?.epoch !== snapshot.scope.resetEpoch || !docs[0].document.profile
    || !docs[0].document.state?.profile || !states[0].state?.profile) throw Error('Unsupported primary recovery schema; retain sources');
  return { register: docs[0].document.profile, materialized: docs[0].document.state.profile, local: states[0].state.profile };
}

function preserveClock(source: OwnerRecoverySnapshot, current: OwnerRecoverySnapshot) {
  const row = source.stores.documents[0] as { document: CloudSyncDocumentV1 };
  const live = (current.stores.documents[0] as { document: CloudSyncDocumentV1 }).document;
  const valid = (clock: SyncClock) => clock && Number.isSafeInteger(clock.counter) && clock.counter >= 0
    && typeof clock.operationId === 'string' && typeof clock.observedAt === 'string' && Number.isFinite(Date.parse(clock.observedAt));
  if (!valid(row.document.clock) || !valid(live.clock)
    || canonicalStringify(row.document.reset) !== canonicalStringify(live.reset)) throw Error('Recovery clock/reset schema is incompatible');
  // Preserve the local Lamport high-water mark. Original request documents and
  // their hashes remain byte-for-byte intact in outbox; no grant is synthesized.
  const clock = row.document.clock.counter > live.clock.counter ? row.document.clock : live.clock;
  return { originalHeadClock: structuredClone(row.document.clock), snapshot: { ...source, stores: { ...source.stores,
    documents: [{ ...row, document: { ...row.document, clock: structuredClone(clock) } }] } } };
}

function readerKey(scope: ActiveOwnerLearningScope, generation = scope.ownerGeneration.generation) {
  return readerProgressStorageKey({ ownerKey: scope.ownerGeneration.ownerKey, ownerGeneration: generation, resetEpoch: scope.resetEpoch });
}
function remapLocal(image: Image, generation: number): LocalEntry[] {
  return image.local.map(entry => {
    if (entry.key !== readerKey(image.snapshot.scope)) return entry;
    const key = readerKey(image.snapshot.scope, generation);
    if (entry.value === null) return { key, value: null };
    const value = JSON.parse(entry.value);
    if (!value || value.schemaVersion !== 2 || value.ownerKey !== image.snapshot.scope.ownerGeneration.ownerKey
      || value.ownerGeneration !== image.snapshot.scope.ownerGeneration.generation || value.resetEpoch !== image.snapshot.scope.resetEpoch) {
      throw Error('Unknown Reader schema; retain original source');
    }
    return { key, value: JSON.stringify({ ...value, ownerGeneration: generation }) };
  });
}

export async function prepareOwnerRecovery(source: string, scope: ActiveOwnerLearningScope, binding: Binding, storage: LocalStore = localStorage) {
  if (!scope.ownerGeneration.ownerKey.startsWith('anonymous:')) throw Error('Account recovery needs its server adapter');
  const staged = await stageOwnerDeviceRecoveryArchive(source, scope, binding);
  if (staged.restoreAuthenticity !== 'same-installation-capture') throw Error('Recovery source is inspect-only');
  const currentSource = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  const current = await stageOwnerDeviceRecoveryArchive(currentSource, scope, binding);
  if (canonicalStringify(profile(staged.snapshot)) !== canonicalStringify(profile(current.snapshot))) {
    throw Error('Profile or consent changed; historical preferences must not be restored');
  }
  // Do not revive pending snapshots with older consent or profile registers.
  for (const row of staged.snapshot.stores.outbox as { document?: { profile?: unknown } }[]) {
    if (canonicalStringify(row.document?.profile) !== canonicalStringify(profile(current.snapshot).register)) throw Error('Pending profile is incompatible');
  }
  const mirror = staged.local.find(entry => entry.key === LEARNING_STORAGE_KEY)?.value;
  if (mirror !== undefined && mirror !== null) {
    const value = JSON.parse(mirror);
    if (!value || canonicalStringify(value.profile) !== canonicalStringify(profile(current.snapshot).local)) throw Error('Primary mirror profile is incompatible');
  }
  const before: Image = { snapshot: current.snapshot, local: current.local };
  const after: Image = { ...preserveClock(staged.snapshot, current.snapshot), local: staged.local };
  if (storage.getItem(readerKey(scope, scope.ownerGeneration.generation + 1)) !== null) throw Error('Newer Reader generation already exists; retain source');
  remapLocal(before, scope.ownerGeneration.generation + 1); remapLocal(after, scope.ownerGeneration.generation + 1);
  return { digest: await sha256Hex({ source: await sha256Hex(source), idb: (await fingerprint(before.snapshot)).sha256, local: before.local }), before, after,
    count: staged.manifest.reduce((sum, row) => sum + row.count, 0) };
}

async function requireOwner(tx: IDBTransaction, scope: ActiveOwnerLearningScope, generation: number) {
  const row = await request(tx.objectStore(SYNC_META_STORE).get(ACTIVE_OWNER_GENERATION_KEY));
  if (row?.value?.ownerKey !== scope.ownerGeneration.ownerKey || row.value.generation !== generation) throw Error('Recovery owner changed');
  const document = await request(tx.objectStore('documents').get(scope.ownerGeneration.ownerKey));
  if (document?.document?.reset?.epoch !== scope.resetEpoch) throw Error('Recovery reset changed');
}

async function replaceImage(tx: IDBTransaction, snapshot: OwnerRecoverySnapshot) {
  const ownerKey = snapshot.scope.ownerGeneration.ownerKey;
  for (const name of OWNER_RECOVERY_STORES) {
    const store = tx.objectStore(name);
    if (typeof store.keyPath !== 'string') throw Error('Unknown recovery key schema');
    const keyPath = store.keyPath;
    const keys = new Set<string>();
    for (const raw of snapshot.stores[name]) {
      const row = raw as Record<string, unknown>;
      if (!row || row.ownerKey !== ownerKey || typeof row[keyPath] !== 'string' || keys.has(row[keyPath] as string)) throw Error('Invalid recovery row key');
      keys.add(row[keyPath] as string);
      const existing = await request(store.get(row[keyPath] as string));
      if (existing && existing.ownerKey !== ownerKey) throw Error('Recovery key belongs to another owner');
    }
    const oldKeys = name === 'documents' || name === 'local-states' ? [ownerKey]
      : await request(store.index('ownerKey').getAllKeys(ownerKey));
    for (const key of oldKeys) store.delete(key);
    for (const row of snapshot.stores[name]) store.put(row);
  }
  const meta = tx.objectStore(SYNC_META_STORE), key = avatarStorageKey(ownerKey);
  if (snapshot.avatar === null) meta.delete(key); else meta.put(snapshot.avatar);
}

export async function beginOwnerRecovery(source: string, scope: ActiveOwnerLearningScope, binding: Binding, expectedDigest: string, storage: LocalStore = localStorage, previewId?: string) {
  const prepared = await prepareOwnerRecovery(source, scope, binding, storage);
  if (prepared.digest !== expectedDigest) throw Error('Recovery preview is stale; review again');
  const generation = scope.ownerGeneration.generation + 1;
  if (!Number.isSafeInteger(generation)) throw Error('Recovery generation exhausted');
  const job: RecoveryJob = { version: 1, id: crypto.randomUUID(), scope, generation, phase: 'applying-local', before: prepared.before, after: prepared.after,
    beforeHash: (await ownerRecoveryResourceIntegrity(prepared.before)).sha256, afterHash: (await ownerRecoveryResourceIntegrity(prepared.after)).sha256 };
  await transaction(async tx => {
    if (previewId) {
      const preview = await readPreview(tx);
      if (!preview || preview.id !== previewId || preview.sourceHash !== await awaitExternal(tx, sha256Hex(source))
        || canonicalStringify(preview.binding) !== canonicalStringify(binding)
        || canonicalStringify(preview.scope) !== canonicalStringify(scope)) throw Error('Recovery preview changed');
      // The same transaction replaces the preview fence with the durable job.
      tx.objectStore(SYNC_META_STORE).delete(ACTIVE_OWNER_RECOVERY_PREVIEW_KEY);
    }
    await assertOwnerRecoveryIdle(tx.objectStore(SYNC_META_STORE)); await requireOwner(tx, scope, scope.ownerGeneration.generation);
    if ((await fingerprint(await readImage(tx, scope), tx)).sha256 !== (await fingerprint(job.before.snapshot, tx)).sha256
      || job.before.local.some(entry => storage.getItem(entry.key) !== entry.value)
      || storage.getItem(readerKey(scope, generation)) !== null
      || storage.getItem(LEARNING_OWNER_STORAGE_KEY) !== scope.ownerGeneration.ownerKey) throw Error('Recovery sources changed; review again');
    await replaceImage(tx, job.after.snapshot);
    const meta = tx.objectStore(SYNC_META_STORE);
    meta.put({ key: recoveryJobKey(job.id), value: job });
    meta.put({ key: ACTIVE_OWNER_GENERATION_KEY, value: { ownerKey: scope.ownerGeneration.ownerKey, generation } });
    meta.put({ key: ACTIVE_OWNER_RECOVERY_KEY, value: { version: 1, ownerKey: scope.ownerGeneration.ownerKey, generation, jobId: job.id } satisfies OwnerRecoveryFence });
  });
  announceOwnerRecovery();
  return job.id;
}

async function readJob(tx: IDBTransaction, verifyPayload = true): Promise<RecoveryJob | null> {
  const meta = tx.objectStore(SYNC_META_STORE), flag = await request(meta.get(ACTIVE_OWNER_RECOVERY_KEY));
  if (!flag) return null;
  const fence = flag.value as OwnerRecoveryFence;
  const job = (await request(meta.get(recoveryJobKey(fence?.jobId))))?.value as RecoveryJob;
  if (!job || job.version !== 1 || job.id !== fence.jobId || job.generation !== fence.generation
    || job.scope.ownerGeneration.ownerKey !== fence.ownerKey
    || !['applying-local', 'awaiting-confirmation', 'rolling-back-local', 'rollback-ready'].includes(job.phase)) throw Error('Unknown recovery job; retain all metadata');
  if (verifyPayload && ((await awaitExternal(tx, ownerRecoveryResourceIntegrity(job.before))).sha256 !== job.beforeHash
    || (await awaitExternal(tx, ownerRecoveryResourceIntegrity(job.after))).sha256 !== job.afterHash)) throw Error('Recovery job integrity changed; retain all metadata');
  await requireOwner(tx, job.scope, job.generation);
  return job;
}
export const readPendingOwnerRecovery = () => transaction(tx => readJob(tx));

async function readPreview(tx: IDBTransaction): Promise<RecoveryPreview | null> {
  const row = await request(tx.objectStore(SYNC_META_STORE).get(ACTIVE_OWNER_RECOVERY_PREVIEW_KEY));
  if (!row) return null;
  const preview = row.value as RecoveryPreview;
  if (!preview || preview.version !== 1 || typeof preview.id !== 'string' || !preview.id
    || typeof preview.source !== 'string' || preview.source.length > 128 * 1024 * 1024
    || preview.sourceHash !== await awaitExternal(tx, sha256Hex(preview.source)) || !preview.scope || !preview.binding) {
    throw Error('Unknown recovery preview; retain original metadata');
  }
  await requireOwner(tx, preview.scope, preview.scope.ownerGeneration.generation);
  return preview;
}

/** The status is one snapshot: never briefly mount a learner between preview and apply. */
export const readOwnerRecoveryStatus = () => transaction(async tx => {
  // Status grants no writes or learner access while a fence exists. Every
  // continue/rollback/finish/export still verifies the complete payload. Avoid
  // re-encoding large immutable preimages on each window focus just to show a label.
  const job = await readJob(tx, false), preview = await readPreview(tx);
  if (job && preview) throw Error('Recovery fences conflict; retain both copies');
  return { job: job ? { id: job.id, phase: job.phase } : null, preview };
});

export async function openOwnerRecoveryPreview(source: string, scope: ActiveOwnerLearningScope, binding: Binding) {
  if (!scope.ownerGeneration.ownerKey.startsWith('anonymous:')) throw Error('Account recovery needs its server adapter');
  const staged = await stageOwnerDeviceRecoveryArchive(source, scope, binding);
  if (staged.restoreAuthenticity !== 'same-installation-capture') throw Error('Recovery source is inspect-only');
  const preview: RecoveryPreview = { version: 1, id: crypto.randomUUID(), source, scope: structuredClone(scope),
    binding: structuredClone(binding), sourceHash: await sha256Hex(source) };
  await transaction(async tx => {
    await assertOwnerRecoveryIdle(tx.objectStore(SYNC_META_STORE));
    await requireOwner(tx, scope, scope.ownerGeneration.generation);
    tx.objectStore(SYNC_META_STORE).put({ key: ACTIVE_OWNER_RECOVERY_PREVIEW_KEY, value: preview });
  });
  announceOwnerRecovery();
}

export async function cancelOwnerRecoveryPreview() {
  await transaction(async tx => {
    if (await readJob(tx)) throw Error('An applied recovery must be rolled back');
    const preview = await readPreview(tx); if (!preview) return;
    tx.objectStore(SYNC_META_STORE).delete(ACTIVE_OWNER_RECOVERY_PREVIEW_KEY);
  });
  announceOwnerRecovery();
}

export async function exportPendingRecoveryPreimage(binding: Binding) {
  const job = await readPendingOwnerRecovery();
  if (!job) throw Error('No pending recovery');
  return canonicalStringify({ format: 'hanzi-recovery-preimage', version: 1,
    idb: await createOwnerRecoveryArchive(job.before.snapshot, binding), local: job.before.local,
    warning: 'Retained preimage for inspection; not a new authority or directly replayable device archive.' });
}

/** Repeatable CAS per key. A foreign/newer value is never overwritten. */
export async function continueOwnerRecovery(storage: LocalStore = localStorage) {
  await transaction(async tx => {
    const job = await readJob(tx); if (!job) return;
    if (storage.getItem(LEARNING_OWNER_STORAGE_KEY) !== job.scope.ownerGeneration.ownerKey) throw Error('Local recovery owner changed');
    const rollback = job.phase === 'rolling-back-local' || job.phase === 'rollback-ready';
    const target = remapLocal(rollback ? job.before : job.after, job.generation);
    const origin = remapLocal(rollback ? job.after : job.before, job.generation);
    for (const entry of target) {
      const original = !rollback && entry.key === readerKey(job.scope, job.generation) ? null
        : origin.find(item => item.key === entry.key)?.value ?? null;
      const current = storage.getItem(entry.key);
      if (current !== original && current !== entry.value
        && !(entry.key === readerKey(job.scope, job.generation) && current === null)) throw Error('Newer local data found; keep recovery paused');
      if (entry.value === null) storage.removeItem(entry.key); else storage.setItem(entry.key, entry.value);
    }
    job.phase = rollback ? 'rollback-ready' : 'awaiting-confirmation';
    tx.objectStore(SYNC_META_STORE).put({ key: recoveryJobKey(job.id), value: job });
  });
  announceOwnerRecovery();
}

export async function rollBackOwnerRecovery() {
  await transaction(async tx => {
    const job = await readJob(tx); if (!job || job.phase === 'rolling-back-local' || job.phase === 'rollback-ready') return;
    if ((await fingerprint(await readImage(tx, job.scope), tx)).sha256 !== (await fingerprint(job.after.snapshot, tx)).sha256) throw Error('Recovery data changed; retain both copies');
    await replaceImage(tx, job.before.snapshot);
    job.phase = 'rolling-back-local';
    tx.objectStore(SYNC_META_STORE).put({ key: recoveryJobKey(job.id), value: job });
  });
  announceOwnerRecovery();
}

export async function finishOwnerRecovery(storage: LocalStore = localStorage) {
  await transaction(async tx => {
    const job = await readJob(tx); if (!job) return;
    if (job.phase !== 'awaiting-confirmation' && job.phase !== 'rollback-ready') throw Error('Recovery local writes are incomplete');
    const target = job.phase === 'rollback-ready' ? job.before : job.after;
    if ((await fingerprint(await readImage(tx, job.scope), tx)).sha256 !== (await fingerprint(target.snapshot, tx)).sha256
      || storage.getItem(LEARNING_OWNER_STORAGE_KEY) !== job.scope.ownerGeneration.ownerKey
      || remapLocal(target, job.generation).some(entry => storage.getItem(entry.key) !== entry.value)) throw Error('Recovery verification failed; retain preimage');
    // Keep the durable job/preimage for inspection. Only the active fence is cleared.
    tx.objectStore(SYNC_META_STORE).delete(ACTIVE_OWNER_RECOVERY_KEY);
  });
  announceOwnerRecovery();
}
