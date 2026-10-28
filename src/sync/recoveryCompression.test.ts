import { afterEach, expect, it, vi } from 'vitest';
import { compressRecoverySource, decompressRecoverySource } from './recoveryCompression';

afterEach(() => vi.unstubAllGlobals());
const large = '汉字\\"🙂\n'.repeat(100_000);
it('round-trips large Unicode, escaping and surrogate pairs with exact byte accounting', async () => {
  const compressed = await compressRecoverySource(large);
  expect(compressed).not.toBeNull();
  expect(compressed!.byteLength).toBe(new TextEncoder().encode(large).byteLength);
  expect(compressed!.data.length).toBeLessThan(large.length / 10);
  expect(await decompressRecoverySource(compressed)).toBe(large);
});

it('retains legacy output for small archives or missing compression support', async () => {
  expect(await compressRecoverySource('small')).toBeNull();
  vi.stubGlobal('CompressionStream', undefined);
  expect(await compressRecoverySource(large)).toBeNull();
});

it.each(['declared-too-small', 'declared-too-large', 'unsupported-budget', 'unknown-codec', 'unknown-field', 'bad-base64', 'truncated-gzip'])('rejects invalid or over-budget compressed input: %s', async kind => {
  const source = { ...((await compressRecoverySource(large))!) } as Record<string, unknown>;
  if (kind === 'declared-too-small') source.byteLength = 1;
  if (kind === 'declared-too-large') source.byteLength = Number(source.byteLength) + 1;
  if (kind === 'unsupported-budget') source.byteLength = 192 * 1024 * 1024 + 1;
  if (kind === 'unknown-codec') source.codec = 'unknown';
  if (kind === 'unknown-field') source.ignored = true;
  if (kind === 'bad-base64') source.data = 'AAA?';
  if (kind === 'truncated-gzip') source.data = String(source.data).slice(0, -4);
  await expect(decompressRecoverySource(source)).rejects.toThrow();
});

it('fails closed without decompression support instead of treating compressed data as an archive', async () => {
  const source = await compressRecoverySource(large);
  vi.stubGlobal('DecompressionStream', undefined);
  await expect(decompressRecoverySource(source)).rejects.toThrow('unavailable');
});
