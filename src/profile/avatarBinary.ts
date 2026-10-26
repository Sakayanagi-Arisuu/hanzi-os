import { AVATAR_MAX_INPUT_BYTES } from './avatarContract';
export class AvatarInputError extends Error {}
export class AvatarSizeError extends AvatarInputError {}
/** Shared bounded binary transport; no auth, decoder or server-only import. */
export async function readAvatarBytes(message: Request | Response, maximum = AVATAR_MAX_INPUT_BYTES): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maximum) || maximum < 0) throw new AvatarInputError('Invalid avatar size limit.');
  const declared = message.headers.get('content-length');
  if (declared !== null && (!/^(0|[1-9]\d*)$/.test(declared) || !Number.isSafeInteger(Number(declared)) || Number(declared) > maximum)) throw new AvatarSizeError('Avatar body too large.');
  if (!message.body) return new Uint8Array();
  const reader = message.body.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      if (!(chunk.value instanceof Uint8Array)) throw new AvatarInputError('Invalid binary stream.');
      length += chunk.value.byteLength;
      if (length > maximum) { await reader.cancel('avatar-size-limit').catch(() => undefined); throw new AvatarSizeError('Avatar body too large.'); }
      chunks.push(Uint8Array.from(chunk.value));
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
