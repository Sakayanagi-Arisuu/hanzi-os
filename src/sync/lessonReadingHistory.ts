import { readingPageHistory, validatePageHistory } from '../learning/lessonPageHistory';
import { parseLessonReadingSession, type LessonReadingSession } from '../learning/lessonReadingSession';
import { canonicalStringify } from './canonicalHash';
import { updateLessonResume, type OwnerScopedCacheScope } from './indexedDb';
import type {PageHistoryRecord} from '../learning/lessonPageHistory';

const activityKey=(record:PageHistoryRecord)=>['page-objective','page-self-review'].includes(record.event.taskType)
  ?canonicalStringify([record.event.sourceId,record.event.contentVersion,record.event.itemId,record.event.activityVersion,'first-response'])
  :record.event.eventId;

export async function persistLessonReadingHistory(scope:OwnerScopedCacheScope,snapshot:LessonReadingSession) {
  const ownerKey=scope.expectedOwnerGeneration.ownerKey;
  const incoming=await readingPageHistory(ownerKey,scope.resetEpoch,snapshot);
  return updateLessonResume(scope,previous=>{
    const saved=previous===undefined?null:parseLessonReadingSession(previous,snapshot.lessonId);
    if(previous!==undefined&&!saved)throw new Error('Unreadable reading snapshot; retain source.');
    if(saved&&canonicalStringify(saved.document)!==canonicalStringify(snapshot.document))throw new Error('Reading version changed in another tab; retain both sources.');
    const history=validatePageHistory(saved?.pageHistory,ownerKey,scope.resetEpoch);
    const records=new Map(history.map(record=>[activityKey(record),record]));
    for(const record of incoming)if(!records.has(activityKey(record)))records.set(activityKey(record),record);
    const drafts={...saved?.drafts,...snapshot.drafts};
    for(const [blockId,draft] of Object.entries(saved?.drafts??{})){
      if(draft.firstAttempt)drafts[blockId]={...drafts[blockId],firstAttempt:draft.firstAttempt};
    }
    const observations=new Map((saved?.observations??[]).map(entry=>[JSON.stringify([entry.pageId,entry.blockId,entry.action]),entry]));
    for(const entry of snapshot.observations??[])if(!observations.has(JSON.stringify([entry.pageId,entry.blockId,entry.action])))observations.set(JSON.stringify([entry.pageId,entry.blockId,entry.action]),entry);
    return {...snapshot,drafts,observations:[...observations.values()],pageHistory:[...records.values()]};
  },{entryKey:`lesson-page-history:v1:${JSON.stringify(snapshot.lessonId)}`,update:(previous,value)=>{
    const records=new Map(validatePageHistory(previous,ownerKey,scope.resetEpoch).map(record=>[activityKey(record),record]));
    for(const record of value.pageHistory)if(!records.has(activityKey(record)))records.set(activityKey(record),record);
    value.pageHistory=[...records.values()];
    return [...records.values()];
  }});
}
