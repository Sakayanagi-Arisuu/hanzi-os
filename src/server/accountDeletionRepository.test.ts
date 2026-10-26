import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionRepository } from './accountDeletionRepository';
import { ACCOUNT_DELETION_RETAINED_REFS } from './accountDeletionPolicy';
import { FixtureD1 } from './testing/FixtureD1';
import { assertAccountCanAuthenticate } from './accountStatus';
import { deriveAccountKey } from '../lib/accountKey';
import sharp from 'sharp';
import { AccountAvatarRepository, avatarMutationHash, avatarBytesSha256 } from './accountAvatarRepository';
let d1: FixtureD1;
const now = 1_800_000_000_000;
const token = 'A'.repeat(43);
const state = { uid: 'fixture-uid', email: 'owner@example.invalid', emailVerified: true, disabled: false, passwordUpdatedAt: now - 1000, validSince: now / 1000 - 1 };
beforeEach(() => {
  d1 = new FixtureD1(); vi.spyOn(Date, 'now').mockReturnValue(now);
  d1.sql.exec(`INSERT INTO users(id,status,created_at,updated_at) VALUES('owner','active',1,1),('other','active',1,1);
    INSERT INTO profiles(user_id,display_name,goal,daily_minutes,script,starting_level,onboarded,revision,created_at,updated_at)
      VALUES('owner','Fixture','conversation',20,'simplified','zero',0,1,1,1),('other','Other','conversation',20,'simplified','zero',0,1,1,1);
    INSERT INTO user_roles(user_id,role,granted_at,updated_at) VALUES('owner','learner',1,1),('other','learner',1,1);
    INSERT INTO auth_identities(id,user_id,provider,provider_subject,normalized_email,email_verified,created_at,updated_at)
      VALUES('identity','owner','hanzi','firebase:hanzi-fixture:fixture-uid','owner@example.invalid',1,1,1);
    INSERT INTO hosted_hanzi_aliases VALUES('owner','identity','hanzi-fixture','fixture-uid','fixture.owner','owner@example.invalid',1,1);
    INSERT INTO auth_sessions(id,user_id,identity_id,token_hash,auth_method,authenticated_at,created_at,last_seen_at,expires_at)
      VALUES('session','owner','identity','hash','hanzi',${now - 1000},${now - 1000},${now - 1000},${now + 10000});
    INSERT INTO learner_workspace_entries VALUES('owner',0,'reader:fixture','{"position":0.5}',1,'owner-outbox'),('other',0,'reader:other','{"position":0.9}',1,'other-outbox');`);
});
afterEach(() => { d1.sql.close(); vi.restoreAllMocks(); });
const setup = () => {
  const lookup = vi.fn().mockResolvedValue(state), remove = vi.fn().mockResolvedValue(undefined);
  const adminFor = vi.fn(async () => ({ lookup, delete: remove }));
  return { repository: new AccountDeletionRepository(d1, adminFor, () => Date.now()), lookup, remove, adminFor };
};
const start = (repository: AccountDeletionRepository) => repository.start('owner', token, 'session', now - 1000);
function otherUntouched() {
  expect(d1.sql.prepare("SELECT value_json FROM learner_workspace_entries WHERE user_id='other'").get()?.value_json).toBe('{"position":0.9}');
  expect(d1.sql.prepare("SELECT status FROM users WHERE id='other'").get()?.status).toBe('active');
  expect(d1.sql.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
}
describe('durable account deletion and protected graph', () => {
  it('audits every restrictive user reference in the migration graph', () => {
    const actual: string[] = [];
    for (const row of d1.sql.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()) {
      for (const fk of d1.sql.prepare(`PRAGMA foreign_key_list(${row.name})`).all()) {
        if (fk.table === 'users' && !['CASCADE', 'SET NULL'].includes(String(fk.on_delete))) actual.push(`${row.name}:${fk.from}`);
      }
    }
    expect(actual.sort()).toEqual(ACCOUNT_DELETION_RETAINED_REFS.map(([table, column]) => `${table}:${column}`).sort());
  });
  it('persists a hashed owner/session-bound intent and revokes sessions before external calls', async () => {
    const { repository, remove } = setup(); await start(repository);
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='owner'").get()?.status).toBe('deletion_pending');
    expect(d1.sql.prepare("SELECT revoked_at FROM auth_sessions WHERE id='session'").get()?.revoked_at).toBe(now);
    expect(JSON.stringify(d1.sql.prepare('SELECT * FROM account_deletion_jobs').get())).not.toContain(token);
    expect(remove).not.toHaveBeenCalled();
    await expect(assertAccountCanAuthenticate(d1, 'owner')).rejects.toThrow(); otherUntouched();
  });
  it.each(['missing-session', 'another-session'])('does not persist intent with an unbound session %s', async sessionId => {
    const { repository } = setup(); await expect(repository.start('owner', token, sessionId, now - 1000)).rejects.toThrow();
    expect(d1.sql.prepare('SELECT COUNT(*) AS n FROM account_deletion_jobs').get()?.n).toBe(0);
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='owner'").get()?.status).toBe('active');
  });
  it('rejects stale authentication even if a route accidentally bypasses its recent-auth check', async () => {
    d1.sql.prepare("UPDATE auth_sessions SET authenticated_at=?,created_at=? WHERE id='session'").run(now - 700000, now - 700000);
    await expect(setup().repository.start('owner', token, 'session', now - 700000)).rejects.toThrow();
    expect(d1.sql.prepare('SELECT COUNT(*) AS n FROM account_deletion_jobs').get()?.n).toBe(0);
  });
  it('completes external deletion then atomically purges only that owner, retaining a redacted receipt', async () => {
    const bytes = new Uint8Array(await sharp({ create: { width: 256, height: 256, channels: 3, background: '#76ab98' } }).webp().toBuffer());
    const avatars = new AccountAvatarRepository(d1);
    for (const userId of ['owner', 'other']) await avatars.mutate(userId, { operationId: crypto.randomUUID(), expectedRevision: 0,
      requestSha256: await avatarMutationHash(0, 'image/webp', await avatarBytesSha256(bytes)), bytes });
    const { repository, remove } = setup(); await start(repository);
    d1.queries = 0;
    expect(await repository.resume(token)).toEqual({ deleted: true, pending: false, ownerKey: await deriveAccountKey('owner') });
    expect(d1.queries).toBeLessThanOrEqual(50); expect(remove).toHaveBeenCalledExactlyOnceWith('fixture-uid');
    expect(d1.sql.prepare("SELECT id FROM users WHERE id='owner'").get()).toBeUndefined();
    expect(d1.sql.prepare('SELECT status,project_id,firebase_uid,expected_email FROM account_deletion_jobs').get()).toMatchObject({ status: 'completed', project_id: null, firebase_uid: null, expected_email: null });
    expect(await repository.resume(token)).toMatchObject({ deleted: true }); expect(remove).toHaveBeenCalledOnce(); otherUntouched();
    for (const table of ['learner_avatars', 'learner_avatar_chunks', 'learner_avatar_mutations']) {
      expect(d1.sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id='owner'`).get()?.n).toBe(0);
      expect(d1.sql.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id='other'`).get()?.n).toBe(1);
    }
    expect(await avatars.bytes('other', 1)).toEqual(bytes);
  });
  it('keeps all learner data while the provider is unavailable and resumes without a login cookie', async () => {
    const { repository, lookup, remove } = setup(); await start(repository); lookup.mockRejectedValue(new Error('private provider'));
    expect(await repository.resume(token)).toMatchObject({ pending: true, deleted: false });
    expect(d1.sql.prepare("SELECT change_id FROM learner_workspace_entries WHERE user_id='owner'").get()?.change_id).toBe('owner-outbox');
    lookup.mockResolvedValue(state); expect(await repository.resume(token)).toMatchObject({ deleted: true }); expect(remove).toHaveBeenCalledOnce(); otherUntouched();
  });
  it('handles an external delete whose response was lost without deleting a different identity', async () => {
    const { repository, lookup, remove } = setup(); await start(repository);
    remove.mockRejectedValueOnce(new Error('lost response'));
    expect(await repository.resume(token)).toMatchObject({ pending: true });
    lookup.mockResolvedValue(null);
    expect(await repository.resume(token)).toMatchObject({ deleted: true }); expect(remove).toHaveBeenCalledOnce(); otherUntouched();
  });
  it('keeps a mismatched provider identity pending instead of deleting it', async () => {
    const { repository, lookup, remove } = setup(); await start(repository);
    lookup.mockResolvedValue({ ...state, email: 'other@example.invalid' });
    expect(await repository.resume(token)).toMatchObject({ pending: true }); expect(remove).not.toHaveBeenCalled(); otherUntouched();
  });
  it('rolls back the entire local graph purge on a failure and retries without repeating external deletion', async () => {
    const { repository, remove } = setup(); await start(repository);
    const original = d1.batch.bind(d1); let failed = false;
    vi.spyOn(d1, 'batch').mockImplementationOnce(async statements => {
      failed = true;
      d1.sql.exec('BEGIN');
      try { await statements[0]!.run(); throw new Error('fixture failure'); }
      catch (error) { d1.sql.exec('ROLLBACK'); throw error; }
    });
    expect(await repository.resume(token)).toMatchObject({ pending: true }); expect(failed).toBe(true);
    expect(d1.sql.prepare("SELECT change_id FROM learner_workspace_entries WHERE user_id='owner'").get()?.change_id).toBe('owner-outbox');
    vi.spyOn(d1, 'batch').mockImplementation(original);
    expect(await repository.resume(token)).toMatchObject({ deleted: true }); expect(remove).toHaveBeenCalledOnce(); otherUntouched();
  });
  it('lets only one worker hold the external deletion lease', async () => {
    const { repository, lookup, remove } = setup(); await start(repository);
    let release!: () => void;
    const paused = new Promise<void>(resolve => { release = resolve; });
    lookup.mockImplementationOnce(async () => { await paused; return state; });
    const first = repository.resume(token);
    await vi.waitFor(() => expect(lookup).toHaveBeenCalledOnce());
    expect(await repository.resume(token)).toMatchObject({ pending: true });
    release(); expect(await first).toMatchObject({ deleted: true }); expect(remove).toHaveBeenCalledOnce(); otherUntouched();
  });
  it('does not purge local rows if the frozen owner status is changed before finalization', async () => {
    const { repository, remove } = setup(); await start(repository);
    remove.mockImplementation(async () => { d1.sql.prepare("UPDATE users SET status='active' WHERE id='owner'").run(); });
    expect(await repository.resume(token)).toMatchObject({ pending: true });
    expect(d1.sql.prepare("SELECT change_id FROM learner_workspace_entries WHERE user_id='owner'").get()?.change_id).toBe('owner-outbox'); otherUntouched();
  });
  it('refuses privileged accounts before freezing or external deletion', async () => {
    const { repository, remove } = setup();
    d1.sql.prepare("INSERT INTO user_roles(user_id,role,granted_at,updated_at) VALUES('owner','admin',1,1)").run();
    await expect(start(repository)).rejects.toThrow(); expect(remove).not.toHaveBeenCalled();
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='owner'").get()?.status).toBe('active'); otherUntouched();
  });
  it.each(['editorial', 'payment'])('retains real %s references and refuses a destructive intent', async kind => {
    if (kind === 'editorial') d1.sql.exec("INSERT INTO content_items(id,stable_key,item_type,created_by_user_id,created_at,updated_at) VALUES('fixture-item','fixture:retained','lesson','owner',1,1)");
    else d1.sql.exec("INSERT INTO commerce_cash_orders(id,user_id,plan_id,amount,currency,provider,status,created_at) VALUES('fixture-order','owner','hsk4-month',100000,'VND','manual','pending',1)");
    const { repository, remove } = setup();
    await expect(start(repository)).rejects.toThrow('retained operational records');
    expect(d1.sql.prepare('SELECT COUNT(*) AS n FROM account_deletion_jobs').get()?.n).toBe(0);
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='owner'").get()?.status).toBe('active');
    expect(d1.sql.prepare("SELECT change_id FROM learner_workspace_entries WHERE user_id='owner'").get()?.change_id).toBe('owner-outbox');
    expect(remove).not.toHaveBeenCalled(); otherUntouched();
  });
  it('runs one due job at a time within the Free D1 query budget, then removes expired completed receipts', async () => {
    const { repository } = setup(); await start(repository); d1.queries = 0;
    await repository.runDueJobs(); expect(d1.queries).toBeLessThanOrEqual(50);
    expect(d1.sql.prepare('SELECT status FROM account_deletion_jobs').get()?.status).toBe('completed');
    d1.sql.prepare('UPDATE account_deletion_jobs SET expires_at=?').run(now + 1);
    vi.spyOn(Date, 'now').mockReturnValue(now + 2); await repository.runDueJobs();
    expect(d1.sql.prepare('SELECT COUNT(*) AS n FROM account_deletion_jobs').get()?.n).toBe(0); otherUntouched();
  });
});
