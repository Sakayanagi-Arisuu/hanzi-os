import { LocalHistoryReadBatch } from './localHistoryReadBatch';
import {
  createLessonHistoryEvent, isLessonHistoryEvent, LESSON_HISTORY_ENTRY_PREFIX,
  projectLessonHistory, projectLessonHistoryCooperatively, type LessonHistoryEventV1, type LessonHistoryPageV1,
} from "../learning/lessonHistory";
import {
  readActiveOwnerLearningScope, StaleOwnerGenerationError,
  type ActiveOwnerLearningScope,
} from "./indexedDb";
import { type LearningCommandOutboxRecord } from "./learningCommandOutbox";
import {readingPageHistory,pageCommandHistoryEvent,validatePageHistory} from '../learning/lessonPageHistory';
import {parseLessonReadingSession} from '../learning/lessonReadingSession';
import {readPageAttemptOutbox} from './pageAttemptOutbox';

async function requireScope(scope: ActiveOwnerLearningScope) {
  const active = await readActiveOwnerLearningScope();
  if (!active || active.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
    || active.ownerGeneration.generation !== scope.ownerGeneration.generation
    || active.resetEpoch !== scope.resetEpoch) throw new StaleOwnerGenerationError();
}

export function commandLessonHistoryEvents(records: readonly LearningCommandOutboxRecord[]): LessonHistoryEventV1[] {
  const byRecordKey = new Map<string, LearningCommandOutboxRecord>();
  for (const record of records) if (!byRecordKey.has(record.recordKey)) byRecordKey.set(record.recordKey, record);
  return records.flatMap((entry) => {
    if (entry.kind !== "objective-attempt" || entry.command.source !== "lesson") return [];
    const dependency = entry.dependencyRecordKey === null ? undefined : byRecordKey.get(entry.dependencyRecordKey);
    const binding = dependency?.kind === "lesson-session-open" ? dependency.receipt
      : dependency?.kind === "projected-lesson-session-anchor" ? dependency.binding : null;
    const lessonId = binding?.lessonId ?? (dependency?.kind === "lesson-session-open" ? dependency.command.lessonId : null);
    if (!lessonId) throw new Error("Lesson history dependency is missing; keep the command journal.");
    const activity = binding?.form.activities.find((item) => item.activityId === entry.command.activityId
      && item.activityVersion === entry.command.activityVersion);
    const event = createLessonHistoryEvent({
      ownerKey: entry.ownerKey, resetEpoch: entry.resetEpoch, operationId: entry.command.idempotencyKey,
      lessonId, contentVersion: entry.command.contentVersion, activityId: entry.command.activityId,
      activityVersion: entry.command.activityVersion, method: entry.command.method, occurredAt: entry.command.occurredAt,
    });
    const receipt = entry.status === "acknowledged" ? entry.receipt : null;
    if (entry.status === "acknowledged" && (!receipt || receipt.idempotencyKey !== entry.commandId
      || receipt.resetEpoch !== entry.resetEpoch || receipt.source !== "lesson"
      || receipt.activityId !== entry.command.activityId || receipt.activityVersion !== entry.command.activityVersion
      || receipt.method !== entry.command.method || receipt.verification !== "server-objective"))
      throw new Error("Lesson history receipt does not match its command.");
    return [{ ...event, installationId: entry.command.installationId, deviceId: entry.command.deviceId,
      sessionId: binding?.sessionId ?? entry.sessionAlias, formHash: binding?.formHash ?? null,
      contextRef: binding?.sessionId ?? entry.sessionAlias, skill: receipt?.skill ?? activity?.skill ?? null,
      attemptId: receipt?.attemptId ?? null, outcome: receipt?.outcome ?? "unknown", score: receipt?.score ?? null,
      sourceRecordRef: entry.recordKey, assistance: { ...event.assistance, hint: entry.command.response.usedHint },
      authority: receipt ? "server-verified" : "unknown",
      confirmationState: receipt ? "confirmed" : entry.status === "quarantined" ? "quarantined" : "provisional",
      receiptRef: receipt?.attemptId ?? null,
    } satisfies LessonHistoryEventV1];
  });
}

export async function readLocalLessonHistory(scope: ActiveOwnerLearningScope, batch = new LocalHistoryReadBatch(scope)): Promise<LessonHistoryEventV1[]> {
  const [snapshots, commands] = await Promise.all([
    batch.resumes(scope), batch.commands(scope),
  ]);
  const events = snapshots.filter((entry) => entry.entryKey.startsWith(LESSON_HISTORY_ENTRY_PREFIX)).map((entry) => {
    if (!isLessonHistoryEvent(entry.value)) throw new Error("Stored lesson history is unreadable; retain its raw record.");
    if (entry.value.module !== 'lessons') return null;
    if (entry.value.lineage !== "guest-business-commit"
      || entry.value.authority !== "local-practice" || entry.value.confirmationState !== "provisional")
      throw new Error("Stored lesson history is unreadable; retain its raw record.");
    return entry.value;
  }).filter((event): event is LessonHistoryEventV1 => event !== null);
  events.push(...commandLessonHistoryEvents(commands.filter((entry) => entry.resetEpoch === scope.resetEpoch)));
  for(const entry of snapshots){
    if(entry.entryKey.startsWith('lesson-page-history:v1:')){
      events.push(...validatePageHistory(entry.value,scope.ownerGeneration.ownerKey,scope.resetEpoch).map(record=>record.event));
      continue;
    }
    if(!entry.entryKey.startsWith('lesson-reading:v1:'))continue;
    const value=entry.value as {lessonId?:unknown};
    const snapshot=typeof value?.lessonId==='string'?parseLessonReadingSession(value,value.lessonId):null;
    if(!snapshot)throw new Error('Unreadable reading history source; retain snapshot.');
    events.push(...(await readingPageHistory(scope.ownerGeneration.ownerKey,scope.resetEpoch,snapshot)).map(record=>record.event));
  }
  if(/^siwc_[a-f0-9]{64}$/.test(scope.ownerGeneration.ownerKey)){
    const byOperation = new Map<string, LessonHistoryEventV1>();
    for (const event of events) if (event.sourceType === 'lesson-page' && !byOperation.has(event.operationId)) byOperation.set(event.operationId, event);
    for(const entry of await readPageAttemptOutbox(scope)){
      const event=byOperation.get(entry.command.idempotencyKey)
        ??pageCommandHistoryEvent(scope.ownerGeneration.ownerKey,entry.command);
      const receipt=entry.delivery?.status==='acknowledged'?entry.delivery.receipt:null;
      events.push({...event,attemptId:receipt?.attemptId??null,receiptRef:receipt?.attemptId??null,
        taskType:receipt?.outcome==='self-review'&&event.taskType==='page-objective'?'page-self-review':event.taskType,
        outcome:receipt?(entry.command.observation?event.outcome:receipt.outcome):event.outcome,
        score:receipt&&!entry.command.observation?(receipt.outcome==='correct'?100:receipt.outcome==='incorrect'?0:null):null,
        authority:receipt?(entry.command.observation?'server-recorded':'server-verified'):'unknown',
        confirmationState:receipt?'confirmed':entry.delivery?.status==='conflict'?'quarantined':'provisional'});
    }
  }
  const projected = await projectLessonHistoryCooperatively({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch }, events);
  await requireScope(scope);
  return projected;
}

export async function readAccountLessonHistoryPage(scope: ActiveOwnerLearningScope, options: {
  cursor?: LessonHistoryPageV1["nextCursor"];
  limit?: number;
  send?: typeof fetch;
  source?:'lesson'|'review'|'activity';
} = {}): Promise<LessonHistoryPageV1> {
  await requireScope(scope);
  const query = new URLSearchParams({ resetEpoch: String(scope.resetEpoch), limit: String(options.limit ?? 50) });
  if (options.cursor) query.set("cursor", JSON.stringify(options.cursor));
  const response = await (options.send ?? fetch)(`/api/learning/${options.source ?? 'lesson'}-history?${query}`, {
    cache: "no-store", headers: { "x-learning-owner": scope.ownerGeneration.ownerKey }, credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`Lesson history unavailable: ${response.status}. Local records are retained.`);
  const page = await response.json() as LessonHistoryPageV1;
  if (page.schemaVersion !== 1 || page.ownerKey !== scope.ownerGeneration.ownerKey
    || page.resetEpoch !== scope.resetEpoch || !Array.isArray(page.events)
    || (page.nextCursor !== null && (!page.nextCursor || !Number.isSafeInteger(page.nextCursor.receivedAt)
      || page.nextCursor.receivedAt < 0 || typeof page.nextCursor.attemptId !== "string" || !page.nextCursor.attemptId)))
    throw new Error("Unsupported lesson history response; local records are retained.");
  projectLessonHistory(page, page.events);
  await requireScope(scope);
  return page;
}
