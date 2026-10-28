import { createHistoryYieldCheckpoint, forEachHistoryBatch, HISTORY_COOPERATIVE_THRESHOLD } from '../lib/historyWork';
import type { EvidenceMethod, LearningEvidence, Skill } from "../types";
import { canonicalStringify } from "../sync/canonicalHash";
import { isValidLearningResetEpoch } from "./resetEpoch";

export const LESSON_HISTORY_SCHEMA_VERSION = 1 as const;
export const LESSON_HISTORY_ENTRY_PREFIX = "lesson-history:v1:";
export type HistoryModule = "lessons" | "review" | "mistakes" | "reader" | "assessment" | "dictionary" | "speech" | "writing" | "overview" | "profile";
export type HistoryCategory = "objective" | "self-review" | "support" | "exposure" | "visit" | "preference" | "saved-item" | "session";
export type ReviewHistoryDetails = {
  cardId:string|null; wordId:string; wordVersion:string|null; cardRevision:number|null;
  nextCardRevision:number|null; schedulerVersion:string|null; rating:1|2|3|4|null;
  ratingKind:'self-reported'; reviewModality:string|null; scheduledAt:string|null;
  nextDueAt:string|null; reportedDurationMs:number|null;
};

export type LessonHistoryEventV1 = {
  schemaVersion: 1;
  eventId: string;
  logicalActivityId: string;
  operationId: string;
  eventKind: "observation";
  ownerKey: string;
  resetEpoch: number;
  installationId: string | null;
  deviceId: string | null;
  module: HistoryModule;
  sourceType: "objective-lesson-attempt" | "lesson-page" | "fsrs-review-grade" | "business-activity";
  business?: { version: 1; category: HistoryCategory; details?: Record<string, string | number | boolean | null> };
  review?:ReviewHistoryDetails;
  sourceId: string;
  sourceLessonIds: string[];
  contentVersion: string;
  activityVersion: string;
  itemId: string;
  sessionId: string | null;
  formHash: string | null;
  revisionId: string | null;
  contextRef: string | null;
  attemptId: string | null;
  parentEventId: null;
  skill: Skill | null;
  modality: "text" | "audio" | "speech" | "handwriting" | "unknown";
  taskType: EvidenceMethod | "page-objective" | "page-self-review" | "page-exposure" | "page-support" | `record-${HistoryCategory}`;
  outcome: "correct" | "incorrect" | "unknown" | "self-review";
  score: number | null;
  firstResponseRef: string | null;
  assistance: {
    hint: boolean | null;
    reveal: boolean | null;
    translation: boolean | null;
    pinyin: boolean | null;
    ime: boolean | null;
    tts: boolean | null;
    priorExposure: boolean | null;
  };
  occurredAt: string | null;
  receivedAt: string | null;
  timezone: "Asia/Saigon";
  clockSource: "device-reported" | "unknown" | "server-received";
  duration: null;
  producerVersion: "lesson-history-v1";
  sourceRecordRef: string;
  lineage: "guest-business-commit" | "command-journal" | "server-business-record";
  humanReviewed: null;
  measurementPolicyId: null;
  authority: "local-practice" | "server-verified" | "server-recorded" | "unknown";
  confirmationState: "provisional" | "confirmed" | "quarantined";
  receiptRef: string | null;
  masteryEligible: false;
};

export type LessonHistoryPageV1 = {
  schemaVersion: 1;
  ownerKey: string;
  resetEpoch: number;
  events: LessonHistoryEventV1[];
  nextCursor: { receivedAt: number; attemptId: string } | null;
};

export const lessonHistoryEventId = (ownerKey: string, resetEpoch: number, operationId: string, sourceType?:string) =>
  `${LESSON_HISTORY_ENTRY_PREFIX}${sourceType==='fsrs-review-grade'?'review:':sourceType==='business-activity'?'activity:':''}${JSON.stringify([ownerKey, resetEpoch, operationId])}`;

export function createLessonHistoryEvent(input: {
  ownerKey: string;
  resetEpoch: number;
  operationId: string;
  lessonId: string;
  contentVersion: string;
  activityId: string;
  activityVersion: string;
  method: EvidenceMethod;
  occurredAt: string;
}): LessonHistoryEventV1 {
  const eventId = lessonHistoryEventId(input.ownerKey, input.resetEpoch, input.operationId);
  return {
    schemaVersion: 1, eventId, logicalActivityId: eventId, operationId: input.operationId,
    eventKind: "observation", ownerKey: input.ownerKey, resetEpoch: input.resetEpoch,
    installationId: null, deviceId: null, module: "lessons", sourceType: "objective-lesson-attempt",
    sourceId: input.lessonId, sourceLessonIds: [input.lessonId], contentVersion: input.contentVersion,
    activityVersion: input.activityVersion, itemId: input.activityId, sessionId: null, formHash: null,
    revisionId: null, contextRef: null, attemptId: null,
    parentEventId: null, skill: null, modality: input.method === "listening-selection" ? "audio" : "text",
    taskType: input.method, outcome: "unknown", score: null, firstResponseRef: input.operationId,
    assistance: { hint: null, reveal: null, translation: null, pinyin: null, ime: null, tts: null, priorExposure: null },
    occurredAt: input.occurredAt, receivedAt: null, timezone: "Asia/Saigon", clockSource: "device-reported",
    duration: null, producerVersion: "lesson-history-v1", sourceRecordRef: input.operationId,
    lineage: "command-journal", humanReviewed: null, measurementPolicyId: null, authority: "unknown",
    confirmationState: "provisional", receiptRef: null, masteryEligible: false,
  };
}

export function guestLessonHistoryEvent(input: {
  ownerKey: string;
  resetEpoch: number;
  installationId: string;
  deviceId: string;
  evidence: LearningEvidence;
}): LessonHistoryEventV1 {
  const { evidence } = input;
  const metadata = evidence.metadata;
  if (evidence.source !== "lesson" || typeof metadata?.lessonId !== "string"
    || typeof metadata.sessionId !== "string"
    || !["correct", "incorrect"].includes(evidence.outcome)) {
    throw new Error("Lesson history requires an exact local lesson attempt.");
  }
  const event = createLessonHistoryEvent({
    ...input, operationId: evidence.idempotencyKey, lessonId: metadata.lessonId,
    contentVersion: evidence.contentVersion, activityId: evidence.activityId,
    activityVersion: evidence.activityVersion, method: evidence.method, occurredAt: evidence.occurredAt,
  });
  return {
    ...event, installationId: input.installationId, deviceId: input.deviceId,
    sessionId: metadata.sessionId, contextRef: metadata.sessionId, skill: evidence.skill,
    outcome: evidence.outcome as "correct" | "incorrect", score: evidence.score,
    firstResponseRef: evidence.id, sourceRecordRef: evidence.id,
    assistance: { ...event.assistance, hint: typeof metadata.usedHint === "boolean" ? metadata.usedHint : null,
      priorExposure: typeof metadata.priorExposure === "boolean" ? metadata.priorExposure : null },
    authority: "local-practice", lineage: "guest-business-commit",
  };
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nullableText = (value: unknown) => value === null || (typeof value === "string" && value.length > 0);
const timestamp = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const skills = new Set(["pronunciation", "listening", "speaking", "reading", "writing", "vocabulary", "grammar"]);
const methods = new Set(["meaning-selection", "phonology-recognition", "listening-selection", "typed-character-recall", "reading-comprehension"]);

export function isLessonHistoryEvent(value: unknown): value is LessonHistoryEventV1 {
  if (!record(value) || !record(value.assistance)) return false;
  const review=value.sourceType==='fsrs-review-grade';
  const business=value.sourceType==='business-activity';
  if(business){
    if(!record(value.business)||value.business.version!==1
      ||!['lessons','review','mistakes','reader','assessment','dictionary','speech','writing','overview','profile'].includes(String(value.module))
      ||!['objective','self-review','support','exposure','visit','preference','saved-item','session'].includes(String(value.business.category))
      ||value.taskType!==`record-${value.business.category}`
      ||value.business.details!==undefined&&(!record(value.business.details)||Object.values(value.business.details).some(detail=>detail!==null
        &&!(typeof detail==='string'&&detail.length<=500)&&typeof detail!=='boolean'&&!(typeof detail==='number'&&Number.isFinite(detail))))
      ||!Array.isArray(value.sourceLessonIds)||!value.sourceLessonIds.every(item=>typeof item==='string'&&item.length>0)
      ||!nullableText(value.firstResponseRef)
      ||value.business.category!=='objective'&&(!['unknown','self-review'].includes(String(value.outcome))||value.score!==null)
      ||value.authority==='server-verified'&&(value.business.category!=='objective'||!['correct','incorrect'].includes(String(value.outcome))))return false;
  }
  if(review){
    const details=value.review;
    if(!record(details)||details.ratingKind!=='self-reported'||details.wordId!==value.sourceId
      ||!['cardId','wordVersion','schedulerVersion','reviewModality'].every(key=>nullableText(details[key]))
      ||!['cardRevision','nextCardRevision'].every(key=>details[key]===null||(Number.isSafeInteger(details[key])&&Number(details[key])>=1))
      ||!(details.rating===null||[1,2,3,4].includes(Number(details.rating))&&typeof details.rating==='number')
      ||!['scheduledAt','nextDueAt'].every(key=>details[key]===null||timestamp(details[key]))
      ||!(details.reportedDurationMs===null||Number.isSafeInteger(details.reportedDurationMs)&&Number(details.reportedDurationMs)>=0)
      ||value.taskType!=='fsrs-rating'||value.outcome!=='self-review'||value.score!==null||value.skill!==null
      ||value.firstResponseRef!==null||!Array.isArray(value.sourceLessonIds)||!value.sourceLessonIds.every(item=>typeof item==='string'&&item.length>0))return false;
  }
  return value.schemaVersion === 1 && value.eventKind === "observation" && (business||value.module === (review?'review':'lessons'))
    && ["objective-lesson-attempt", "lesson-page", "fsrs-review-grade", "business-activity"].includes(String(value.sourceType)) && value.masteryEligible === false
    && typeof value.ownerKey === "string" && value.ownerKey.length > 0
    && isValidLearningResetEpoch(value.resetEpoch) && typeof value.operationId === "string"
    && value.operationId.length > 0
    && value.eventId === lessonHistoryEventId(value.ownerKey, value.resetEpoch, value.operationId,String(value.sourceType))
    && value.logicalActivityId === value.eventId
    && ["sourceId", "contentVersion", "activityVersion", "itemId", "sourceRecordRef"]
      .every((key) => typeof value[key] === "string" && String(value[key]).length > 0)
    && (business?nullableText(value.firstResponseRef):review||value.sourceType==='lesson-page'&&['page-exposure','page-support'].includes(String(value.taskType))
      ?value.firstResponseRef===null:typeof value.firstResponseRef==='string'&&value.firstResponseRef.length>0)
    && (review||business||Array.isArray(value.sourceLessonIds) && value.sourceLessonIds.length === 1 && value.sourceLessonIds[0] === value.sourceId)
    && ["installationId", "deviceId", "sessionId", "formHash", "contextRef", "attemptId", "receiptRef"].every((key) => nullableText(value[key]))
    && (value.skill === null || skills.has(String(value.skill)))
    && (review||business|| (value.sourceType === "lesson-page" ? ["page-objective", "page-self-review", "page-exposure", "page-support"].includes(String(value.taskType)) : methods.has(String(value.taskType))))
    && ["text", "audio", ...(business?['speech','handwriting','unknown']:[])].includes(String(value.modality))
    && ["correct", "incorrect", "unknown", ...(review||business||value.sourceType === "lesson-page" ? ["self-review"] : [])].includes(String(value.outcome))
    && (value.score === null || value.score === 0 || value.score === 100)
    && (["unknown", "self-review"].includes(String(value.outcome)) ? value.score === null : value.score === (value.outcome === "correct" ? 100 : 0))
    && ["hint", "reveal", "translation", "pinyin", "ime", "tts", "priorExposure"]
      .every((key) => value.assistance !== null && (value.assistance as Record<string, unknown>)[key] !== undefined
        && ((value.assistance as Record<string, unknown>)[key] === null || typeof (value.assistance as Record<string, unknown>)[key] === "boolean"))
    && (timestamp(value.occurredAt) || ((review||business||value.sourceType === "lesson-page") && value.occurredAt === null && value.clockSource === "unknown")) && (value.receivedAt === null || timestamp(value.receivedAt))
    && value.parentEventId === null && nullableText(value.revisionId) && value.duration === null && value.humanReviewed === null
    && value.measurementPolicyId === null && value.producerVersion === "lesson-history-v1"
    && value.timezone === "Asia/Saigon" && ["device-reported", ...(review||business?['unknown','server-received']:value.sourceType === "lesson-page" ? ["unknown"] : [])].includes(String(value.clockSource))
    && ["guest-business-commit", "command-journal", "server-business-record"].includes(String(value.lineage))
    && ["local-practice", "server-verified", ...(review||business||value.sourceType === "lesson-page" ? ["server-recorded"] : []), "unknown"].includes(String(value.authority))
    && ["provisional", "confirmed", "quarantined"].includes(String(value.confirmationState))
    && (value.confirmationState !== "confirmed" || (typeof value.receiptRef === "string" && (review?value.authority==='server-recorded':business||value.sourceType === "lesson-page"
      ? ["server-recorded", "server-verified"].includes(String(value.authority))
      : value.authority === "server-verified" && value.outcome !== "unknown" && value.skill !== null)));
}

type HistoryProjectionScope = { ownerKey: string; resetEpoch: number };

function addHistoryProjectionEvent(scope: HistoryProjectionScope, result: Map<string, LessonHistoryEventV1>, event: LessonHistoryEventV1) {
    if (!isLessonHistoryEvent(event) || event.ownerKey !== scope.ownerKey || event.resetEpoch !== scope.resetEpoch)
      throw new Error("Lesson history version or scope is invalid; retain the source records.");
    const previous = result.get(event.eventId);
    if (previous) {
      const identity = (entry: LessonHistoryEventV1) => canonicalStringify([
        entry.sourceType, entry.operationId, entry.sourceId, entry.contentVersion, entry.itemId, entry.activityVersion, entry.sourceType==='lesson-page'?null:entry.taskType,
      ]);
      if (identity(previous) !== identity(event)
        || (previous.receiptRef && event.receiptRef && previous.receiptRef !== event.receiptRef)
        || (previous.assistance.hint !== null && event.assistance.hint !== null
          && previous.assistance.hint !== event.assistance.hint)
        || (previous.outcome !== "unknown" && event.outcome !== "unknown" && previous.outcome !== event.outcome))
        throw new Error("Conflicting lesson history records; retain both source records.");
      if(previous.review&&event.review&&['cardId','wordId','wordVersion','cardRevision','rating','schedulerVersion'].some(key=>{
        const left=previous.review![key as keyof ReviewHistoryDetails],right=event.review![key as keyof ReviewHistoryDetails];
        return left!==null&&right!==null&&left!==right;
      }))throw new Error('Conflicting review history; retain source records.');
      if (previous.confirmationState === "confirmed"
        && (event.confirmationState !== "confirmed" || previous.receivedAt !== null)
        && !(event.sourceType === 'business-activity' && previous.outcome === 'unknown'
          && event.authority === 'server-verified' && ['correct', 'incorrect'].includes(event.outcome))) return;
    }
    result.set(event.eventId, previous&&event.sourceType==='lesson-page'?{...event,revisionId:event.revisionId??previous.revisionId}:event);
}

const compareHistoryEvents = (left: LessonHistoryEventV1, right: LessonHistoryEventV1) =>
  (right.occurredAt ?? "").localeCompare(left.occurredAt ?? "") || right.eventId.localeCompare(left.eventId);
function sortedHistoryProjection(result: Map<string, LessonHistoryEventV1>): LessonHistoryEventV1[] {
  return [...result.values()].sort(compareHistoryEvents);
}

async function sortedHistoryProjectionCooperatively(result: Map<string, LessonHistoryEventV1>) {
  let source = [...result.values()], target = new Array<LessonHistoryEventV1>(source.length);
  const checkpoint = createHistoryYieldCheckpoint();
  let work = 0, deadline = performance.now() + 8;
  for (let width = 1; width < source.length; width *= 2) {
    for (let start = 0; start < source.length; start += width * 2) {
      const middle = Math.min(start + width, source.length), end = Math.min(start + width * 2, source.length);
      let left = start, right = middle, position = start;
      while (left < middle || right < end) {
        // Left wins comparator ties, matching stable Array.sort exactly.
        target[position++] = left < middle && (right >= end || compareHistoryEvents(source[left], source[right]) <= 0)
          ? source[left++] : source[right++];
        if (++work % 512 === 0 && performance.now() >= deadline) {
          await checkpoint(); deadline = performance.now() + 8;
        }
      }
    }
    [source, target] = [target, source];
  }
  return source;
}

export function projectLessonHistory(scope: HistoryProjectionScope, events: readonly LessonHistoryEventV1[]): LessonHistoryEventV1[] {
  const result = new Map<string, LessonHistoryEventV1>();
  for (const event of events) addHistoryProjectionEvent(scope, result, event);
  return sortedHistoryProjection(result);
}

export async function projectLessonHistoryCooperatively(scope: HistoryProjectionScope, events: readonly LessonHistoryEventV1[]): Promise<LessonHistoryEventV1[]> {
  return projectLessonHistoryGroupsCooperatively(scope, [events]);
}

/** Reconcile source groups in the same order without a full concatenated input
 * array. The canonical reducer still validates every event, including groups
 * that do not contribute any new IDs. */
export async function projectLessonHistoryGroupsCooperatively(scope: HistoryProjectionScope,
  groups: readonly (readonly LessonHistoryEventV1[])[]): Promise<LessonHistoryEventV1[]> {
  const length = groups.reduce((count, group) => count + group.length, 0);
  const cooperative = length >= HISTORY_COOPERATIVE_THRESHOLD;
  const result = new Map<string, LessonHistoryEventV1>();
  let group = 0, position = 0;
  const visit = () => {
    while (position >= groups[group].length) { group++; position = 0; }
    addHistoryProjectionEvent(scope, result, groups[group][position++]);
  };
  if (cooperative) await forEachHistoryBatch(length, visit);
  else for (let index = 0; index < length; index++) visit();
  return cooperative ? sortedHistoryProjectionCooperatively(result) : sortedHistoryProjection(result);
}
