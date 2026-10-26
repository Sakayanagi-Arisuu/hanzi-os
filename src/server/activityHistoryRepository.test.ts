import { afterEach, expect, it } from 'vitest';
import { FixtureD1 } from './testing/FixtureD1';
import { ActivityHistoryRepository } from './activityHistoryRepository';
import { WorkspaceRepository } from './workspaceRepository';
import { projectLessonHistory } from '../learning/lessonHistory';

const databases: FixtureD1[] = [];
const fixture = () => {
  const database = new FixtureD1(); databases.push(database);
  database.sql.exec("INSERT INTO users (id,status,created_at,updated_at) VALUES ('history-a','active',0,0),('history-b','active',0,0)");
  return database;
};
afterEach(() => databases.splice(0).forEach(database => database.sql.close()));

it('backfills only actual legacy workspace records and preserves their before-images in the update transaction', async () => {
  const database = fixture();
  const source = { key: 'practice.correction:source', changeId: 'legacy-change', changedAt: 100,
    value: { correct: false, usedHint: true, activityVersion: 'old-item', activityId: 'item' } };
  database.sql.prepare('INSERT INTO learner_workspace_entries (user_id,reset_epoch,entry_key,value_json,changed_at,change_id) VALUES (?,0,?,?,?,?)')
    .run('history-a', source.key, JSON.stringify(source.value), source.changedAt, source.changeId);
  const history = new ActivityHistoryRepository(database);
  const before = await history.readPage('history-a', 'account:a', 0);
  expect(before.events).toMatchObject([{ module: 'mistakes', operationId: 'workspace:legacy-change', activityVersion: 'old-item',
    outcome: 'incorrect', authority: 'server-recorded', confirmationState: 'confirmed', masteryEligible: false }]);
  expect(await history.readPage('history-a', 'account:a', 0)).toEqual(before);
  await new WorkspaceRepository(database).exchange('history-a', 0, [{ ...source, changeId: 'new-change', changedAt: 200, value: { ...source.value, correct: true } }]);
  const after = await history.readPage('history-a', 'account:a', 0);
  expect(after.events).toHaveLength(2);
  expect(projectLessonHistory({ ownerKey: 'account:a', resetEpoch: 0 }, [...before.events, ...after.events])).toHaveLength(2);
  expect((await history.readPage('history-b', 'account:b', 0)).events).toEqual([]);
});

it('paginates tied timestamps, fails closed on reset/schema errors and never rewrites source data', async () => {
  const database = fixture();
  const workspace = new WorkspaceRepository(database);
  await workspace.exchange('history-a', 0, [
    { key: 'reader.saved:first', changeId: 'first', changedAt: 100, value: true },
    { key: 'reader.saved:second', changeId: 'second', changedAt: 100, value: true },
  ]);
  const history = new ActivityHistoryRepository(database);
  const first = await history.readPage('history-a', 'account:a', 0, { limit: 1 });
  const second = await history.readPage('history-a', 'account:a', 0, { limit: 1, cursor: first.nextCursor });
  expect(first.nextCursor).not.toBeNull(); expect(second.nextCursor).toBeNull();
  expect(new Set([...first.events, ...second.events].map(event => event.eventId)).size).toBe(2);
  await expect(history.readPage('history-a', 'account:a', 1)).rejects.toThrow();
  database.sql.prepare("UPDATE learner_workspace_entries SET value_json=? WHERE entry_key='history.activity:first'")
    .run('{"version":99,"raw":"preserve"}');
  const before = database.sql.prepare('SELECT * FROM learner_workspace_entries ORDER BY entry_key').all();
  await expect(history.readPage('history-a', 'account:a', 0)).rejects.toThrow('retain');
  expect(database.sql.prepare('SELECT * FROM learner_workspace_entries ORDER BY entry_key').all()).toEqual(before);
});
