import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';

export const DEMO_USERS = Object.freeze({
  learner: { id: 'local-demo-user-1', username: 'learner.demo', role: 'learner' },
  editor: { id: 'local-demo-user-2', username: 'editor.demo', role: 'content_editor' },
  admin: { id: 'local-demo-user-3', username: 'admin.demo', role: 'admin' },
});

export function findLocalDemoDatabase(root) {
  const dir = resolve(root, '.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
  if (!existsSync(dir)) throw new Error('D1 local chưa tồn tại. Không tạo hoặc seed database khác.');
  const paths = readdirSync(dir).filter(name => name.endsWith('.sqlite') && name !== 'metadata.sqlite');
  if (paths.length !== 1) throw new Error(`Cần đúng một D1 local, tìm thấy ${paths.length}.`);
  return join(dir, paths[0]);
}

export function requireDemoAccounts(db) {
  for (const account of Object.values(DEMO_USERS)) {
    const row = db.prepare(`SELECT u.status, c.normalized_username username,
      EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role=?) hasRole
      FROM users u JOIN hanzi_password_credentials c ON c.user_id=u.id WHERE u.id=?`)
      .get(account.role, account.id);
    if (!row || row.status !== 'active' || row.username !== account.username || !row.hasRole) {
      throw new Error(`Không đúng tài khoản demo dự kiến: ${account.username}`);
    }
  }
}

export function openDatabase(path, readOnly = false) {
  const db = new DatabaseSync(path, { readOnly });
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000;');
  return db;
}

export async function backupLocalDatabase(db, root, label) {
  const dir = resolve(root, '.wrangler/demo-backups');
  const rel = relative(resolve(root), dir);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error('Backup path ngoài repo.');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
  await backup(db, path);
  return path;
}

export function fingerprint(db, table, condition = '') {
  if (!/^[a-z_]+$/.test(table)) throw new Error('Unsafe table');
  const records = db.prepare(`SELECT * FROM ${table} ${condition} ORDER BY rowid`).all();
  return createHash('sha256').update(JSON.stringify(records)).digest('hex');
}

/** Local CLI adapter; SAVEPOINT preserves the outer all-or-nothing seed. */
export function d1Adapter(db) {
  let serial = 0;
  class Statement {
    constructor(sql, values = []) { this.sql = sql; this.values = values; }
    bind(...values) { return new Statement(this.sql, values); }
    async first(column) {
      const row = db.prepare(this.sql).get(...this.values) ?? null;
      return column ? row?.[column] ?? null : row;
    }
    async all() {
      return { success: true, results: db.prepare(this.sql).all(...this.values), meta: { changes: 0 } };
    }
    async run() {
      const result = db.prepare(this.sql).run(...this.values);
      return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
    }
  }
  return {
    prepare: sql => new Statement(sql),
    async batch(statements) {
      const point = `demo_batch_${++serial}`;
      db.exec(`SAVEPOINT ${point}`);
      try {
        const results = [];
        for (const statement of statements) {
          const query = db.prepare(statement.sql);
          if (query.columns().length) {
            const rows = query.all(...statement.values);
            results.push({ success: true, results: rows, meta: { changes: /^\s*SELECT/i.test(statement.sql) ? 0 : Number(db.prepare('SELECT changes() n').get().n) } });
          } else results.push(await statement.run());
        }
        db.exec(`RELEASE ${point}`);
        return results;
      } catch (error) {
        db.exec(`ROLLBACK TO ${point}; RELEASE ${point}`);
        throw error;
      }
    },
  };
}
