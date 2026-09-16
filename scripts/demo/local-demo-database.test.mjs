import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { DEMO_USERS, requireDemoAccounts, d1Adapter, fingerprint } from './local-demo-database.mjs';

test('accept only existing active demo identities with the expected roles', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE users(id TEXT,status TEXT); CREATE TABLE hanzi_password_credentials(user_id TEXT,normalized_username TEXT); CREATE TABLE user_roles(user_id TEXT,role TEXT);');
    for (const account of Object.values(DEMO_USERS)) {
      db.prepare('INSERT INTO users VALUES (?,?)').run(account.id,'active');
      db.prepare('INSERT INTO hanzi_password_credentials VALUES (?,?)').run(account.id,account.username);
      db.prepare('INSERT INTO user_roles VALUES (?,?)').run(account.id,account.role);
    }
    assert.doesNotThrow(() => requireDemoAccounts(db));
    db.prepare('UPDATE hanzi_password_credentials SET normalized_username=? WHERE user_id=?').run('real.person',DEMO_USERS.learner.id);
    assert.throws(() => requireDemoAccounts(db), /Không đúng tài khoản demo/);
  } finally { db.close(); }
});

test('batch failure rolls back only its savepoint and preserves the outer transaction', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE items(id TEXT PRIMARY KEY); BEGIN IMMEDIATE; INSERT INTO items VALUES (\'existing\');');
    const api = d1Adapter(db);
    await assert.rejects(api.batch([
      api.prepare('INSERT INTO items VALUES (?)').bind('new'),
      api.prepare('INSERT INTO items VALUES (?)').bind('existing'),
    ]));
    assert.deepEqual(db.prepare('SELECT id FROM items').all().map(row => row.id), ['existing']);
    db.exec('ROLLBACK');
    assert.equal(db.prepare('SELECT COUNT(*) n FROM items').get().n, 0);
  } finally { db.close(); }
});

test('adapter supports returning rows, metadata and first-column reads', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('CREATE TABLE items(id TEXT PRIMARY KEY);');
    const api = d1Adapter(db);
    const [result] = await api.batch([api.prepare('INSERT INTO items VALUES (?) RETURNING id').bind('demo')]);
    assert.equal(result.results[0].id, 'demo');
    assert.equal(result.meta.changes, 1);
    assert.equal(await api.prepare('SELECT id FROM items').first('id'), 'demo');
    assert.throws(() => fingerprint(db, 'items; DROP TABLE items'), /Unsafe table/);
  } finally { db.close(); }
});
