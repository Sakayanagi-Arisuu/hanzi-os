import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import type { D1Database, D1PreparedStatement, D1RunResult } from './d1';
import { AuthRepository } from './authRepository';
import { createMobileStart, consumeMobileStart, createMobileCompletion, exchangeMobileCompletion } from './mobileAuth';
import { sha256Base64Url } from '../auth/authCrypto';

const databases: DatabaseSync[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });
function fixture() {
  const sqlite = new DatabaseSync(':memory:'); databases.push(sqlite);
  sqlite.exec('PRAGMA foreign_keys=ON');
  for (const file of readdirSync('drizzle').filter(name => /^\d+.*\.sql$/.test(name)).sort()) sqlite.exec(readFileSync('drizzle/' + file, 'utf8'));
  const database: D1Database = {
    prepare(query: string): D1PreparedStatement {
      const statement = sqlite.prepare(query); let parameters: SQLInputValue[] = [];
      return {
        bind(...values: unknown[]) { parameters = values as SQLInputValue[]; return this; },
        async first<T>(column?: string) { const row = statement.get(...parameters); return (row ? column ? row[column] : row : null) as T | null; },
        async all<T>() { return { success: true, results: statement.all(...parameters) as T[] }; },
        async run<T>() { const result = statement.run(...parameters); return { success: true, meta: { changes: Number(result.changes) } } as D1RunResult<T>; },
      };
    },
    async batch<T>(statements: D1PreparedStatement[]) {
      sqlite.exec('BEGIN');
      try { const result: D1RunResult<T>[] = []; for (const statement of statements) result.push(await statement.run<T>()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  return { sqlite, repository: new AuthRepository(database) };
}

describe('mobile Google login binds the one-time callback to its starting device', () => {
  it('rejects non-S256 starts, replayed starts and the wrong ceremony phase', async () => {
    const { repository } = fixture();
    await expect(createMobileStart(repository, 'plain-verifier')).rejects.toThrow();
    const code = await createMobileStart(repository, await sha256Base64Url('v'.repeat(64)));
    await expect(exchangeMobileCompletion(repository, code, 'v'.repeat(64))).rejects.toThrow();
    expect(await consumeMobileStart(repository, code)).toBe(await sha256Base64Url('v'.repeat(64)));
    await expect(consumeMobileStart(repository, code)).rejects.toThrow();
  });
  it('rejects an intercepted callback, creates one normal session, and rejects concurrent replay', async () => {
    const { repository, sqlite } = fixture();
    const identity = await repository.resolveOrCreateIdentity({ provider: 'google', providerSubject: 'fixture-mobile', email: 'mobile@example.invalid', emailVerified: true, displayName: 'Mobile fixture' });
    const verifier = 'v'.repeat(64);
    const uri = await createMobileCompletion(repository, { ...identity, codeChallenge: await sha256Base64Url(verifier) });
    const code = new URL(uri).searchParams.get('code');
    expect(uri.startsWith('com.regulus.hanzios://auth?code=')).toBe(true);
    expect(uri).not.toContain(identity.userId);
    await expect(exchangeMobileCompletion(repository, code, 'wrong'.repeat(13))).rejects.toThrow();
    const results = await Promise.allSettled([exchangeMobileCompletion(repository, code, verifier), exchangeMobileCompletion(repository, code, verifier)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const success = results.find(result => result.status === 'fulfilled');
    if (success?.status !== 'fulfilled') throw new Error('No session');
    expect(await repository.resolveSession(success.value.token)).toMatchObject({ userId: identity.userId, provider: 'google' });
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get()?.count).toBe(1);
    await expect(exchangeMobileCompletion(repository, code, verifier)).rejects.toThrow();
  });
  it('rejects expired exchange without issuing a session', async () => {
    const { repository, sqlite } = fixture();
    const identity = await repository.resolveOrCreateIdentity({ provider: 'google', providerSubject: 'expiry-mobile', email: 'expiry@example.invalid', emailVerified: true, displayName: 'Expiry' });
    const verifier = 'v'.repeat(64);
    const uri = await createMobileCompletion(repository, { ...identity, codeChallenge: await sha256Base64Url(verifier) });
    sqlite.prepare('UPDATE auth_challenges SET created_at=?, expires_at=?').run(Date.now()-120000, Date.now()-60000);
    await expect(exchangeMobileCompletion(repository, new URL(uri).searchParams.get('code'), verifier)).rejects.toThrow();
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get()?.count).toBe(0);
  });
  it('preserves the server account lock during mobile exchange', async () => {
    const { repository, sqlite } = fixture();
    const identity = await repository.resolveOrCreateIdentity({ provider: 'google', providerSubject: 'locked-mobile', email: 'locked@example.invalid', emailVerified: true, displayName: 'Locked' });
    const verifier = 'v'.repeat(64);
    const uri = await createMobileCompletion(repository, { ...identity, codeChallenge: await sha256Base64Url(verifier) });
    sqlite.prepare("UPDATE users SET status='locked', locked_at=?, locked_by_user_id=?, lock_reason='fixture lock' WHERE id=?")
      .run(Date.now(), identity.userId, identity.userId);
    await expect(exchangeMobileCompletion(repository, new URL(uri).searchParams.get('code'), verifier)).rejects.toThrow('locked');
    expect(sqlite.prepare('SELECT COUNT(*) AS count FROM auth_sessions').get()?.count).toBe(0);
  });
});
