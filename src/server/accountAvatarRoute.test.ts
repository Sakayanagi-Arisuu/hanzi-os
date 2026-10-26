import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { FixtureD1 } from './testing/FixtureD1';
import { createAccountAvatarHandlers } from './accountAvatarRoute';
import { deriveAccountKey } from '../lib/accountKey';
import type { AvatarImagesBinding } from './avatarEncoding';
let db: FixtureD1, ownerKey: string;
const identity = vi.fn();
const localImages: AvatarImagesBinding = {
 async info(stream) { return sharp(Buffer.from(await new Response(stream).arrayBuffer())).metadata(); },
 input(stream) { return { transform() { return { async output() {
  const bytes = await sharp(Buffer.from(await new Response(stream).arrayBuffer())).resize(256, 256).webp().toBuffer();
  return { response: () => new Response(bytes, { headers: { 'content-type': 'image/webp' } }) };
 } }; } }; },
};
beforeEach(async () => { db = new FixtureD1(); db.sql.exec("INSERT INTO users(id,status,created_at,updated_at) VALUES('owner','active',1,1),('other','active',1,1)");
 ownerKey = await deriveAccountKey('owner'); identity.mockReset(); identity.mockResolvedValue({ userId: 'owner', email: 'owner@example.invalid', displayName: 'Fixture', fullName: null }); });
afterEach(() => db.sql.close());
const handlers = (images: AvatarImagesBinding | undefined = localImages) => createAccountAvatarHandlers({ identity, database: async () => db, images: async () => images });
const request = (method = 'GET', body?: Uint8Array, extra: HeadersInit = {}, query = '') => new Request(`https://hanzi.test/api/account/avatar${query}`, {
 method, headers: { 'x-learning-owner': ownerKey, ...(method !== 'GET' ? { origin: 'https://hanzi.test', 'if-match': '"0"', 'x-avatar-operation': crypto.randomUUID(), 'content-type': 'image/png' } : {}), ...extra },
 body: body ? Uint8Array.from(body) : undefined,
});
it('blocks cross-origin and wrong-owner requests before database or decoder access', async () => {
 const source = vi.fn(async () => db), api = createAccountAvatarHandlers({ identity, database: source, images: async () => localImages });
 expect((await api.PUT(request('PUT', undefined, { origin: 'https://other.invalid' }))).status).toBe(403); expect(identity).not.toHaveBeenCalled();
 expect((await api.GET(request('GET', undefined, { 'x-learning-owner': 'other' }))).status).toBe(409); expect(source).not.toHaveBeenCalled();
 identity.mockResolvedValue(null); expect((await api.GET(request())).status).toBe(401);
});
it('privately roundtrips processed bytes, a removal and an old operation retry without resurrection', async () => {
 const api = handlers(), png = new Uint8Array(await sharp({ create: { width: 256, height: 256, channels: 3, background: '#32a45a' } }).png().toBuffer());
 const op = crypto.randomUUID(), initial = request('PUT', png, { 'x-avatar-operation': op });
 const saved = await api.PUT(initial); expect(saved.status).toBe(200); expect((await saved.json()).snapshot).toMatchObject({ ownerKey, revision: 1, hasImage: true });
 const image = await api.GET(request('GET', undefined, {}, '?image=1&revision=1'));
 expect(image.headers.get('cache-control')).toContain('no-store'); expect(image.headers.get('content-type')).toBe('image/webp');
 expect((await sharp(Buffer.from(await image.arrayBuffer())).metadata()).width).toBe(256);
 const deleted = await api.DELETE(request('DELETE', undefined, { 'if-match': '"1"' })); expect(deleted.status).toBe(200);
 const retry = await api.PUT(request('PUT', png, { 'x-avatar-operation': op })); expect((await retry.json()).snapshot).toMatchObject({ revision: 2, hasImage: false });
 expect((await api.GET(request('GET', undefined, {}, '?image=1&revision=1'))).status).toBe(409);
 expect((await api.GET(request('GET', undefined, {}, '?image=1&revision=2'))).status).toBe(404);
});
it('fails closed without an encoder and preserves the old image', async () => {
 const png = new Uint8Array(await sharp({ create: { width: 256, height: 256, channels: 3, background: '#aa2b3c' } }).png().toBuffer());
 await handlers().PUT(request('PUT', png));
 const api = handlers();
 const unavailable = createAccountAvatarHandlers({ identity, database: async () => db, images: async () => undefined });
 expect((await (await unavailable.GET(request())).json()).uploadAvailable).toBe(false);
 expect((await unavailable.PUT(request('PUT', png, { 'if-match': '"1"' }))).status).toBe(503);
 expect((await (await api.GET(request())).json()).revision).toBe(1);
});
it('rejects malformed headers, unbounded/mismatched media and locked-account access', async () => {
 const api = handlers();
 expect((await api.PUT(request('PUT', new Uint8Array([1]), { 'if-match': '*' }))).status).toBe(422);
 expect((await api.PUT(request('PUT', new Uint8Array([1]), { 'content-type': 'image/svg+xml' }))).status).toBe(415);
 expect((await api.PUT(request('PUT', new Uint8Array([1]), { 'content-length': '9999999' }))).status).toBe(413);
 expect((await api.PUT(request('PUT', new Uint8Array([1])))).status).toBe(422);
 db.sql.exec("UPDATE users SET status='locked',locked_at=1,locked_by_user_id='other',lock_reason='fixture' WHERE id='owner'"); expect((await api.GET(request())).status).toBe(503);
});
