import {parseLessonReadingSession} from './lessonReadingSession';
import {evaluateLessonActivity} from './lessonActivities';
import {accessDay,type AnalyticsActivity} from './analyticsActivity';

/** Descriptive, device-only practice. First responses are evaluated against
 * their pinned document; neither hints nor correctness become skill evidence.
 */
export function withLocalPagePractice(base:AnalyticsActivity,snapshots:readonly unknown[]):AnalyticsActivity{
 const pagePractice={attempts:0,unique:0,correct:0,incorrect:0,selfReview:0};
 const seen=new Set<string>(),items=new Set<string>();
 const days=new Map(base.days.map(row=>[row.day,row.count]));
 for(const value of snapshots){
  if(!value||typeof value!=='object')continue;
  const lessonId=(value as {lessonId?:unknown}).lessonId;
  if(typeof lessonId!=='string')continue;
  const session=parseLessonReadingSession(value,lessonId);
  if(!session)continue;
  for(const page of session.document.pages)for(const block of page.blocks){
   const first=session.drafts[block.id]?.firstAttempt;
   if(block.kind!=='activity'||!block.activity||!first)continue;
   const key=JSON.stringify([lessonId,page.id,block.id,first.occurredAt,first.text,first.answerIds]);
   if(seen.has(key))continue;
   seen.add(key);items.add(JSON.stringify([lessonId,page.id,block.id]));
   const outcome=evaluateLessonActivity(block.activity,{text:first.text,answerIds:first.answerIds});
   pagePractice.attempts++;
   if(outcome==='correct')pagePractice.correct++;
   else if(outcome==='incorrect')pagePractice.incorrect++;
   else pagePractice.selfReview++;
   const day=accessDay(Date.parse(first.occurredAt));days.set(day,(days.get(day)??0)+1);
  }
 }
 pagePractice.unique=items.size;
 return {...base,pagePractice,days:[...days].map(([day,count])=>({day,count})).sort((a,b)=>a.day.localeCompare(b.day))};
}
