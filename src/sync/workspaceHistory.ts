import { createActivityHistoryEvent } from '../learning/activityHistory';
import { isLessonHistoryEvent, type HistoryCategory, type HistoryModule, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import type { WorkspaceEntry } from './workspaceProtocol';
import { forEachHistoryBatch, HISTORY_COOPERATIVE_THRESHOLD } from '../lib/historyWork';

export const WORKSPACE_HISTORY_PREFIX = 'history.activity:';

/** Rebuild missing projections in linear time; retain every original source and descriptor. */
export function workspaceEntriesWithHistory(entries: readonly WorkspaceEntry[]): WorkspaceEntry[] {
  const result = [...entries];
  const keys = new Set(entries.map(entry => entry.key));
  for (const entry of entries) {
    const history = workspaceHistoryEntry(entry);
    if (history && !keys.has(history.key)) { keys.add(history.key); result.push(history); }
  }
  return result;
}

export async function workspaceEntriesWithHistoryCooperatively(entries: readonly WorkspaceEntry[]): Promise<WorkspaceEntry[]> {
  if (entries.length < HISTORY_COOPERATIVE_THRESHOLD) return workspaceEntriesWithHistory(entries);
  const result: WorkspaceEntry[] = [], keys = new Set<string>();
  await forEachHistoryBatch(entries.length, index => {
    result.push(entries[index]); keys.add(entries[index].key);
  });
  await forEachHistoryBatch(entries.length, index => {
    const history = workspaceHistoryEntry(entries[index]);
    if (history && !keys.has(history.key)) { keys.add(history.key); result.push(history); }
  });
  return result;
}
export type WorkspaceHistoryDescriptor = { version: 1; module: HistoryModule; category: HistoryCategory;
  sourceKey: string; sourceChangeId: string; itemId: string; contentVersion: string; occurredAt: string | null;
  outcome: LessonHistoryEventV1['outcome']; hint: boolean | null; reveal: boolean | null; supportKind: string | null; sourceVersion: string;
  sourceId?: string; sourceLessonIds?: string[]; skill?: LessonHistoryEventV1['skill']; modality?: LessonHistoryEventV1['modality']; details?: Record<string, string | number | boolean | null> };
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' && value ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : 'unknown';

export function workspaceHistoryEntry(entry: WorkspaceEntry): WorkspaceEntry | null {
  const value = object(entry.value);
  const attempt = object(value.attempt);
  let module: HistoryModule;
  let category: HistoryCategory;
  if (entry.key.startsWith('activity.record:')) {
    if (value.version !== 1 || typeof value.module !== 'string' || typeof value.category !== 'string') throw new Error('Unreadable practice source; retain journal.');
    module = value.module as HistoryModule; category = value.category as HistoryCategory;
  }
  else if (entry.key.startsWith('practice.correction:')) { module = 'mistakes'; category = 'objective'; }
  else if (entry.key.startsWith('reader.answer:')) { module = 'reader'; category = 'objective'; }
  else if (entry.key.startsWith('reader.support:')) { module = 'reader'; category = 'support'; }
  else if (/^reader\.(saved|bookmark):/.test(entry.key)) { module = 'reader'; category = 'saved-item'; }
  else if (entry.key.startsWith('access:')) { module = 'overview'; category = 'visit'; }
  else if (entry.key.startsWith('exam.practice:')) { module = 'assessment'; category = 'session'; }
  else return null;
  const sourceVersion = text(value.activityVersion ?? value.comprehensionVersion ?? value.formHash ?? value.version);
  const actionTime = value.occurredAt ?? attempt.answeredAt ?? value.submittedAt ?? value.completedAt ?? value.savedAt;
  const occurredAt = typeof actionTime === 'string' && Number.isFinite(Date.parse(actionTime)) ? actionTime
    : typeof actionTime === 'number' && Number.isSafeInteger(actionTime) && actionTime >= 0 && Number.isFinite(new Date(actionTime).getTime()) ? new Date(actionTime).toISOString() : null;
  const correct = typeof value.correct === 'boolean' ? value.correct : typeof attempt.correct === 'boolean' ? attempt.correct : null;
  const sourceChangeId = entry.key.startsWith('exam.practice:') ? `mock-result:${entry.key.slice('exam.practice:'.length)}` : entry.changeId;
  const descriptor: WorkspaceHistoryDescriptor = { version: 1, module, category, sourceKey: entry.key,
    sourceChangeId, itemId: text(value.activityId ?? value.itemId ?? value.questionId ?? value.chapterId ?? entry.key),
    contentVersion: text(value.contentVersion), sourceVersion, occurredAt,
    outcome: category === 'objective' && correct !== null ? correct ? 'correct' : 'incorrect' : 'unknown',
    hint: typeof value.usedHint === 'boolean' ? value.usedHint : null,
    reveal: typeof value.reveal === 'boolean' ? value.reveal : typeof attempt.answerExposed === 'boolean' ? attempt.answerExposed : null,
    supportKind: category === 'support' && typeof value.kind === 'string' ? value.kind : null,
    sourceId: text(value.sourceId ?? value.activityId ?? value.chapterId ?? entry.key),
    modality: ['text', 'audio', 'speech', 'handwriting'].includes(String(value.modality)) ? value.modality as LessonHistoryEventV1['modality'] : module === 'reader' || module === 'mistakes' ? 'text' : 'unknown' };
  if (entry.key.startsWith('activity.record:')) {
    descriptor.hint = typeof value.hint === 'boolean' ? value.hint : null;
    if (value.skill !== undefined) descriptor.skill = value.skill as LessonHistoryEventV1['skill'];
    if (value.sourceLessonIds !== undefined) {
      if (!Array.isArray(value.sourceLessonIds) || !value.sourceLessonIds.every(item => typeof item === 'string')) throw new Error('Unreadable source lesson links; retain journal.');
      descriptor.sourceLessonIds = value.sourceLessonIds;
    }
    if (value.details !== undefined) descriptor.details = value.details as WorkspaceHistoryDescriptor['details'];
    descriptor.outcome = ['correct', 'incorrect', 'unknown', 'self-review'].includes(String(value.outcome)) ? value.outcome as WorkspaceHistoryDescriptor['outcome'] : 'unknown';
    if (!isWorkspaceHistoryDescriptor(descriptor)) throw new Error('Unsupported practice history; retain source.');
  }
  return { key: `${WORKSPACE_HISTORY_PREFIX}${sourceChangeId}`, value: descriptor, changedAt: entry.changedAt, changeId: sourceChangeId };
}

export function isWorkspaceHistoryDescriptor(value: unknown): value is WorkspaceHistoryDescriptor {
  const entry = object(value);
  if (entry.version !== 1 || !['sourceKey', 'sourceChangeId', 'itemId', 'contentVersion', 'sourceVersion'].every(key => typeof entry[key] === 'string' && String(entry[key]).length > 0)) return false;
  try { return isLessonHistoryEvent(workspaceHistoryEvent('validation', 0, value as WorkspaceHistoryDescriptor)); } catch { return false; }
}

export function workspaceHistoryEvent(ownerKey: string, resetEpoch: number, value: WorkspaceHistoryDescriptor): LessonHistoryEventV1 {
  if (value.sourceKey.startsWith('exam.practice:')) {
    const sessionId = value.sourceKey.slice('exam.practice:'.length);
    const event = createActivityHistoryEvent({ ownerKey, resetEpoch, operationId: `mock-session:${sessionId}:submitted`,
      module: 'assessment', category: 'session', sourceId: sessionId, itemId: sessionId, contentVersion: value.contentVersion,
      activityVersion: 'mock-practice-session-v1', occurredAt: value.occurredAt, sourceRecordRef: `workspace:${value.sourceChangeId}`,
      details: { status: 'submitted', scoring: 'server-recorded-practice', measurementEligible: false } });
    return { ...event, sessionId };
  }
  const event = createActivityHistoryEvent({ ownerKey, resetEpoch, operationId: `workspace:${value.sourceChangeId}`, module: value.module,
    category: value.category, sourceId: value.sourceId ?? value.sourceKey, itemId: value.itemId, contentVersion: value.contentVersion,
    activityVersion: value.sourceVersion, sourceRecordRef: `workspace:${value.sourceChangeId}`,
    occurredAt: value.occurredAt, outcome: value.outcome, hint: value.hint, reveal: value.reveal,
    modality: value.modality ?? 'unknown', skill: value.skill, details: value.details, sourceLessonIds: value.sourceLessonIds });
  event.contextRef = value.sourceKey;
  if (value.supportKind && ['pinyin', 'translation', 'tts'].includes(value.supportKind)) {
    event.assistance = { ...event.assistance, [value.supportKind]: true };
  }
  return event;
}

export function workspaceHistoryReceiptRef(value: WorkspaceHistoryDescriptor) {
  return value.sourceKey.startsWith('exam.practice:') ? `mock-session:${value.sourceKey.slice('exam.practice:'.length)}:submitted`
    : `${WORKSPACE_HISTORY_PREFIX}${value.sourceChangeId}`;
}

export function workspaceHistoryEvents(scope: { ownerKey: string; resetEpoch: number }, entries: readonly WorkspaceEntry[], pending: readonly WorkspaceEntry[], server = false) {
  const pendingIds = new Set(pending.map(record => record.changeId));
  return entries.filter(entry => entry.key.startsWith(WORKSPACE_HISTORY_PREFIX)).map(entry => workspaceHistoryEventFromEntry(scope, entry, pendingIds, server));
}

function workspaceHistoryEventFromEntry(scope: { ownerKey: string; resetEpoch: number }, entry: WorkspaceEntry, pendingIds: ReadonlySet<string>, server: boolean) {
    if (!isWorkspaceHistoryDescriptor(entry.value) || entry.key !== `${WORKSPACE_HISTORY_PREFIX}${entry.value.sourceChangeId}` || entry.changeId !== entry.value.sourceChangeId) throw new Error('Unreadable workspace history; retain journal.');
    const confirmed = server || !pendingIds.has(entry.changeId);
    const guest = scope.ownerKey.startsWith('anonymous:');
    return { ...workspaceHistoryEvent(scope.ownerKey, scope.resetEpoch, entry.value),
      authority: guest ? 'local-practice' as const : confirmed ? 'server-recorded' as const : 'unknown' as const,
      lineage: guest ? 'guest-business-commit' as const : server ? 'server-business-record' as const : 'command-journal' as const,
      confirmationState: !guest && confirmed ? 'confirmed' as const : 'provisional' as const,
      receiptRef: !guest && confirmed ? workspaceHistoryReceiptRef(entry.value) : null };
}

export async function workspaceHistoryEventsCooperatively(scope: { ownerKey: string; resetEpoch: number }, entries: readonly WorkspaceEntry[], pending: readonly WorkspaceEntry[], server = false) {
  if (entries.length < HISTORY_COOPERATIVE_THRESHOLD) return workspaceHistoryEvents(scope, entries, pending, server);
  const pendingIds = new Set<string>(), result: LessonHistoryEventV1[] = [];
  await forEachHistoryBatch(pending.length, index => {
    if (index in pending) pendingIds.add(pending[index].changeId);
  });
  await forEachHistoryBatch(entries.length, index => {
    if (index in entries && entries[index].key.startsWith(WORKSPACE_HISTORY_PREFIX)) {
      result.push(workspaceHistoryEventFromEntry(scope, entries[index], pendingIds, server));
    }
  });
  return result;
}
