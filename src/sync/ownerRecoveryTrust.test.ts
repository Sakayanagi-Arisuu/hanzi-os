import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { sealOwnerRecovery, verifyOwnerRecoverySeal } from './ownerRecoveryTrust';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, readSyncMeta, resetSyncDatabaseForTests, writeSyncMeta,
  type ActiveOwnerLearningScope } from './indexedDb';
let scope: ActiveOwnerLearningScope;
const binding = { installationId: 'trust-test', deviceId: 'device-test' };
const key = `owner-recovery-seal:v1:${JSON.stringify(binding.installationId)}`;
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>((resolve, reject) => {
  const req = indexedDB.deleteDatabase('hanzi-os-sync-v1'); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
}); };
beforeEach(async () => { await clear(); await readOrInitializeOwnerGeneration('anonymous:trust'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(clear);
it('shares one nonextractable key under concurrent captures and detects recomputed payload changes', async () => {
  const envelope = { version: 2, payload: 'original', checksum: 'recomputed-checksum-is-not-authority' };
  const signatures = await Promise.all(Array.from({ length: 5 }, () => sealOwnerRecovery(scope, binding, envelope)));
  expect(new Set(signatures).size).toBe(1);
  expect(await verifyOwnerRecoverySeal(scope, binding, envelope, signatures[0])).toBe(true);
  expect(await verifyOwnerRecoverySeal(scope, binding, { ...envelope, payload: 'changed', checksum: 'new-valid-checksum' }, signatures[0])).toBe(false);
  const saved = (await readSyncMeta<CryptoKey>(key))!;
  expect(saved.extractable).toBe(false);
  await expect(crypto.subtle.exportKey('raw', saved)).rejects.toThrow();
});
it('does not rotate unknown keys or manufacture trust when a key is missing', async () => {
  expect(await verifyOwnerRecoverySeal(scope, binding, {}, '0'.repeat(64))).toBe(false);
  expect(await readSyncMeta(key)).toBeNull();
  await writeSyncMeta(key, { version: 99, raw: 'retain-original' });
  expect(await verifyOwnerRecoverySeal(scope, binding, {}, '0'.repeat(64))).toBe(false);
  await expect(sealOwnerRecovery(scope, binding, {})).rejects.toThrow('Unknown recovery seal');
  expect(await readSyncMeta(key)).toEqual({ version: 99, raw: 'retain-original' });
});
it('rejects owner/reset changes without creating a signing key', async () => {
  await expect(sealOwnerRecovery({ ...scope, resetEpoch: 1 }, binding, {})).rejects.toThrow();
  await expect(sealOwnerRecovery({ ...scope, ownerGeneration: { ...scope.ownerGeneration, generation: 2 } }, binding, {})).rejects.toThrow();
  expect(await readSyncMeta(key)).toBeNull();
});
