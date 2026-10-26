import type { D1Database } from './d1';
import { requireCurrentLearningResetEpoch, CURRENT_LEARNING_RESET_EPOCH_SQL } from './learningResetEpoch';
import { validWorkspaceEntry, type WorkspaceEntry, type WorkspaceDocument } from '../sync/workspaceProtocol';
import { workspaceHistoryEntry } from '../sync/workspaceHistory';
import { isImmutableActivityRecordKey, isAdaptiveRecordKey } from '../sync/immutableActivityRecord';

export class WorkspaceRepository {
  constructor(private database: D1Database) {}
  async exchange(userId: string, resetEpoch: number, entries: WorkspaceEntry[]): Promise<WorkspaceDocument> {
    if (!Number.isSafeInteger(resetEpoch) || resetEpoch < 0 || entries.length > 100
      || !entries.every(validWorkspaceEntry) || entries.some(entry => entry.changedAt > Date.now() + 300_000)) throw new Error('Invalid workspace batch');
    await requireCurrentLearningResetEpoch(this.database, userId, resetEpoch);
    if (entries.length) {
      const previous: WorkspaceEntry[] = [];
      for (let offset = 0; offset < entries.length; offset += 80) {
        const keys = entries.slice(offset, offset + 80).map(entry => entry.key);
        const saved = await this.database.prepare(`SELECT entry_key AS key,value_json AS value,changed_at AS changedAt,change_id AS changeId
          FROM learner_workspace_entries WHERE user_id=? AND reset_epoch=? AND entry_key IN (${keys.map(() => '?').join(',')})`)
          .bind(userId, resetEpoch, ...keys).all<{ key: string; value: string; changedAt: number; changeId: string }>();
        if (!saved.success || !Array.isArray(saved.results)) throw new Error('Workspace before-image unavailable; retain source.');
        previous.push(...saved.results.map(entry => ({ ...entry, value: JSON.parse(entry.value) })));
      }
      const commands = new Map(previous.map(entry => [entry.key, entry]));
      for (const entry of entries.filter(entry => isImmutableActivityRecordKey(entry.key))) {
        const saved = commands.get(entry.key);
        if (saved && (saved.changeId !== entry.changeId || JSON.stringify(saved.value) !== JSON.stringify(entry.value))) {
          throw new Error('Conflicting writing/adaptive command; retain pending source.');
        }
        commands.set(entry.key, entry);
      }
      const durableEntries = [...previous.flatMap(entry => {
        const history = workspaceHistoryEntry(entry);
        return history ? [history] : [];
      }), ...entries, ...entries.flatMap(entry => {
        const history = workspaceHistoryEntry(entry);
        return history ? [history] : [];
      })];
      const orderedEntries = [...durableEntries.filter(entry => !entry.key.startsWith('history.activity:')),
        ...durableEntries.filter(entry => entry.key.startsWith('history.activity:'))];
      const results = await this.database.batch(orderedEntries.map(entry => {
        const history = entry.value as { sourceKey?: string; sourceChangeId?: string } | null;
        const writingHistory = entry.key.startsWith('history.activity:') && typeof history?.sourceKey === 'string' && isImmutableActivityRecordKey(history.sourceKey);
        const sourceFence = writingHistory ? ' AND EXISTS (SELECT 1 FROM learner_workspace_entries WHERE user_id=? AND reset_epoch=? AND entry_key=? AND change_id=?)' : '';
        const snapshot = (entry.value as { adaptiveSnapshot?: { id?: unknown; revision?: unknown } } | null)?.adaptiveSnapshot;
        const terminalParams = isAdaptiveRecordKey(entry.key) && typeof snapshot?.id === 'string' && Number.isSafeInteger(snapshot.revision)
          ? [userId, resetEpoch, snapshot.id, snapshot.revision as number] : [];
        const terminalFence = terminalParams.length ? ` AND NOT EXISTS (SELECT 1 FROM learner_workspace_entries
          WHERE user_id=? AND reset_epoch=? AND entry_key >= 'activity.record:["overview","adaptive-state:'
            AND entry_key < 'activity.record:["overview","adaptive-state;'
            AND json_extract(value_json,'$.adaptiveSnapshot.id')=? AND json_extract(value_json,'$.adaptiveSnapshot.archived')=1
            AND json_extract(value_json,'$.adaptiveSnapshot.revision')<?)` : '';
        return this.database.prepare(`
        INSERT INTO learner_workspace_entries (user_id, reset_epoch, entry_key, value_json, changed_at, change_id)
        SELECT ?, ?, ?, ?, ?, ? WHERE ${CURRENT_LEARNING_RESET_EPOCH_SQL}${sourceFence}${terminalFence}
        ON CONFLICT(user_id, reset_epoch, entry_key) DO UPDATE SET
          value_json=excluded.value_json, changed_at=excluded.changed_at, change_id=excluded.change_id
        WHERE learner_workspace_entries.entry_key NOT LIKE 'history.activity:%'
          AND learner_workspace_entries.entry_key NOT LIKE 'activity.record:["writing","writing-state:%'
          AND learner_workspace_entries.entry_key NOT LIKE 'activity.record:["overview","adaptive-state:%'
          AND learner_workspace_entries.entry_key NOT LIKE 'activity.record:["overview","adaptive-recovery:%' AND (
          excluded.changed_at > learner_workspace_entries.changed_at
          OR (excluded.changed_at = learner_workspace_entries.changed_at AND excluded.change_id > learner_workspace_entries.change_id))
      `).bind(userId, resetEpoch, entry.key, JSON.stringify(entry.value ?? null), entry.changedAt, entry.changeId, userId, resetEpoch,
        ...(writingHistory ? [userId, resetEpoch, history!.sourceKey!, history!.sourceChangeId!] : []), ...terminalParams);
      }));
      if (results.some(result => !result.success)) throw new Error('Workspace write failed');
    }
    const result = await this.database.prepare(`SELECT entry_key AS key, value_json AS value, changed_at AS changedAt, change_id AS changeId
      FROM learner_workspace_entries WHERE user_id=? AND reset_epoch=? ORDER BY entry_key`).bind(userId, resetEpoch)
      .all<{ key: string; value: string; changedAt: number; changeId: string }>();
    if (!result.success || !result.results) throw new Error('Workspace read failed');
    await requireCurrentLearningResetEpoch(this.database, userId, resetEpoch);
    return { version: 1, resetEpoch, entries: result.results.map(row => ({ ...row, value: JSON.parse(row.value) })) };
  }
}
