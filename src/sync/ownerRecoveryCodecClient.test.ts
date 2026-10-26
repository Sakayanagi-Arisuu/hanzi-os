import { expect, it, vi } from 'vitest';
import { runRecoveryCodec } from './ownerRecoveryCodecClient';
import { canCloneRecoveryInput, executeCodecTask } from './ownerRecoveryCodecTask';
import * as core from './ownerRecoveryArchiveCore';
import { OWNER_RECOVERY_STORES, type OwnerRecoverySnapshot } from './indexedDb';

const scope = { ownerGeneration: { ownerKey: 'anonymous:codec', generation: 2 }, resetEpoch: 3 };
const binding = { installationId: 'installation', deviceId: 'device' };
const snapshot = (): OwnerRecoverySnapshot => ({ version: 1, databaseVersion: 3, coverage: 'indexeddb-owner-only', scope,
  capturedAt: '2026-10-24T00:00:00Z', stores: Object.fromEntries(OWNER_RECOVERY_STORES.map(name => [name, [] as unknown[]])) as OwnerRecoverySnapshot['stores'],
  avatar: null, excluded: ['localStorage', 'CacheStorage', 'authentication', 'global-device-metadata'] });

function fakeWorker(respond?: (request: Record<string, unknown>, worker: Worker) => void) {
  const worker = { terminate: vi.fn(), onmessage: null, onerror: null, onmessageerror: null,
    postMessage: vi.fn(async (request: Record<string, unknown>) => {
      if (respond) return respond(request, worker as unknown as Worker);
      try {
        const result = await executeCodecTask(request.task as 'ownerRecoveryResourceIntegrity', structuredClone(request.args) as [unknown]);
        worker.onmessage?.({ data: { ...request, ok: true, result } } as MessageEvent);
      } catch (error) {
        worker.onmessage?.({ data: { ...request, ok: false, error: (error as Error).message } } as MessageEvent);
      }
    }) } as unknown as Worker;
  return worker;
}

it('keeps archive bytes and staged raw values identical to the original codec across the clone boundary', async () => {
  const data = snapshot();
  data.stores.outbox.push({ ownerKey: scope.ownerGeneration.ownerKey, id: 'pending-original',
    raw: [undefined, false, null, { kind: 'undefined' }], blob: new Blob([new Uint8Array([0, 128, 255])], { type: 'image/webp' }) });
  const worker = fakeWorker();
  const encoded = await runRecoveryCodec('createOwnerRecoveryArchive', [data, binding], () => worker);
  expect(encoded).toBe(await core.createOwnerRecoveryArchive(data, binding));
  expect(worker.terminate).toHaveBeenCalledOnce();
  const staged = await runRecoveryCodec('stageOwnerRecoveryArchive', [encoded, scope, binding], () => fakeWorker());
  expect(await core.ownerRecoveryResourceIntegrity(staged.snapshot)).toEqual(await core.ownerRecoveryResourceIntegrity(data));
  expect(staged.authority).toBe('untrusted-copy');
});

it('runs the complete original validator when Worker construction is unavailable', async () => {
  const unavailable = () => { throw new Error('disabled'); };
  const archive = await runRecoveryCodec('createOwnerRecoveryArchive', [snapshot(), binding], unavailable);
  expect(archive).toBe(await core.createOwnerRecoveryArchive(snapshot(), binding));
  await expect(runRecoveryCodec('stageOwnerRecoveryArchive', ['{}', scope, binding], unavailable)).rejects.toThrow('integrity');
});

it('does not clone unsupported prototypes, cycles, accessors or sparse arrays into valid data', async () => {
  class Unknown { value = 1; }
  const cycle: Record<string, unknown> = {}; cycle.self = cycle;
  const sparse = new Array(3); sparse[0] = 1; sparse[2] = 3;
  for (const value of [new Unknown(), new Date(), cycle, sparse]) {
    const factory = vi.fn(() => fakeWorker());
    await expect(runRecoveryCodec('ownerRecoveryResourceIntegrity', [value], factory)).rejects.toThrow('Unsupported');
    if (!Array.isArray(value)) expect(factory).not.toHaveBeenCalled();
  }
  let reads = 0;
  const accessor = { get raw() { reads++; return 'original'; } };
  expect(canCloneRecoveryInput(accessor)).toBe(false);
  const factory = vi.fn(() => fakeWorker());
  const result = await runRecoveryCodec('ownerRecoveryResourceIntegrity', [accessor], factory);
  expect(result).toEqual(await core.ownerRecoveryResourceIntegrity({ raw: 'original' }));
  expect(reads).toBe(1);
  expect(factory).not.toHaveBeenCalled();
});

it.each(['id', 'task', 'version', 'ok', 'missing'])('rejects a malformed or mismatched %s response and terminates', async field => {
  const worker = fakeWorker((request, current) => {
    const data = { ...request, ok: true, result: {} } as Record<string, unknown>;
    if (field === 'missing') delete data.result; else data[field] = 'wrong';
    current.onmessage?.({ data } as MessageEvent);
  });
  await expect(runRecoveryCodec('ownerRecoveryResourceIntegrity', ['raw'], () => worker)).rejects.toThrow('Invalid recovery codec response');
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it.each(['onerror', 'onmessageerror'] as const)('fails closed on %s without silently accepting an empty result', async event => {
  const worker = fakeWorker((_request, current) => {
    if (event === 'onerror') current.onerror?.(new Event('error') as ErrorEvent);
    else current.onmessageerror?.(new MessageEvent('messageerror'));
  });
  await expect(runRecoveryCodec('ownerRecoveryResourceIntegrity', ['raw'], () => worker)).rejects.toThrow('source retained');
  expect(worker.terminate).toHaveBeenCalledOnce();
});

it('rejects copy failures and timeouts while terminating the worker', async () => {
  const copyFailure = fakeWorker();
  copyFailure.postMessage = () => { throw new Error('DataCloneError'); };
  await expect(runRecoveryCodec('ownerRecoveryResourceIntegrity', ['raw'], () => copyFailure)).rejects.toThrow('could not be copied');
  expect(copyFailure.terminate).toHaveBeenCalledOnce();
  vi.useFakeTimers();
  try {
    const stalled = fakeWorker(() => undefined);
    const pending = expect(runRecoveryCodec('ownerRecoveryResourceIntegrity', ['raw'], () => stalled)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(120_000);
    await pending;
    expect(stalled.terminate).toHaveBeenCalledOnce();
  } finally { vi.useRealTimers(); }
});

it('correlates simultaneous operations completed in reverse order', async () => {
  const requests: { request: Record<string, unknown>; worker: Worker }[] = [];
  const factory = () => fakeWorker((request, worker) => { requests.push({ request, worker }); });
  const first = runRecoveryCodec('ownerRecoveryResourceIntegrity', ['first'], factory);
  const second = runRecoveryCodec('ownerRecoveryResourceIntegrity', ['second'], factory);
  for (const { request, worker } of requests.reverse()) {
    worker.onmessage?.({ data: { ...request, ok: true, result: await executeCodecTask('ownerRecoveryResourceIntegrity', request.args as [unknown]) } } as MessageEvent);
  }
  expect(await first).toEqual(await core.ownerRecoveryResourceIntegrity('first'));
  expect(await second).toEqual(await core.ownerRecoveryResourceIntegrity('second'));
});
