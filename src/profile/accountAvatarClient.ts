import { readActiveOwnerLearningScope, type OwnerGeneration } from '../sync/indexedDb';
import { AVATAR_CHANGED } from './avatarStorage';
import { AVATAR_MAX_OUTPUT_BYTES, AVATAR_SIZE, type AvatarRecord } from './avatarContract';
import { parseAccountAvatarSnapshot } from './accountAvatarContract';
import { readAvatarBytes } from './avatarBinary';
import { inspectAvatarImage } from './avatarRaster';
export class AccountAvatarClientError extends Error {
  constructor(readonly code: string) { super('Account avatar request failed; retain current image.'); }
}
async function requireOwner(owner: OwnerGeneration) {
  const current = await readActiveOwnerLearningScope();
  if (owner.ownerKey.startsWith('anonymous:') || current?.ownerGeneration.ownerKey !== owner.ownerKey || current.ownerGeneration.generation !== owner.generation) {
    throw new AccountAvatarClientError('WORKSPACE_CHANGED');
  }
}
async function checked(response: Response) {
  if (response.ok) return;
  let code = 'AVATAR_UNAVAILABLE';
  try { const body = await response.json() as { error?: { code?: string } }; if (typeof body.error?.code === 'string') code = body.error.code; } catch { /* Keep the bounded generic error. */ }
  throw new AccountAvatarClientError(code);
}
type Options = { send?: typeof fetch; signal?: AbortSignal };
export async function readAccountAvatar(owner: OwnerGeneration, options: Options = {}) {
  await requireOwner(owner);
  const send = options.send ?? fetch, init = { credentials: 'same-origin', cache: 'no-store', headers: { 'x-learning-owner': owner.ownerKey }, signal: options.signal } as const;
  const response = await send('/api/account/avatar', init); await checked(response);
  const snapshot = parseAccountAvatarSnapshot(await response.json(), owner.ownerKey);
  await requireOwner(owner);
  let blob: Blob | null = null;
  if (snapshot.hasImage) {
    const image = await send(`/api/account/avatar?image=1&revision=${snapshot.revision}`, init); await checked(image);
    if (image.headers.get('content-type')?.split(';')[0]?.trim() !== 'image/webp') throw new AccountAvatarClientError('AVATAR_IMAGE_INVALID');
    const bytes = await readAvatarBytes(image, AVATAR_MAX_OUTPUT_BYTES), shape = inspectAvatarImage(bytes, 'image/webp');
    if (shape.width !== AVATAR_SIZE || shape.height !== AVATAR_SIZE) throw new AccountAvatarClientError('AVATAR_IMAGE_INVALID');
    blob = new Blob([Uint8Array.from(bytes)], { type: 'image/webp' });
  }
  await requireOwner(owner); options.signal?.throwIfAborted();
  const record: AvatarRecord | null = snapshot.revision ? { version: 1, ownerKey: owner.ownerKey, revision: snapshot.revision, updatedAt: snapshot.updatedAt!, blob } : null;
  return { snapshot, record };
}
export async function saveAccountAvatar(owner: OwnerGeneration, expectedRevision: number, blob: Blob | null, operationId: string, options: Options = {}) {
  await requireOwner(owner);
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER - 1
    || blob && (blob.type !== 'image/webp' || !blob.size || blob.size > AVATAR_MAX_OUTPUT_BYTES)) throw new AccountAvatarClientError('AVATAR_INPUT_INVALID');
  const headers: Record<string, string> = { 'x-learning-owner': owner.ownerKey, 'if-match': `"${expectedRevision}"`, 'x-avatar-operation': operationId };
  if (blob) headers['content-type'] = 'image/webp';
  const response = await (options.send ?? fetch)('/api/account/avatar', { method: blob ? 'PUT' : 'DELETE', headers,
    body: blob, credentials: 'same-origin', cache: 'no-store', signal: options.signal });
  await checked(response);
  const body = await response.json() as { committedRevision?: unknown; snapshot?: unknown };
  const snapshot = parseAccountAvatarSnapshot(body.snapshot, owner.ownerKey);
  if (body.committedRevision !== expectedRevision + 1 || snapshot.revision < expectedRevision + 1) throw new AccountAvatarClientError('AVATAR_RECEIPT_INVALID');
  await requireOwner(owner); options.signal?.throwIfAborted();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AVATAR_CHANGED));
  if (typeof BroadcastChannel !== 'undefined') {
    let channel: BroadcastChannel | undefined;
    try { channel = new BroadcastChannel(AVATAR_CHANGED); channel.postMessage(owner.ownerKey); }
    catch { /* The server acknowledgement remains valid when cross-tab delivery is unavailable. */ }
    finally { channel?.close(); }
  }
  return snapshot;
}
