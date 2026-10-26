import { afterEach, beforeEach, expect, it } from 'vitest';
import sharp from 'sharp';
import { FixtureD1 } from './testing/FixtureD1';
import { AccountAvatarRepository, avatarMutationHash, avatarBytesSha256 } from './accountAvatarRepository';
import { SyncRepository } from './syncRepository';
import { DatabaseSync, backup } from 'node:sqlite';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
let db: FixtureD1, repository: AccountAvatarRepository, bytes: Uint8Array;
beforeEach(async () => {
  db = new FixtureD1(); repository = new AccountAvatarRepository(db);
  db.sql.exec("INSERT INTO users(id,status,created_at,updated_at) VALUES('owner','active',1,1),('other','active',1,1)");
  bytes = new Uint8Array(await sharp({ create: { width: 256, height: 256, channels: 3, background: '#10ab98' } }).webp().toBuffer());
});
afterEach(() => db.sql.close());
const mutation = async (expectedRevision: number, image: Uint8Array | null = bytes, operationId = crypto.randomUUID()) => ({
  operationId, expectedRevision, bytes: image, requestSha256: await avatarMutationHash(expectedRevision, image ? 'image/webp' : null, image ? await avatarBytesSha256(image) : null),
});
it('restores exact private chunks, receipts and tombstones from a real SQLite backup', async () => {
  await repository.mutate('owner', await mutation(0));
  await repository.mutate('other', await mutation(0));
  await repository.mutate('other', await mutation(1, null));
  const directory = await mkdtemp(join(tmpdir(), 'hanzi-avatar-restore-'));
  const path = join(directory, 'backup.sqlite');
  let restored: DatabaseSync | undefined;
  try {
    await backup(db.sql, path); restored = new DatabaseSync(path);
    for (const table of ['learner_avatars', 'learner_avatar_chunks', 'learner_avatar_mutations']) {
      expect(restored.prepare(`SELECT * FROM ${table} ORDER BY user_id`).all()).toEqual(db.sql.prepare(`SELECT * FROM ${table} ORDER BY user_id`).all());
    }
    const chunks = restored.prepare("SELECT data_base64 FROM learner_avatar_chunks WHERE user_id='owner' ORDER BY sequence").all();
    expect(new Uint8Array(Buffer.from(chunks.map(row => row.data_base64).join(''), 'base64'))).toEqual(bytes);
    expect(restored.prepare('PRAGMA integrity_check').get()?.integrity_check).toBe('ok');
    expect(restored.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  } finally { restored?.close(); await unlink(path).catch(() => undefined); await rmdir(directory); }
});
it('roundtrips owner-private bytes without touching progress or another account', async () => {
  expect(await repository.metadata('owner')).toEqual({ revision: 0, updatedAt: null, hasImage: false });
  await repository.mutate('owner', await mutation(0));
  expect(await repository.bytes('owner', 1)).toEqual(bytes);
  expect((await repository.metadata('other')).revision).toBe(0);
  expect(db.sql.prepare('SELECT COUNT(*) AS n FROM learner_workspace_entries').get()?.n).toBe(0);
  expect(db.sql.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
});
it('does not let a stale tab or old accepted retry resurrect a removed image', async () => {
  const original = await mutation(0); await repository.mutate('owner', original);
  const stale = await mutation(1), remove = await mutation(1, null);
  await repository.mutate('owner', remove);
  await expect(repository.mutate('owner', stale)).rejects.toThrow('revision');
  expect((await repository.mutate('owner', original)).metadata).toMatchObject({ revision: 2, hasImage: false });
  expect(await repository.bytes('owner', 2)).toBeNull();
  expect(db.sql.prepare('SELECT COUNT(*) AS n FROM learner_avatar_chunks').get()?.n).toBe(0);
});
it('accepts a matching retry once and rejects an operation reused with different bytes', async () => {
  const input = await mutation(0); await repository.mutate('owner', input); await repository.mutate('owner', input);
  expect(db.sql.prepare('SELECT COUNT(*) AS n FROM learner_avatar_mutations').get()?.n).toBe(1);
  await expect(repository.mutate('owner', { ...input, requestSha256: 'a'.repeat(64) })).rejects.toThrow('different input');
  expect((await repository.metadata('owner')).revision).toBe(1);
});
it('rolls back metadata and all old bytes if the receipt fails', async () => {
  await repository.mutate('owner', await mutation(0));
  const before = db.sql.prepare('SELECT * FROM learner_avatars').get();
  db.sql.exec("CREATE TRIGGER fail_avatar_receipt BEFORE INSERT ON learner_avatar_mutations BEGIN SELECT RAISE(ABORT,'fixture failure'); END");
  await expect(repository.mutate('owner', await mutation(1, null))).rejects.toThrow();
  expect(db.sql.prepare('SELECT * FROM learner_avatars').get()).toEqual(before);
  expect(await repository.bytes('owner', 1)).toEqual(bytes);
});
it('preserves unreadable chunks rather than overwriting them with a replacement', async () => {
  await repository.mutate('owner', await mutation(0));
  db.sql.exec("UPDATE learner_avatar_chunks SET data_base64='corrupted' WHERE user_id='owner'");
  await expect(repository.bytes('owner', 1)).rejects.toThrow();
  await expect(repository.mutate('owner', await mutation(1, null))).rejects.toThrow();
  expect(db.sql.prepare("SELECT data_base64 FROM learner_avatar_chunks WHERE user_id='owner'").get()?.data_base64).toBe('corrupted');
});
it('fences an account locked or deleting before the atomic write', async () => {
  const batch = db.batch.bind(db);
  db.batch = async statements => { db.sql.exec("UPDATE users SET status='deletion_pending' WHERE id='owner'"); return batch(statements); };
  await expect(repository.mutate('owner', await mutation(0))).rejects.toThrow();
  expect(db.sql.prepare('SELECT COUNT(*) AS n FROM learner_avatars').get()?.n).toBe(0);
});
it('removes the portrait graph with the account and preserves the other portrait', async () => {
  await repository.mutate('owner', await mutation(0)); await repository.mutate('other', await mutation(0));
  expect(await new SyncRepository(db).deleteAccount('owner')).toBe(true);
  for (const table of ['learner_avatars', 'learner_avatar_chunks', 'learner_avatar_mutations']) {
    expect(db.sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id='owner'`).get()?.n).toBe(0);
    expect(Number(db.sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id='other'`).get()?.n)).toBeGreaterThan(0);
  }
  expect(await repository.bytes('other', 1)).toEqual(bytes);
});
