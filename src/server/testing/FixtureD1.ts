import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import type { D1Database, D1PreparedStatement, D1RunResult } from '../d1';

/** In-memory fixture only; never opens a learner's .wrangler database. */
export class FixtureD1 implements D1Database {
  readonly sql = new DatabaseSync(':memory:');
  queries = 0;
  constructor() {
    this.sql.exec('PRAGMA foreign_keys=ON');
    for (const name of readdirSync('drizzle').filter(name => /^\d+.*\.sql$/u.test(name)).sort()) {
      this.sql.exec(readFileSync(`drizzle/${name}`, 'utf8'));
    }
  }
  prepare(query: string): D1PreparedStatement {
    const sql = this.sql;
    const count = () => { this.queries++; };
    let values: Array<string | number | null> = [];
    return {
      bind(...parameters) { values = parameters as typeof values; return this; },
      async first<T>(column?: string) { count(); const row = sql.prepare(query).get(...values); return (row ? column ? row[column] : row : null) as T | null; },
      async all<T>() { count(); return { success: true, results: sql.prepare(query).all(...values) as T[] }; },
      async run<T>() {
        count();
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
