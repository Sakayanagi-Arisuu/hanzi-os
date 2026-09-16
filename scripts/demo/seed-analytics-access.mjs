import { pathToFileURL } from 'node:url';
import { backupLocalDatabase, findLocalDemoDatabase, openDatabase, requireDemoAccounts } from './local-demo-database.mjs';

export function seedAnalyticsAccess(db) {
  requireDemoAccounts(db);
  // Only this existing demo persona: derive days from its quarter-path scenario.
  // Never backfill real users or change authentication sessions / learning evidence.
  return db.prepare(`INSERT INTO learner_access_days(user_id, day, first_seen_at, provenance)
    SELECT user_id, date(occurred_at / 1000, 'unixepoch', '+7 hours'), MIN(occurred_at), 'demo-quarter-path-2026-09'
    FROM learning_attempts WHERE user_id = 'local-demo-user-1'
    AND occurred_at <= ? GROUP BY user_id, date(occurred_at / 1000, 'unixepoch', '+7 hours')
    ON CONFLICT(user_id, day) DO NOTHING`).run(Date.now()).changes;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const apply = process.argv.includes('--apply');
  const db = openDatabase(findLocalDemoDatabase(process.cwd()));
  try {
    requireDemoAccounts(db);
    if (apply) await backupLocalDatabase(db, process.cwd(), 'before-analytics-access');
    db.exec('BEGIN IMMEDIATE');
    const inserted = seedAnalyticsAccess(db);
    if (seedAnalyticsAccess(db) !== 0) throw new Error('Seed is not idempotent');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign key check failed');
    console.log({ mode: apply ? 'apply' : 'rehearse-rollback', inserted,
      totalDays: db.prepare('SELECT count(*) n FROM learner_access_days WHERE user_id=?').get('local-demo-user-1').n });
    db.exec(apply ? 'COMMIT' : 'ROLLBACK');
  } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}
