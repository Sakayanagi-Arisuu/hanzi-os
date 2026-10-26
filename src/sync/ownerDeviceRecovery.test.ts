import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createOwnerDeviceRecoveryArchive, ownerRecoveryLocalKeys, stageOwnerDeviceRecoveryArchive } from './ownerDeviceRecovery';
import { captureOwnerRecoverySnapshot, readActiveOwnerLearningScope, readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests, writeLessonResume, writeSyncMeta, type ActiveOwnerLearningScope } from './indexedDb';
import { saveGuestAvatar } from '../profile/avatarStorage';
import { getCharacterForgeSessionStorageKey, LEARNING_OWNER_STORAGE_KEY, LEARNING_STORAGE_KEY } from '../lib/storageKeys';
import { sha256Hex } from './canonicalHash';

let scope: ActiveOwnerLearningScope;
const binding = { installationId: 'recovery-test', deviceId: 'device-test' };
let values: Map<string, string>;
const storage = { getItem: (key: string) => values.get(key) ?? null };
async function clear() {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:recovery-device'); scope = (await readActiveOwnerLearningScope())!;
  values = new Map([[LEARNING_OWNER_STORAGE_KEY, scope.ownerGeneration.ownerKey], [LEARNING_STORAGE_KEY, '{raw-state'],
    [getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey), '{unknown-legacy-writing'], ['provider-token', 'never-export']]);
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('round-trips raw journals, version-unknown local resumes and binary media with per-resource integrity without writing', async () => {
  await writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0,
    entryKey: 'workspace-sync:v1', value: { version: 99, raw: 'retain' } });
  await writeSyncMeta('provider-token', 'idb-secret-never-export');
  await saveGuestAvatar(scope.ownerGeneration, 0, new Blob(['encoded-avatar'], { type: 'image/webp' }));
  const before = await captureOwnerRecoverySnapshot(scope);
  const localBefore = new Map(values);
  const source = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  expect(source).not.toMatch(/never-export|provider-token/);
  const staged = await stageOwnerDeviceRecoveryArchive(source, scope, binding);
  expect(staged.status).toBe('staged-only'); expect(staged.authority).toBe('untrusted-copy');
  expect(staged.restoreAuthenticity).toBe('same-installation-capture');
  expect(staged.manifest).toHaveLength(9);
  expect(staged.manifest.every(resource => resource.byteLength > 0 && /^[a-f0-9]{64}$/.test(resource.sha256))).toBe(true);
  expect(staged.local).toContainEqual({ key: getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey), value: '{unknown-legacy-writing' });
  expect(staged.snapshot.stores).toEqual(before.stores);
  const blob = (staged.snapshot.avatar as { value: { blob: Blob } }).value.blob;
  expect(await blob.text()).toBe('encoded-avatar');
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
  expect(values).toEqual(localBefore);
});

it('keeps legacy v1 and modified signatures inspect-only and rejects coerced versions', async () => {
  const source = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  const legacy = JSON.parse(source); legacy.version = 1; delete legacy.seal;
  expect((await stageOwnerDeviceRecoveryArchive(JSON.stringify(legacy), scope, binding)).restoreAuthenticity).toBe('unverified');
  const changed = JSON.parse(source); changed.seal = '0'.repeat(64);
  expect((await stageOwnerDeviceRecoveryArchive(JSON.stringify(changed), scope, binding)).restoreAuthenticity).toBe('unverified');
  for (const version of ['2', [2], true]) {
    await expect(stageOwnerDeviceRecoveryArchive(JSON.stringify({ ...JSON.parse(source), version }), scope, binding)).rejects.toThrow('integrity');
  }
});

it('does not read another owner or unowned global legacy storage, consent, credentials or recovery mirrors', async () => {
  values.set(LEARNING_OWNER_STORAGE_KEY, 'account:other');
  const read = vi.fn(storage.getItem);
  const source = await createOwnerDeviceRecoveryArchive(scope, binding, { getItem: read });
  const staged = await stageOwnerDeviceRecoveryArchive(source, scope, binding);
  expect(staged.local.some(entry => entry.key === LEARNING_STORAGE_KEY)).toBe(false);
  const known = new Set([...ownerRecoveryLocalKeys(scope), LEARNING_OWNER_STORAGE_KEY]);
  expect(read.mock.calls.every(([key]) => known.has(key))).toBe(true);
  expect(staged.exclusions).toContain('unowned-legacy-localStorage');
});

it('rejects changed sources/read errors, corruption, missing resources and cross-scope imports while keeping live data', async () => {
  const before = await captureOwnerRecoverySnapshot(scope);
  await expect(createOwnerDeviceRecoveryArchive(scope, binding, { getItem: () => { throw new Error('storage denied'); } })).rejects.toThrow('storage denied');
  let ownerReads = 0;
  await expect(createOwnerDeviceRecoveryArchive(scope, binding, { getItem: key => {
    if (key === LEARNING_OWNER_STORAGE_KEY && ++ownerReads === 2) values.set(LEARNING_STORAGE_KEY, 'changed-during-export');
    return storage.getItem(key);
  } })).rejects.toThrow('changed during capture');
  const source = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  const envelope = JSON.parse(source); envelope.payload.manifest[0].count++;
  await expect(stageOwnerDeviceRecoveryArchive(JSON.stringify(envelope), scope, binding)).rejects.toThrow('integrity');
  envelope.checksum = await sha256Hex(envelope.payload);
  await expect(stageOwnerDeviceRecoveryArchive(JSON.stringify(envelope), scope, binding)).rejects.toThrow('resource integrity');
  const missing = JSON.parse(source); missing.payload.local.pop(); missing.checksum = await sha256Hex(missing.payload);
  await expect(stageOwnerDeviceRecoveryArchive(JSON.stringify(missing), scope, binding)).rejects.toThrow();
  await expect(stageOwnerDeviceRecoveryArchive(source, scope, { ...binding, deviceId: 'other-device' })).rejects.toThrow('installation');
  await expect(stageOwnerDeviceRecoveryArchive(source, { ...scope, resetEpoch: 1 }, binding)).rejects.toThrow();
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});
