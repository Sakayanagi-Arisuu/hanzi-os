import { LocalHistoryReadBatch } from './localHistoryReadBatch';
import { createActivityHistoryEvent, guestActivityHistoryEvent } from '../learning/activityHistory';
import { assessmentSessionHistoryEvent } from '../learning/assessmentHistory';
import { mockPracticeHistoryEvents } from '../learning/mockPracticeHistory';
import { readMockPracticeRuns } from './offlineMockPractice';
import { isLessonHistoryEvent, LESSON_HISTORY_ENTRY_PREFIX, projectLessonHistoryCooperatively, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { type LearningCommandOutboxRecord } from './learningCommandOutbox';
import { readActiveOwnerLearningScope, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';
import { PAGE_CORRECTION_HISTORY_PREFIX } from './mistakeHistory';
import { readWorkspaceCooperatively } from './workspaceSync';
import { workspaceEntriesWithHistoryCooperatively, workspaceHistoryEventsCooperatively } from './workspaceHistory';
import { readAccountLessonHistoryPage } from './lessonHistory';

export function commandActivityHistoryEvents(records: readonly LearningCommandOutboxRecord[]): LessonHistoryEventV1[] {
  const byRecordKey = new Map<string, LearningCommandOutboxRecord>();
  for (const record of records) if (!byRecordKey.has(record.recordKey)) byRecordKey.set(record.recordKey, record);
  return records.flatMap<LessonHistoryEventV1>(entry => {
    if (entry.kind === 'assessment-session-open' || entry.kind === 'assessment-session-submit' || entry.kind === 'assessment-session-abandon') {
      if (entry.outboxVersion !== 1 || entry.commandId !== entry.command.idempotencyKey || entry.resetEpoch !== entry.command.resetEpoch
        || !['pending', 'acknowledged', 'quarantined'].includes(entry.status) || entry.status === 'acknowledged' && !entry.receipt) throw new Error('Unsupported session journal; retain source.');
      return [assessmentSessionHistoryEvent({ ownerKey: entry.ownerKey, resetEpoch: entry.resetEpoch,
        operationId: entry.command.idempotencyKey, contentVersion: entry.command.contentVersion,
        action: entry.kind === 'assessment-session-open' ? 'open' : entry.kind === 'assessment-session-submit' ? 'submit' : 'abandon',
        sourceRecordRef: entry.recordKey, sessionAlias: entry.sessionAlias, quarantined: entry.status === 'quarantined',
        receipt: entry.status === 'acknowledged' ? entry.receipt : undefined })];
    }
    if (entry.kind === 'reader-attempt' || entry.kind === 'assessment-attempt') {
      const command = entry.command;
      const receipt = entry.status === 'acknowledged' ? entry.receipt : null;
      if (entry.outboxVersion !== 1 || entry.commandId !== command.idempotencyKey || entry.resetEpoch !== command.resetEpoch
        || !['pending', 'acknowledged', 'quarantined'].includes(entry.status)) throw new Error('Unsupported attempt journal; retain source.');
      if (entry.status === 'acknowledged' && (!receipt || receipt.idempotencyKey !== command.idempotencyKey
        || receipt.itemId !== command.itemId || receipt.itemVersion !== command.itemVersion || receipt.resetEpoch !== command.resetEpoch
        || receipt.contentVersion !== command.contentVersion)) throw new Error('Conflicting attempt receipt; retain source.');
      const dependency = byRecordKey.get(entry.dependencyRecordKey);
      const storyId = dependency?.kind === 'reader-session-open' ? dependency.command.storyId
        : dependency?.kind === 'projected-reader-session-anchor' ? dependency.binding.storyId : null;
      if (entry.kind === 'reader-attempt' && !storyId) throw new Error('Missing reader history binding; retain journal.');
      const activityId = entry.kind === 'reader-attempt' ? `${storyId}:${command.itemId}` : command.itemId;
      const readerReceipt = entry.kind === 'reader-attempt' && entry.status === 'acknowledged' ? entry.receipt : null;
      const event = createActivityHistoryEvent({ ownerKey: entry.ownerKey, resetEpoch: entry.resetEpoch, operationId: command.idempotencyKey,
        module: entry.kind === 'reader-attempt' ? 'reader' : 'assessment', category: 'objective', sourceId: activityId, itemId: activityId,
        contentVersion: command.contentVersion, activityVersion: command.itemVersion, sourceRecordRef: entry.recordKey,
        occurredAt: command.occurredAt, outcome: readerReceipt?.outcome ?? 'unknown', modality: 'text' });
      return [{ ...event, sessionId: receipt?.sessionId ?? entry.sessionAlias, formHash: receipt?.formHash ?? null,
        attemptId: receipt?.attemptId ?? null, receiptRef: receipt?.attemptId ?? null, skill: receipt?.skill ?? null,
        installationId: command.installationId, deviceId: command.deviceId,
        assistance: { ...event.assistance, priorExposure: readerReceipt?.priorExposure ?? null },
        authority: readerReceipt ? 'server-verified' : receipt ? 'server-recorded' : 'unknown',
        confirmationState: receipt ? 'confirmed' : entry.status === 'quarantined' ? 'quarantined' : 'provisional' }];
    }
    if (entry.kind !== 'objective-attempt' || entry.command.source === 'lesson') return [];
    const command = entry.command;
    if (entry.outboxVersion !== 1 || !['reader', 'mistake'].includes(command.source)
      || entry.commandId !== command.idempotencyKey || entry.resetEpoch !== command.resetEpoch
      || !['pending', 'acknowledged', 'quarantined'].includes(entry.status)) throw new Error('Unsupported activity journal; retain source.');
    const receipt = entry.status === 'acknowledged' ? entry.receipt : null;
    if (entry.status === 'acknowledged' && (!receipt || receipt.idempotencyKey !== command.idempotencyKey
      || receipt.resetEpoch !== command.resetEpoch || receipt.activityId !== command.activityId
      || receipt.activityVersion !== command.activityVersion || receipt.source !== command.source
      || receipt.verification !== 'server-objective')) throw new Error('Conflicting activity receipt; retain source.');
    const event = createActivityHistoryEvent({ ownerKey: entry.ownerKey, resetEpoch: entry.resetEpoch,
      operationId: command.idempotencyKey, module: command.source === 'mistake' ? 'mistakes' : 'reader', category: 'objective',
      sourceId: command.activityId, itemId: command.activityId, contentVersion: command.contentVersion,
      activityVersion: command.activityVersion, sourceRecordRef: entry.recordKey, occurredAt: command.occurredAt,
      outcome: receipt?.outcome ?? 'unknown', hint: command.response.usedHint,
      modality: command.method === 'listening-selection' ? 'audio' : 'text' });
    return [{ ...event, installationId: command.installationId, deviceId: command.deviceId,
      attemptId: receipt?.attemptId ?? null, receiptRef: receipt?.attemptId ?? null, skill: receipt?.skill ?? null,
      authority: receipt ? 'server-verified' : 'unknown',
      confirmationState: receipt ? 'confirmed' : entry.status === 'quarantined' ? 'quarantined' : 'provisional' }];
  });
}

export async function readLocalActivityHistory(scope: ActiveOwnerLearningScope, batch = new LocalHistoryReadBatch(scope)) {
  const owner = { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch };
  const [records, commands, state, workspace] = await Promise.all([batch.resumes(scope),
    batch.commands(scope), batch.state(scope), readWorkspaceCooperatively(scope)]);
  const events: LessonHistoryEventV1[] = [];
  events.push(...mockPracticeHistoryEvents(owner.ownerKey, owner.resetEpoch, await readMockPracticeRuns(scope)));
  for (const record of records) {
    if (record.entryKey.startsWith(LESSON_HISTORY_ENTRY_PREFIX)) {
      if (!isLessonHistoryEvent(record.value)) throw new Error('Unreadable activity journal; retain source.');
      if (record.value.sourceType === 'business-activity') events.push(record.value);
    }
    if (record.entryKey.startsWith(PAGE_CORRECTION_HISTORY_PREFIX)) {
      if (!Array.isArray(record.value) || !record.value.every(isLessonHistoryEvent)) throw new Error('Unreadable correction history; retain source.');
      events.push(...record.value);
    }
  }
  if (owner.ownerKey.startsWith('anonymous:') && state) {
    if (state.schemaVersion !== 2 || !Array.isArray(state.evidence)) throw new Error('Unsupported business state; retain source.');
    const eventIds = new Set(events.map(event => event.eventId));
    for (const evidence of state.evidence) {
      if (evidence.source === 'lesson' || evidence.source === 'review') continue;
      const event = guestActivityHistoryEvent({ ...owner, evidence });
      if (!eventIds.has(event.eventId)) { eventIds.add(event.eventId); events.push(event); }
    }
  }
  const workspaceEntries = await workspaceEntriesWithHistoryCooperatively(workspace.entries);
  for (const event of await workspaceHistoryEventsCooperatively(owner, workspaceEntries, workspace.pending)) events.push(event);
  for (const event of commandActivityHistoryEvents(commands.filter(entry => entry.resetEpoch === scope.resetEpoch))) events.push(event);
  const projected = await projectLessonHistoryCooperatively(owner, events);
  const active = await readActiveOwnerLearningScope();
  if (!active || active.resetEpoch !== scope.resetEpoch || active.ownerGeneration.ownerKey !== owner.ownerKey
    || active.ownerGeneration.generation !== scope.ownerGeneration.generation) throw new StaleOwnerGenerationError();
  return projected;
}

export async function readAccountActivityHistoryPage(scope: ActiveOwnerLearningScope,
  options: Parameters<typeof readAccountLessonHistoryPage>[1] = {}) {
  const page = await readAccountLessonHistoryPage(scope, { ...options, source: 'activity' });
  if (!page.events.every(event => event.sourceType === 'business-activity')) throw new Error('Unsupported history source; retain local records.');
  return page;
}
