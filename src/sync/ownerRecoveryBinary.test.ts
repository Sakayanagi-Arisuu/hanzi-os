import { expect, it } from 'vitest';
import { OWNER_RECOVERY_STORES, type OwnerRecoverySnapshot } from './indexedDb';
import { createOwnerRecoveryArchive, stageOwnerRecoveryArchive } from './ownerRecoveryArchive';
import { sha256Hex } from './canonicalHash';
import { canCloneRecoveryInput } from './ownerRecoveryCodecTask';

const scope = { ownerGeneration: { ownerKey: 'anonymous:recovery-binary', generation: 1 }, resetEpoch: 0 };
const binding = { installationId: 'binary-installation', deviceId: 'binary-device' };
function snapshot(value: unknown): OwnerRecoverySnapshot {
  const stores = Object.fromEntries(OWNER_RECOVERY_STORES.map(name => [name, [] as unknown[]])) as OwnerRecoverySnapshot['stores'];
  stores['lesson-resumes'].push({ ownerKey: scope.ownerGeneration.ownerKey, value });
  return { version: 1, databaseVersion: 3, coverage: 'indexeddb-owner-only', scope, capturedAt: '2026-10-28T00:00:00Z',
    stores, avatar: null, excluded: ['localStorage', 'CacheStorage', 'authentication', 'global-device-metadata'] };
}
const constructors = [Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array];
it.each(constructors)('preserves full backing bytes, offset, length and constructor: %s', async Constructor => {
  const buffer = new ArrayBuffer(40); new Uint8Array(buffer).set(Array.from({ length: 40 }, (_, i) => i * 6));
  const view = new Constructor(buffer, 8, 2), before = [...new Uint8Array(buffer)];
  expect(canCloneRecoveryInput(view)).toBe(true);
  const source = await createOwnerRecoveryArchive(snapshot(view), binding);
  const restored = (await stageOwnerRecoveryArchive(source, scope, binding)).snapshot.stores['lesson-resumes'][0] as { value: ArrayBufferView };
  expect(restored.value.constructor).toBe(Constructor);
  expect(restored.value.byteOffset).toBe(8); expect(restored.value.byteLength).toBe(view.byteLength);
  expect([...new Uint8Array(restored.value.buffer)]).toEqual(before);
  expect([...new Uint8Array(buffer)]).toEqual(before);
});

it.each([false, true])('preserves an ArrayBuffer or DataView, including bytes outside its visible range: %s', async dataView => {
  const buffer = new Uint8Array([0, 127, 128, 255, 23, 42, 11, 88]).buffer;
  const value = dataView ? new DataView(buffer, 2, 3) : buffer;
  const source = await createOwnerRecoveryArchive(snapshot(value), binding);
  const restored = (await stageOwnerRecoveryArchive(source, scope, binding)).snapshot.stores['lesson-resumes'][0] as { value: ArrayBuffer | DataView };
  expect(restored.value.constructor).toBe(dataView ? DataView : ArrayBuffer);
  const raw = restored.value instanceof DataView ? restored.value.buffer : restored.value;
  expect([...new Uint8Array(raw)]).toEqual([...new Uint8Array(buffer)]);
  if (restored.value instanceof DataView) { expect(restored.value.byteOffset).toBe(2); expect(restored.value.byteLength).toBe(3); }
});

it('keeps non-finite floating point and negative-zero bit patterns exactly', async () => {
  const value = new Float64Array([NaN, Infinity, -Infinity, -0]);
  const source = await createOwnerRecoveryArchive(snapshot(value), binding);
  const restored = (await stageOwnerRecoveryArchive(source, scope, binding)).snapshot.stores['lesson-resumes'][0] as { value: Float64Array };
  expect([...new Uint8Array(restored.value.buffer)]).toEqual([...new Uint8Array(value.buffer)]);
});

it('rejects subclasses, pretend buffers and binary values with extra enumerable metadata', async () => {
  class CustomView extends Uint8Array {}
  for (const value of [new CustomView(2), Object.create(ArrayBuffer.prototype), Object.assign(new ArrayBuffer(2), { lost: 'must retain' }), Object.assign(new Uint8Array(2), { lost: 'must retain' })]) {
    expect(canCloneRecoveryInput(value)).toBe(false);
    await expect(createOwnerRecoveryArchive(snapshot(value), binding)).rejects.toThrow('Unsupported');
  }
});

it.each(['unknown-type', 'negative-offset', 'unaligned-offset', 'fractional-length', 'too-long', 'bad-buffer', 'extra-field'])('rejects a checksum-valid malformed view: %s', async kind => {
  const envelope = JSON.parse(await createOwnerRecoveryArchive(snapshot(new Uint16Array(new ArrayBuffer(16), 4, 2)), binding));
  const find = (value: unknown): Record<string, unknown> | undefined => {
    if (!value || typeof value !== 'object') return;
    if ((value as { kind?: unknown }).kind === 'binary-view') return value as Record<string, unknown>;
    for (const child of Object.values(value)) { const result = find(child); if (result) return result; }
  };
  const view = find(envelope.payload.data)!;
  if (kind === 'unknown-type') view.type = '__proto__';
  if (kind === 'negative-offset') view.byteOffset = -1;
  if (kind === 'unaligned-offset') view.byteOffset = 1;
  if (kind === 'fractional-length') view.byteLength = 1.5;
  if (kind === 'too-long') view.byteLength = Number.MAX_SAFE_INTEGER;
  if (kind === 'bad-buffer') view.buffer = { kind: 'array-buffer', hex: 'not-hex' };
  if (kind === 'extra-field') view.ignored = true;
  envelope.checksum = await sha256Hex(envelope.payload);
  await expect(stageOwnerRecoveryArchive(JSON.stringify(envelope), scope, binding)).rejects.toThrow('encoding');
});
