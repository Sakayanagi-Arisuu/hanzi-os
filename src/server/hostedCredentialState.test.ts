import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthRepository } from './authRepository';
import type { D1Database, D1PreparedStatement, D1RunResult } from './d1';
import { FirebaseAuthAdminUnavailableError, type FirebaseCredentialState } from './firebaseAuthAdmin';
import { checkHostedCredentialState, HostedCredentialRejectedError } from './hostedCredentialState';
import { bytesToBase64Url } from '../auth/authCrypto';
import { confirmFirebasePasswordReset, signInFirebasePassword } from './firebasePasswordIdentity';

class FixtureD1 implements D1Database {
  readonly sql = new DatabaseSync(':memory:');
  constructor() {
    this.sql.exec('PRAGMA foreign_keys=ON');
    for (const file of readdirSync('drizzle').filter(name => /^\d+.*\.sql$/u.test(name)).sort()) {
      this.sql.exec(readFileSync(`drizzle/${file}`, 'utf8'));
    }
  }
  prepare(query: string): D1PreparedStatement {
    const sql = this.sql;
    let values: Array<string | number | null> = [];
    return {
      bind(...parameters) { values = parameters as typeof values; return this; },
      async first<T>(column?: string) {
        const row = sql.prepare(query).get(...values);
        return (row ? column ? row[column] : row : null) as T | null;
      },
      async all<T>() { return { success: true, results: sql.prepare(query).all(...values) as T[] }; },
      async run<T>() {
        if (/^\s*SELECT/iu.test(query)) return { success: true, results: sql.prepare(query).all(...values) as T[] };
        return { success: true, meta: { changes: Number(sql.prepare(query).run(...values).changes) } };
      },
    };
  }
  async batch<T>(statements: D1PreparedStatement[]): Promise<Array<D1RunResult<T>>> {
    this.sql.exec('BEGIN');
    try {
      const results: Array<D1RunResult<T>> = [];
      for (const statement of statements) results.push(await statement.run<T>());
      this.sql.exec('COMMIT'); return results;
    } catch (error) { this.sql.exec('ROLLBACK'); throw error; }
  }
}

const databases: FixtureD1[] = [];
afterEach(() => { databases.splice(0).forEach(d1 => d1.sql.close()); vi.restoreAllMocks(); });
const now = 1_800_000_000_000;
const base: FirebaseCredentialState = { uid: 'firebase-uid', email: 'owner@example.invalid', emailVerified: true,
  disabled: false, passwordUpdatedAt: now - 60_000, validSince: (now - 60_000) / 1000 };
function fixture(hosted = true) {
  const d1 = new FixtureD1(); databases.push(d1);
  d1.sql.exec(`INSERT INTO users(id,status,created_at,updated_at) VALUES('owner','active',100,100),('other','active',100,100);
    INSERT INTO auth_identities(id,user_id,provider,provider_subject,email_verified,created_at,updated_at)
      VALUES('password','owner','hanzi','firebase:hanzi-fixture:firebase-uid',0,100,100),('google','owner','google','google-uid',1,100,100);
    INSERT INTO auth_sessions(id,user_id,identity_id,token_hash,auth_method,authenticated_at,created_at,last_seen_at,expires_at)
      VALUES('old','owner','password','old-token-hash','hanzi',${now - 120_000},${now - 120_000},${now - 120_000},${now + 300_000});
    INSERT INTO learner_workspace_entries(user_id,reset_epoch,entry_key,value_json,changed_at,change_id)
      VALUES('owner',0,'reader-position:fixture','{"position":0.5}',100,'stable-outbox-id');`);
  if (hosted) d1.sql.exec(`INSERT INTO hosted_hanzi_aliases(user_id,identity_id,project_id,firebase_uid,normalized_username,normalized_email,created_at,updated_at)
    VALUES('owner','password','hanzi-fixture','firebase-uid','fixture.owner','owner@example.invalid',100,100);`);
  const lookup = vi.fn<() => Promise<FirebaseCredentialState | null>>().mockResolvedValue(base);
  const admin = vi.fn(async () => ({ lookup }));
  const check = (userId: string, timestamp: number) => checkHostedCredentialState(d1, userId, admin, timestamp);
  return { d1, lookup, admin, check, repository: new AuthRepository(d1, check) };
}

describe('hosted password revocation fence and first-party sessions', () => {
  it('drives reset through the provider adapter, rejects the old password and keeps the same learner owner on fresh login', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { d1, repository, lookup } = fixture();
    const existing = await repository.createSession({ userId: 'owner', identityId: 'password', authMethod: 'hanzi',
      hostedCredential: { ...base, authenticatedAt: now } });
    const config = { projectId: 'hanzi-fixture', apiKey: 'fixture-key' };
    const newPassword = 'Fresh-password-2026';
    let consumed = false;
    const reset = { ...base, passwordUpdatedAt: now + 1000, validSince: now / 1000 + 1 };
    const encode = (value: unknown) => bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
    const seconds = now / 1000 + 2;
    const token = `${encode({ alg: 'RS256', kid: 'fixture' })}.${encode({
      aud: config.projectId, iss: `https://securetoken.google.com/${config.projectId}`, sub: base.uid,
      exp: seconds + 3600, iat: seconds, auth_time: seconds, firebase: { sign_in_provider: 'password' },
    })}.signature`;
    const fetcher = vi.fn<typeof fetch>(async (url, options) => {
      const body = JSON.parse(options!.body as string);
      if (String(url).includes('accounts:resetPassword')) {
        if (consumed) return Response.json({ error: { message: 'INVALID_OOB_CODE' } }, { status: 400 });
        if (body.newPassword) { consumed = true; lookup.mockResolvedValue(reset); }
        return Response.json({ email: base.email, requestType: 'PASSWORD_RESET' });
      }
      if (String(url).includes('accounts:signInWithPassword')) return body.password === newPassword && consumed
        ? Response.json({ idToken: token }) : Response.json({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, { status: 400 });
      if (String(url).includes('accounts:lookup')) return Response.json({ users: [{ ...reset, localId: base.uid,
        validSince: String(reset.validSince), providerUserInfo: [{ providerId: 'password' }] }] });
      throw new Error('Unexpected fixture operation');
    });
    await confirmFirebasePasswordReset(config, 'CaseSensitive_Action_1234567890', newPassword, fetcher);
    vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
    expect(await repository.resolveSession(existing.token)).toBeNull();
    await expect(signInFirebasePassword(config, base.email, 'Old-password-2026', fetcher, seconds)).rejects.toThrow();
    const proof = await signInFirebasePassword(config, base.email, newPassword, fetcher, seconds);
    const fresh = await repository.createSession({ userId: 'owner', identityId: 'password', authMethod: 'hanzi', hostedCredential: proof });
    expect(await repository.resolveSession(fresh.token)).toMatchObject({ userId: 'owner', provider: 'hanzi' });
    expect(d1.sql.prepare('SELECT change_id,value_json FROM learner_workspace_entries').get()).toMatchObject({ change_id: 'stable-outbox-id', value_json: '{"position":0.5}' });
    expect(d1.sql.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  it('keeps ordinary Google/local owners independent of Firebase and leaves learner data intact', async () => {
    const { d1, admin, check, repository } = fixture(false);
    expect(await check('owner', now)).toBeNull();
    const session = await repository.createSession({ userId: 'owner', identityId: 'google', authMethod: 'google' });
    expect(await repository.resolveSession(session.token)).toMatchObject({ userId: 'owner', provider: 'google' });
    expect(admin).not.toHaveBeenCalled();
    expect(d1.sql.prepare('SELECT change_id FROM learner_workspace_entries').get()?.change_id).toBe('stable-outbox-id');
  });
  it('revokes pre-existing sessions on first lookup while preserving the owner and progress', async () => {
    const { d1, check } = fixture();
    expect(await check('owner', now)).toMatchObject({ passwordUpdatedAt: base.passwordUpdatedAt });
    expect(d1.sql.prepare("SELECT revoked_at FROM auth_sessions WHERE id='old'").get()?.revoked_at).toBe(now);
    expect(d1.sql.prepare("SELECT status FROM users WHERE id='owner'").get()?.status).toBe('active');
    expect(d1.sql.prepare('SELECT value_json FROM learner_workspace_entries').get()?.value_json).toBe('{"position":0.5}');
    expect(d1.sql.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
  it('revokes all linked-provider sessions after reset and permits a new current password proof', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { repository, lookup } = fixture();
    const google = await repository.createSession({ userId: 'owner', identityId: 'google', authMethod: 'google' });
    const password = await repository.createSession({ userId: 'owner', identityId: 'password', authMethod: 'hanzi',
      hostedCredential: { ...base, authenticatedAt: now } });
    expect(await repository.resolveSession(password.token)).toMatchObject({ provider: 'hanzi' });
    const reset = { ...base, passwordUpdatedAt: now + 1000, validSince: now / 1000 + 1 };
    lookup.mockResolvedValue(reset); vi.spyOn(Date, 'now').mockReturnValue(now + 2000);
    expect(await repository.resolveSession(google.token)).toBeNull();
    expect(await repository.resolveSession(password.token)).toBeNull();
    await expect(repository.createSession({ userId: 'owner', identityId: 'password', authMethod: 'hanzi',
      hostedCredential: { ...base, authenticatedAt: now } })).rejects.toBeInstanceOf(HostedCredentialRejectedError);
    const fresh = await repository.createSession({ userId: 'owner', identityId: 'password', authMethod: 'hanzi',
      hostedCredential: { ...reset, authenticatedAt: now + 2000 } });
    expect(await repository.resolveSession(fresh.token)).toMatchObject({ userId: 'owner' });
  });
  it.each([null, { ...base, disabled: true }, { ...base, uid: 'other-uid' }, { ...base, email: 'other@example.invalid' }])(
    'rejects a removed, disabled or mismatched credential and revokes only that owner: %j', async providerState => {
      const { d1, lookup, check } = fixture(); lookup.mockResolvedValue(providerState);
      await expect(check('owner', now)).rejects.toBeInstanceOf(HostedCredentialRejectedError);
      expect(d1.sql.prepare("SELECT revoked_at FROM auth_sessions WHERE id='old'").get()?.revoked_at).toBe(now);
      expect(d1.sql.prepare('SELECT COUNT(*) AS count FROM users').get()?.count).toBe(2);
    });
  it('reports provider outage as retryable without revoking a valid session', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { d1, repository, lookup } = fixture();
    const session = await repository.createSession({ userId: 'owner', identityId: 'google', authMethod: 'google' });
    lookup.mockRejectedValue(new Error('provider offline'));
    await expect(repository.resolveSession(session.token)).rejects.toBeInstanceOf(FirebaseAuthAdminUnavailableError);
    expect(d1.sql.prepare('SELECT revoked_at FROM auth_sessions WHERE id=?').get(session.sessionId)?.revoked_at).toBeNull();
    lookup.mockResolvedValue(base);
    expect(await repository.resolveSession(session.token)).toMatchObject({ userId: 'owner' });
  });
  it('never rolls a fence back or revokes a newer session on a stale provider reply', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { d1, repository, lookup, check } = fixture();
    const fresh = await repository.createSession({ userId: 'owner', identityId: 'google', authMethod: 'google' });
    lookup.mockResolvedValue({ ...base, passwordUpdatedAt: base.passwordUpdatedAt - 1000, validSince: base.validSince - 1 });
    await expect(check('owner', now)).rejects.toBeInstanceOf(FirebaseAuthAdminUnavailableError);
    expect(d1.sql.prepare('SELECT password_updated_at FROM hosted_credential_states').get()?.password_updated_at).toBe(base.passwordUpdatedAt);
    expect(d1.sql.prepare('SELECT revoked_at FROM auth_sessions WHERE id=?').get(fresh.sessionId)?.revoked_at).toBeNull();
  });
  it('prevents session insertion when reset wins between the live provider check and D1 insert', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { d1, check } = fixture();
    const racing = new AuthRepository(d1, async (userId, timestamp) => {
      const version = await check(userId, timestamp);
      d1.sql.prepare('UPDATE hosted_credential_states SET password_updated_at=?,valid_since=? WHERE user_id=?')
        .run(now, now / 1000, userId);
      return version;
    });
    await expect(racing.createSession({ userId: 'owner', identityId: 'password', authMethod: 'hanzi',
      hostedCredential: { ...base, authenticatedAt: now } })).rejects.toBeInstanceOf(HostedCredentialRejectedError);
    expect(d1.sql.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get()?.count).toBe(1);
  });
  it('requires a password proof for hosted HANZI sessions and checks owner status again at insert', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const { d1, repository, check } = fixture();
    await expect(repository.createSession({ userId: 'owner', identityId: 'password', authMethod: 'hanzi' }))
      .rejects.toBeInstanceOf(HostedCredentialRejectedError);
    const racing = new AuthRepository(d1, async (userId, timestamp) => {
      const state = await check(userId, timestamp);
      d1.sql.prepare("UPDATE users SET status='locked',locked_at=?,locked_by_user_id='other',lock_reason='fixture' WHERE id=?").run(now, userId);
      return state;
    });
    await expect(racing.createSession({ userId: 'owner', identityId: 'google', authMethod: 'google' }))
      .rejects.toBeInstanceOf(HostedCredentialRejectedError);
  });
});
