import { canonicalStringify, sha256Hex } from './canonicalHash';
import { OWNER_RECOVERY_STORES, SYNC_DATABASE_VERSION } from './ownerRecoverySchema';
import type { ActiveOwnerLearningScope, OwnerRecoverySnapshot } from './indexedDb';
import { avatarStorageKey, parseAvatarRecord } from '../profile/avatarContract';
import { encodeRecoveryBinary, decodeRecoveryBinary, recoveryHex, recoveryHexBytes, type EncodedRecoveryBinary } from './recoveryBinary';

type Encoded = null | string | number | boolean | { kind: 'undefined' }
  | { kind: 'array'; values: Encoded[] } | { kind: 'object'; entries: [string, Encoded][] }
  | { kind: 'blob'; mime: string; hex: string } | EncodedRecoveryBinary;
type DeviceBinding = { installationId: string; deviceId: string };
const MAX_ARCHIVE_CHARS = 64 * 1024 * 1024;

export async function ownerRecoveryResourceIntegrity(value: unknown) {
  const serialized = canonicalStringify(await encode(value));
  return { byteLength: new TextEncoder().encode(serialized).byteLength, sha256: await sha256Hex(serialized) };
}

async function encode(value: unknown, seen = new WeakSet<object>(), depth = 0): Promise<Encoded> {
  if (depth > 128) throw new Error('Recovery data nesting exceeds supported limits.');
  if (value === undefined) return { kind: 'undefined' };
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || value === null || seen.has(value)) throw new Error('Unsupported recovery value; retain source.');
  seen.add(value);
  try {
    if (value instanceof Blob) return { kind: 'blob', mime: value.type,
      hex: recoveryHex(new Uint8Array(await value.arrayBuffer())) };
    const binary = encodeRecoveryBinary(value);
    if (binary) return binary;
    if (Array.isArray(value)) {
      if (Object.keys(value).length !== value.length) throw new Error('Unsupported sparse recovery array; retain source.');
      const values: Encoded[] = [];
      for (const child of value) values.push(await encode(child, seen, depth + 1));
      return { kind: 'array', values };
    }
    if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('Unsupported recovery object; retain source.');
    const entries: [string, Encoded][] = [];
    for (const [key, child] of Object.entries(value)) entries.push([key, await encode(child, seen, depth + 1)]);
    return { kind: 'object', entries };
  } finally { seen.delete(value); }
}

function decode(value: unknown, depth = 0): unknown {
  if (depth > 128) throw new Error('Invalid recovery nesting.');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid recovery value.');
  const encoded = value as Encoded & Record<string, unknown>;
  const binary = decodeRecoveryBinary(encoded);
  if (binary) return binary;
  if (encoded.kind === 'undefined' && Object.keys(encoded).length === 1) return undefined;
  if (encoded.kind === 'array' && Object.keys(encoded).length === 2 && Array.isArray(encoded.values)) return encoded.values.map(child => decode(child, depth + 1));
  if (encoded.kind === 'object' && Object.keys(encoded).length === 2 && Array.isArray(encoded.entries)) {
    const keys = new Set<string>();
    return Object.fromEntries(encoded.entries.map(pair => {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || keys.has(pair[0])) throw new Error('Invalid recovery object fields.');
      keys.add(pair[0]);
      return [pair[0], decode(pair[1], depth + 1)];
    }));
  }
  if (encoded.kind === 'blob' && Object.keys(encoded).length === 3 && typeof encoded.mime === 'string'
    && typeof encoded.hex === 'string' && encoded.hex.length % 2 === 0 && /^[a-f0-9]*$/.test(encoded.hex)) {
    return new Blob([recoveryHexBytes(encoded.hex)], { type: encoded.mime });
  }
  throw new Error('Unsupported recovery encoding.');
}

function validBinding(binding: DeviceBinding) {
  return Boolean(binding && typeof binding.installationId === 'string' && binding.installationId
    && typeof binding.deviceId === 'string' && binding.deviceId);
}

export async function createOwnerRecoveryArchive(snapshot: OwnerRecoverySnapshot, binding: DeviceBinding): Promise<string> {
  if (!validBinding(binding)) throw new Error('Recovery device identity is unavailable.');
  const payload = { binding, data: await encode(snapshot) };
  const archive = canonicalStringify({ format: 'hanzi-owner-idb-recovery', version: 1, checksum: await sha256Hex(payload), payload });
  if (archive.length > MAX_ARCHIVE_CHARS) throw new Error('Recovery archive exceeds supported size; retain source.');
  return archive;
}

export async function stageOwnerRecoveryArchive(source: string, scope: ActiveOwnerLearningScope, binding: DeviceBinding) {
  if (source.length > MAX_ARCHIVE_CHARS) throw new Error('Recovery archive exceeds supported size.');
  const envelope = JSON.parse(source) as { format?: unknown; version?: unknown; checksum?: unknown;
    payload?: { binding?: DeviceBinding; data?: unknown } };
  if (!envelope || Object.keys(envelope).sort().join() !== 'checksum,format,payload,version'
    || envelope.format !== 'hanzi-owner-idb-recovery' || envelope.version !== 1
    || typeof envelope.checksum !== 'string' || !envelope.payload
    || Object.keys(envelope.payload).sort().join() !== 'binding,data'
    || await sha256Hex(envelope.payload) !== envelope.checksum) throw new Error('Recovery integrity check failed.');
  if (!validBinding(binding) || !envelope.payload.binding || !validBinding(envelope.payload.binding)
    || envelope.payload.binding.installationId !== binding.installationId || envelope.payload.binding.deviceId !== binding.deviceId) {
    throw new Error('Recovery belongs to another installation; commands must not be replayed.');
  }
  const snapshot = decode(envelope.payload.data) as OwnerRecoverySnapshot;
  if (!snapshot || snapshot.version !== 1 || snapshot.databaseVersion !== SYNC_DATABASE_VERSION
    || snapshot.coverage !== 'indexeddb-owner-only' || !snapshot.scope
    || snapshot.scope.ownerGeneration?.ownerKey !== scope.ownerGeneration.ownerKey
    || snapshot.scope.ownerGeneration.generation !== scope.ownerGeneration.generation || snapshot.scope.resetEpoch !== scope.resetEpoch
    || !snapshot.stores || Object.keys(snapshot.stores).sort().join() !== [...OWNER_RECOVERY_STORES].sort().join()
    || !OWNER_RECOVERY_STORES.every(name => Array.isArray(snapshot.stores[name]))) throw new Error('Recovery scope/schema is incompatible; retain current data.');
  for (const rows of Object.values(snapshot.stores)) for (const row of rows) {
    if (!row || typeof row !== 'object' || (row as { ownerKey?: unknown }).ownerKey !== scope.ownerGeneration.ownerKey) throw new Error('Recovery contains another owner.');
  }
  if (snapshot.avatar !== null) {
    const avatar = snapshot.avatar as { key?: unknown; value?: unknown } | null;
    if (!avatar || typeof avatar !== 'object' || avatar.key !== avatarStorageKey(scope.ownerGeneration.ownerKey)
      || !parseAvatarRecord(avatar.value, scope.ownerGeneration.ownerKey)) throw new Error('Recovery media is incompatible.');
  }
  return { status: 'staged-only' as const, authority: 'untrusted-copy' as const, snapshot,
    warnings: ['No data has been written.', 'LocalStorage and CacheStorage are not included.',
      'Integrity is not a server receipt, entitlement or mastery grant.'] };
}
