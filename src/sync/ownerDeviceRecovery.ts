import { getCharacterForgeSessionStorageKey, getOwnedPlacementStorageKey, getPlacementGateSessionStorageKey,
  HSK_LEVEL_CHECK_SESSION_STORAGE_KEYS, LEARNING_OWNER_STORAGE_KEY, LEARNING_STORAGE_KEY } from '../lib/storageKeys';
import { integratedJourneyStorageKey } from '../learning/integratedJourney';
import { readerProgressStorageKey } from '../reader/library/readerProgressStorage';
import { canonicalStringify, sha256Hex } from './canonicalHash';
import { assertOwnerRecoveryScope, captureOwnerRecoverySnapshot, type ActiveOwnerLearningScope, type OwnerRecoverySnapshot } from './indexedDb';
import { createOwnerRecoveryArchive, ownerRecoveryResourceIntegrity, stageOwnerRecoveryArchive } from './ownerRecoveryArchive';
import { sealOwnerRecovery, verifyOwnerRecoverySeal } from './ownerRecoveryTrust';
import { compressRecoverySource, decompressRecoverySource } from './recoveryCompression';

type Binding = { installationId: string; deviceId: string };
type StorageReader = Pick<Storage, 'getItem'>;
type LocalEntry = { key: string; value: string | null };
type Resource = { name: string; count: number; byteLength: number; sha256: string };
const MAX_DEVICE_ARCHIVE_CHARS = 128 * 1024 * 1024;
const exclusions = ['authentication', 'unowned-legacy-localStorage', 'global-device-preferences', 'CacheStorage-rebuildable-content',
  'native-keystore-and-files', 'other-owners'] as const;

export function ownerRecoveryLocalKeys(scope: ActiveOwnerLearningScope) {
  const ownerKey = scope.ownerGeneration.ownerKey;
  return [...new Set([getCharacterForgeSessionStorageKey(ownerKey),
    ...HSK_LEVEL_CHECK_SESSION_STORAGE_KEYS.flatMap(key => [getOwnedPlacementStorageKey(key, ownerKey),
      getOwnedPlacementStorageKey(getPlacementGateSessionStorageKey(key), ownerKey)]),
    integratedJourneyStorageKey(`${ownerKey}:${scope.resetEpoch}`),
    readerProgressStorageKey({ ownerKey, ownerGeneration: scope.ownerGeneration.generation, resetEpoch: scope.resetEpoch }),
  ])].sort();
}

function captureLocal(scope: ActiveOwnerLearningScope, storage: StorageReader): LocalEntry[] {
  const keys = ownerRecoveryLocalKeys(scope);
  // The global primary mirror is attributable only while its explicit owner matches.
  if (storage.getItem(LEARNING_OWNER_STORAGE_KEY) === scope.ownerGeneration.ownerKey) keys.push(LEARNING_STORAGE_KEY);
  return keys.sort().map(key => ({ key, value: storage.getItem(key) }));
}
const comparableSnapshot = (snapshot: OwnerRecoverySnapshot) => ({ scope: snapshot.scope,
  databaseVersion: snapshot.databaseVersion, stores: snapshot.stores, avatar: snapshot.avatar });

async function resources(snapshot: OwnerRecoverySnapshot, local: LocalEntry[]): Promise<Resource[]> {
  const result: Resource[] = [];
  for (const [name, rows] of Object.entries(snapshot.stores)) result.push({ name: `idb:${name}`, count: rows.length,
    ...await ownerRecoveryResourceIntegrity(rows) });
  result.push({ name: 'idb:owner-avatar', count: snapshot.avatar === null ? 0 : 1,
    ...await ownerRecoveryResourceIntegrity(snapshot.avatar) });
  result.push({ name: 'localStorage:known-owner-keys', count: local.filter(entry => entry.value !== null).length,
    ...await ownerRecoveryResourceIntegrity(local) });
  return result;
}

// Release the first raw snapshot before acquiring the second observation.
async function captureEncoded(scope: ActiveOwnerLearningScope, binding: Binding, local: LocalEntry[]) {
  const snapshot = await captureOwnerRecoverySnapshot(scope);
  return { digest: await ownerRecoveryResourceIntegrity(comparableSnapshot(snapshot)),
    idb: await createOwnerRecoveryArchive(snapshot, binding), manifest: await resources(snapshot, local) };
}

async function captureDigest(scope: ActiveOwnerLearningScope) {
  const snapshot = await captureOwnerRecoverySnapshot(scope);
  return ownerRecoveryResourceIntegrity(comparableSnapshot(snapshot));
}

/** Two stable observations detect intervening writes; no cross-storage atomicity is claimed. */
export async function createOwnerDeviceRecoveryArchive(scope: ActiveOwnerLearningScope, binding: Binding,
  storage: StorageReader = localStorage) {
  const local = captureLocal(scope, storage);
  const first = await captureEncoded(scope, binding, local);
  const after = await captureDigest(scope);
  if (canonicalStringify(local) !== canonicalStringify(captureLocal(scope, storage))
    || first.digest.sha256 !== after.sha256) {
    throw new Error('Recovery sources changed during capture; retain all data and retry.');
  }
  const compressed = await compressRecoverySource(first.idb);
  const payload = { idb: compressed ?? first.idb, local, manifest: first.manifest, consistency: 'stable-observations-not-cross-storage-atomic', exclusions };
  const envelope = { format: 'hanzi-owner-device-recovery', version: compressed ? 3 : 2,
    payload, checksum: await sha256Hex(payload) };
  const archive = canonicalStringify({ ...envelope, seal: await sealOwnerRecovery(scope, binding, envelope) });
  if (archive.length > MAX_DEVICE_ARCHIVE_CHARS || new Blob([archive]).size > MAX_DEVICE_ARCHIVE_CHARS) throw new Error('Recovery archive exceeds supported size; retain source.');
  return archive;
}

export async function stageOwnerDeviceRecoveryArchive(source: string, scope: ActiveOwnerLearningScope, binding: Binding) {
  if (source.length > MAX_DEVICE_ARCHIVE_CHARS || new Blob([source]).size > MAX_DEVICE_ARCHIVE_CHARS) throw new Error('Recovery archive exceeds supported size.');
  const envelope = JSON.parse(source) as { format?: unknown; version?: unknown; checksum?: unknown; seal?: unknown;
    payload?: { idb?: unknown; local?: unknown; manifest?: unknown; consistency?: unknown; exclusions?: unknown } };
  if (!envelope || envelope.format !== 'hanzi-owner-device-recovery' || ![1,2,3].includes(envelope.version as number)
    || Object.keys(envelope).sort().join() !== (envelope.version === 1 ? 'checksum,format,payload,version' : 'checksum,format,payload,seal,version') || !envelope.payload
    || Object.keys(envelope.payload).sort().join() !== 'consistency,exclusions,idb,local,manifest'
    || envelope.payload.consistency !== 'stable-observations-not-cross-storage-atomic'
    || canonicalStringify(envelope.payload.exclusions) !== canonicalStringify(exclusions)
    || typeof envelope.checksum !== 'string' || await sha256Hex(envelope.payload) !== envelope.checksum
    || (envelope.version !== 3 && typeof envelope.payload.idb !== 'string') || !Array.isArray(envelope.payload.local)) throw new Error('Recovery manifest/integrity is invalid.');
  const allowed = new Set([...ownerRecoveryLocalKeys(scope), LEARNING_STORAGE_KEY]);
  const local = envelope.payload.local as LocalEntry[];
  if (local.some(entry => !entry || typeof entry.key !== 'string' || !allowed.has(entry.key)
    || Object.keys(entry).sort().join() !== 'key,value'
    || entry.value !== null && typeof entry.value !== 'string') || new Set(local.map(entry => entry.key)).size !== local.length
    || ownerRecoveryLocalKeys(scope).some(key => !local.some(entry => entry.key === key))) throw new Error('Recovery local storage scope is invalid.');
  const idb = envelope.version === 3 ? await decompressRecoverySource(envelope.payload.idb) : envelope.payload.idb as string;
  const staged = await stageOwnerRecoveryArchive(idb, scope, binding);
  const expected = await resources(staged.snapshot, local);
  if (canonicalStringify(expected) !== canonicalStringify(envelope.payload.manifest)) throw new Error('Recovery resource integrity is invalid.');
  // Revalidate the live owner/reset after asynchronous checks. Staging never writes any store.
  await assertOwnerRecoveryScope(scope);
  const { seal, ...signed } = envelope;
  const authentic = envelope.version !== 1 && await verifyOwnerRecoverySeal(scope, binding, signed, seal);
  return { ...staged, restoreAuthenticity: authentic ? 'same-installation-capture' as const : 'unverified' as const,
    manifest: expected, local, exclusions, warnings: [...staged.warnings.filter(warning => !warning.startsWith('LocalStorage')),
    'Only known owner-bound localStorage keys are included.', 'CacheStorage and native files are not included.',
    'No restore/apply has occurred; imported commands and receipts are untrusted.'] };
}
