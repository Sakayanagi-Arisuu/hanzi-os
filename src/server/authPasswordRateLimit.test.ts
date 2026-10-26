import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, describe, expect, it } from 'vitest';
import type { D1Database, D1PreparedStatement } from './d1';
import { consumeAuthPasswordRateLimit } from './authPasswordRateLimit';

const databases: DatabaseSync[] = [];
afterEach(() => { databases.splice(0).forEach(database => database.close()); });
function fixture() {
  const sql = new DatabaseSync(':memory:'); databases.push(sql);
  const migration = readFileSync('drizzle/0039_hosted_password_github.sql', 'utf8');
  sql.exec(migration.match(/CREATE TABLE auth_login_rate_limits \([\s\S]*?\);/u)![0]);
  const database: D1Database = {
    prepare(query) {
      let values: Array<string | number | null> = [];
      const statement: D1PreparedStatement = {
        bind(...args) { values = args as typeof values; return statement; },
        async first() { throw new Error('Unexpected read'); },
        async all() { throw new Error('Unexpected read'); },
        async run() { return { success: true, meta: { changes: Number(sql.prepare(query).run(...values).changes) } }; },
      };
      return statement;
    },
    async batch<T>(statements: D1PreparedStatement[]) {
      sql.exec('BEGIN');
      try { const result = await Promise.all(statements.map(statement => statement.run<T>())); sql.exec('COMMIT'); return result; }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
  };
  const consume = (email: string, purpose: 'login' | 'reset' | 'reset-action' = 'reset', now = 600_000, ip = '192.0.2.1') => consumeAuthPasswordRateLimit(database,
    new Request('https://hanzi.test/', { headers: { 'cf-connecting-ip': ip } }), email, now, purpose);
  return { consume, sql };
}
describe('persistent password recovery abuse limits', () => {
  it('keeps action codes case-sensitive, hashed and separate from email/login budgets', async () => {
    const { consume, sql } = fixture();
    const code = 'CaseSensitive_Action_1234567890';
    for (let index = 0; index < 8; index++) expect(await consume(code, 'reset-action')).toBe(true);
    expect(await consume(code, 'reset-action')).toBe(false);
    expect(await consume(code.toLowerCase(), 'reset-action')).toBe(true);
    expect(await consume(code, 'login')).toBe(true);
    expect(await consume(code, 'reset')).toBe(true);
    expect(JSON.stringify(sql.prepare('SELECT * FROM auth_login_rate_limits').all())).not.toContain(code);
  });
  it('normalizes email, caps recovery at three, and does not spend the login budget', async () => {
    const { consume, sql } = fixture();
    expect(await consume('Owner@example.invalid')).toBe(true);
    expect(await consume('owner@example.invalid')).toBe(true);
    expect(await consume(' OWNER@example.invalid ')).toBe(true);
    expect(await consume('owner@example.invalid')).toBe(false);
    expect(await consume('owner@example.invalid', 'login')).toBe(true);
    const persisted = JSON.stringify(sql.prepare('SELECT * FROM auth_login_rate_limits').all());
    expect(persisted).not.toContain('owner'); expect(persisted).not.toContain('192.0.2.1');
  });
  it('limits rotating email addresses by IP, then permits a new window', async () => {
    const { consume } = fixture();
    for (let index = 0; index < 10; index++) expect(await consume(`user${index}@example.invalid`)).toBe(true);
    expect(await consume('next@example.invalid')).toBe(false);
    expect(await consume('next@example.invalid', 'reset', 1_200_000)).toBe(true);
    expect(await consume('next@example.invalid', 'reset', 600_000)).toBe(false);
  });
  it('limits one email across different addresses', async () => {
    const { consume } = fixture();
    for (let index = 1; index <= 3; index++) expect(await consume('owner@example.invalid', 'reset', 600_000, `192.0.2.${index}`)).toBe(true);
    expect(await consume('owner@example.invalid', 'reset', 600_000, '192.0.2.4')).toBe(false);
  });
});
