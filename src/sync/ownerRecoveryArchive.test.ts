import { expect, it } from 'vitest';
import { OWNER_RECOVERY_STORES, type OwnerRecoverySnapshot } from './indexedDb';
import { createOwnerRecoveryArchive, stageOwnerRecoveryArchive } from './ownerRecoveryArchive';
import { sha256Hex } from './canonicalHash';
import { avatarStorageKey } from '../profile/avatarContract';

const binding = { installationId: 'test-install', deviceId: 'test-device' };
const scope = { ownerGeneration: { ownerKey: 'anonymous:test', generation: 2 }, resetEpoch: 3 };
const snapshot = (): OwnerRecoverySnapshot => ({ version: 1, databaseVersion: 3, coverage: 'indexeddb-owner-only', scope,
  capturedAt: '2026-10-20T00:00:00Z', stores: Object.fromEntries(OWNER_RECOVERY_STORES.map(name => [name, [] as unknown[]])) as OwnerRecoverySnapshot['stores'],
  avatar: null, excluded: ['localStorage', 'CacheStorage', 'authentication', 'global-device-metadata'] });

it('round-trips frozen raw values, pending command identity and binary media without writing or granting authority', async () => {
  const source = snapshot();
  source.stores['lesson-resumes'].push({ ownerKey: scope.ownerGeneration.ownerKey, entryKey: 'unknown:v99',
    value: { version: 99, unset: undefined, array: [undefined, null, false], pendingId: 'original-id',
      kind: 'blob', hex: 'this is ordinary raw data' } });
  source.avatar = { key: avatarStorageKey(scope.ownerGeneration.ownerKey), value: { version: 1, ownerKey: scope.ownerGeneration.ownerKey,
    revision: 2, updatedAt: '2026-10-20T00:00:00Z', blob: new Blob([new Uint8Array([0, 127, 128, 255])], { type: 'image/webp' }) } };
  const archive = await createOwnerRecoveryArchive(source, binding);
  const staged = await stageOwnerRecoveryArchive(archive, scope, binding);
  expect(staged).toMatchObject({ status: 'staged-only', authority: 'untrusted-copy', snapshot: { coverage: 'indexeddb-owner-only' } });
  expect(staged.snapshot.stores).toEqual(source.stores);
  const media = staged.snapshot.avatar as { value: { blob: Blob } };
  expect(media.value.blob.type).toBe('image/webp');
  expect([...new Uint8Array(await media.value.blob.arrayBuffer())]).toEqual([0, 127, 128, 255]);
  expect(staged.warnings).toContain('No data has been written.');
});

it('rejects corruption, unknown format/schema, installation, owner/reset/generation and other-owner rows', async () => {
  const source = snapshot();
  const archive = await createOwnerRecoveryArchive(source, binding);
  const tampered = JSON.parse(archive);
  tampered.payload.binding.deviceId = 'tampered';
  await expect(stageOwnerRecoveryArchive(JSON.stringify(tampered), scope, binding)).rejects.toThrow('integrity');
  await expect(stageOwnerRecoveryArchive(archive, scope, { ...binding, deviceId: 'another-device' })).rejects.toThrow('installation');
  for (const changed of [{ ...scope, resetEpoch: 4 }, { ...scope, ownerGeneration: { ...scope.ownerGeneration, generation: 3 } },
    { ...scope, ownerGeneration: { ...scope.ownerGeneration, ownerKey: 'account:other' } }]) {
    await expect(stageOwnerRecoveryArchive(archive, changed, binding)).rejects.toThrow('scope/schema');
  }
  source.stores.outbox.push({ ownerKey: 'account:other', operationId: 'forged' });
  await expect(stageOwnerRecoveryArchive(await createOwnerRecoveryArchive(source, binding), scope, binding)).rejects.toThrow('another owner');
  const incompatible = snapshot(); incompatible.databaseVersion = 99;
  await expect(stageOwnerRecoveryArchive(await createOwnerRecoveryArchive(incompatible, binding), scope, binding)).rejects.toThrow('scope/schema');
  const unknown = JSON.parse(archive); unknown.version = 99;
  await expect(stageOwnerRecoveryArchive(JSON.stringify(unknown), scope, binding)).rejects.toThrow('integrity');
});

it('preserves source by rejecting unsupported/cyclic values instead of silently dropping them and detects malformed encoding', async () => {
  const source = snapshot();
  source.stores.outbox.push({ ownerKey: scope.ownerGeneration.ownerKey, unsupported: new Date() });
  await expect(createOwnerRecoveryArchive(source, binding)).rejects.toThrow('Unsupported');
  source.stores.outbox = [source];
  await expect(createOwnerRecoveryArchive(source, binding)).rejects.toThrow('Unsupported');
  const envelope = JSON.parse(await createOwnerRecoveryArchive(snapshot(), binding));
  envelope.payload.data = { kind: 'blob', mime: 'image/webp', hex: 'not-hex' };
  envelope.checksum = await sha256Hex(envelope.payload);
  await expect(stageOwnerRecoveryArchive(JSON.stringify(envelope), scope, binding)).rejects.toThrow('encoding');
});
