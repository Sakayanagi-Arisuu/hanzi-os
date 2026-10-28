/** These are derived from the unchanged 64 Mi UTF-16-unit inner archive cap.
 * UTF-8 needs at most three bytes per UTF-16 unit; gzip never relaxes that cap. */
const MAX_INNER_CHARS = 64 * 1024 * 1024;
const MAX_INNER_BYTES = 3 * MAX_INNER_CHARS;
const MAX_COMPRESSED_BYTES = 48 * 1024 * 1024;
export type CompressedRecoverySource = { codec: 'gzip-base64-v1'; byteLength: number; data: string };
const pause = () => new Promise<void>(resolve => setTimeout(resolve, 0));

async function base64(bytes: Uint8Array<ArrayBuffer>) {
  const parts: string[] = [];
  for (let start = 0; start < bytes.length; start += 12288) {
    parts.push(btoa(String.fromCharCode(...bytes.subarray(start, start + 12288))));
    if (start && start % (12288 * 64) === 0) await pause();
  }
  return parts.join('');
}

async function unbase64(source: string) {
  if (source.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(source)
    || source.length / 4 * 3 > MAX_COMPRESSED_BYTES + 2) throw Error('Invalid recovery compression encoding.');
  const length = source.length / 4 * 3 - (source.endsWith('==') ? 2 : source.endsWith('=') ? 1 : 0);
  if (length > MAX_COMPRESSED_BYTES) throw Error('Recovery compression exceeds supported size.');
  const bytes = new Uint8Array(length);
  for (let start = 0, offset = 0; start < source.length; start += 16384) {
    const encoded = source.slice(start, start + 16384), part = atob(encoded);
    if (btoa(part) !== encoded) throw Error('Invalid recovery compression encoding.');
    for (let index = 0; index < part.length; index++) bytes[offset++] = part.charCodeAt(index);
    if (start && start % (16384 * 64) === 0) await pause();
  }
  return bytes;
}

/** Optional transport compression, never trimming or increasing logical size
 * limits. Small/unsupported/incompressible sources retain the legacy format. */
export async function compressRecoverySource(source: string): Promise<CompressedRecoverySource | null> {
  if (source.length < 512 * 1024 || typeof CompressionStream === 'undefined' || typeof DecompressionStream === 'undefined') return null;
  if (source.length > MAX_INNER_CHARS) throw Error('Recovery archive exceeds supported size; retain source.');
  const blob = new Blob([source]);
  const limit = Math.min(MAX_COMPRESSED_BYTES, Math.floor((source.length - 256) * 3 / 4));
  let compressor: CompressionStream;
  try { compressor = new CompressionStream('gzip'); } catch { return null; }
  const reader = blob.stream().pipeThrough(compressor).getReader(), chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) { await reader.cancel(); return null; }
      chunks.push(next.value);
    }
  } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { codec: 'gzip-base64-v1', byteLength: blob.size, data: await base64(bytes) };
}

export async function decompressRecoverySource(value: unknown): Promise<string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid recovery compression encoding.');
  const source = value as CompressedRecoverySource;
  if (Object.keys(source).sort().join() !== 'byteLength,codec,data' || source.codec !== 'gzip-base64-v1'
    || !Number.isSafeInteger(source.byteLength) || source.byteLength < 1 || source.byteLength > MAX_INNER_BYTES
    || typeof source.data !== 'string' || !source.data) throw Error('Invalid recovery compression encoding.');
  if (typeof DecompressionStream === 'undefined') throw Error('Recovery decompression unavailable; retain source.');
  const bytes = await unbase64(source.data);
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true }), chunks: string[] = [];
  let size = 0, chars = 0;
  try {
    while (true) {
      const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength;
      if (size > source.byteLength) throw Error('Recovery decompression exceeds declared size; retain source.');
      const text = decoder.decode(next.value, { stream: true }); chars += text.length;
      if (chars > MAX_INNER_CHARS) throw Error('Recovery archive exceeds supported size; retain source.');
      chunks.push(text);
    }
    const tail = decoder.decode(); chars += tail.length;
    if (size !== source.byteLength || chars > MAX_INNER_CHARS) throw Error('Recovery decompression size mismatch; retain source.');
    chunks.push(tail);
  } catch (error) { await reader.cancel().catch(() => undefined); throw error; }
  finally { reader.releaseLock(); }
  return chunks.join('');
}
