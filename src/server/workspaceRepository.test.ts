import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { D1Database, D1PreparedStatement } from './d1';
import { WorkspaceRepository } from './workspaceRepository';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { activityObservationValue } from '../sync/activityObservations';

it('merges two devices deterministically, preserves deletes and isolates owners and resets', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY); INSERT INTO users VALUES('a'),('b');
      CREATE TABLE learning_documents(user_id TEXT, document_json TEXT);`);
    db.exec(readFileSync(new URL('../../drizzle/0038_offline_workspace.sql', import.meta.url), 'utf8'));
    const adapter = { prepare(sql: string) {
      let values: (string | number)[] = [];
      const statement = { bind(...input: (string | number)[]) { values = input; return statement; },
        first: async () => db.prepare(sql).get(...values) ?? null,
        all: async () => ({ success: true, results: db.prepare(sql).all(...values) }),
        run: async () => { db.prepare(sql).run(...values); return { success: true }; } };
      return statement;
    }, batch: async (statements: D1PreparedStatement[]) => {
      db.exec('BEGIN');
      try { const result = await Promise.all(statements.map(statement => statement.run())); db.exec('COMMIT'); return result; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    } } as unknown as D1Database;
    const repository = new WorkspaceRepository(adapter);
    const first = { key: 'reader.saved:ni', value: { word: '你' }, changedAt: 100, changeId: 'a' };
    await repository.exchange('a', 0, [first]);
    await repository.exchange('a', 0, [{ ...first, value: null, changedAt: 200, changeId: 'b' }]);
    const result = await repository.exchange('a', 0, [first]);
    expect(result.entries.filter(entry => !entry.key.startsWith('history.activity:'))).toEqual([{ ...first, value: null, changedAt: 200, changeId: 'b' }]);
    expect(result.entries.filter(entry => entry.key.startsWith('history.activity:')).map(entry => entry.changeId)).toEqual(['a', 'b']);
    expect((await repository.exchange('b', 0, [])).entries).toEqual([]);
    const writing = { key: 'activity.record:["writing","writing-state:session:0"]', changedAt: 300, changeId: 'writing-first',
      value: { ...activityObservationValue(createActivityHistoryEvent({ ownerKey: 'account:a', resetEpoch: 0,
        operationId: 'writing-state:session:0', module: 'writing', category: 'session', sourceId: 'forge', itemId: '人',
        contentVersion: 'v1', activityVersion: 'source-v1', sourceRecordRef: 'session', occurredAt: null })), writingSnapshot: { retained: true } } };
    await repository.exchange('a', 0, [writing]);
    await repository.exchange('a', 0, [writing]);
    const canonical = await repository.exchange('a', 0, []);
    await expect(repository.exchange('a', 0, [{ ...writing, changedAt: 500, changeId: 'other-device',
      value: { ...writing.value, writingSnapshot: { retained: false } } }, { ...first, key: 'reader.saved:side-effect' }])).rejects.toThrow('Conflicting writing');
    expect(await repository.exchange('a', 0, [])).toEqual(canonical);
    const adaptive = { ...writing, key: 'activity.record:["overview","adaptive-state:pilot:0"]', changeId: 'adaptive-first',
      value: { ...writing.value, module: 'overview', adaptiveSnapshot: { retained: true } } };
    await repository.exchange('a', 0, [adaptive]);
    const adaptiveCanonical = await repository.exchange('a', 0, []);
    await expect(repository.exchange('a', 0, [{ ...adaptive, changeId: 'adaptive-other', changedAt: 600 }])).rejects.toThrow('Conflicting');
    expect(await repository.exchange('a', 0, [])).toEqual(adaptiveCanonical);
    // Duplicate keys in one fresh batch must fail before any side effect commits.
    const fresh = { ...adaptive, key: 'activity.record:["overview","adaptive-state:fresh:0"]' };
    await expect(repository.exchange('a', 0, [fresh, { ...fresh, changeId: 'second-branch' }])).rejects.toThrow('Conflicting');
    expect(await repository.exchange('a', 0, [])).toEqual(adaptiveCanonical);
    const rescue = { ...adaptive, key: 'activity.record:["overview","adaptive-recovery:fixture"]', changeId:'rescue-first',
      value:{...adaptive.value,adaptiveDraftRecovery:{draft:{response:'保留',ime:true}}} };
    await repository.exchange('a',0,[rescue]);
    const withRescue = await repository.exchange('a',0,[]);
    await expect(repository.exchange('a',0,[{...rescue,changeId:'rescue-replaced',changedAt:700}])).rejects.toThrow('Conflicting');
    expect(await repository.exchange('a',0,[])).toEqual(withRescue);
    const archived = { ...adaptive, key:'activity.record:["overview","adaptive-state:terminal:3"]',changeId:'archived',
      value:{...adaptive.value,adaptiveSnapshot:{id:'terminal',revision:3,archived:true}} };
    await repository.exchange('a',0,[archived]);
    const afterArchive = await repository.exchange('a',0,[]);
    const staleClient = {...archived,key:'activity.record:["overview","adaptive-state:terminal:4"]',changeId:'stale-client-write',
      value:{...archived.value,adaptiveSnapshot:{id:'terminal',revision:4}}};
    expect(await repository.exchange('a',0,[staleClient])).toEqual(afterArchive);
    db.prepare('INSERT INTO learning_documents VALUES (?,?)').run('a', '{"reset":{"epoch":1}}');
    await expect(repository.exchange('a', 0, [first])).rejects.toThrow();
    expect((await repository.exchange('a', 1, [])).entries).toEqual([]);
  } finally { db.close(); }
});
