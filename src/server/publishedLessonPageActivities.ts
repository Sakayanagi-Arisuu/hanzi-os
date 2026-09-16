import {canonicalStudioJson,studioSha256} from '../content/studioContent';
import {publishedRuntimeHeader,publishedRuntimeItems} from '../content/publishedStudioRuntimeContract';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {evaluateLessonActivity,type LessonActivity} from '../learning/lessonActivities';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';

export type PublishedPageActivity={
 activityId:string;activityVersion:string;lessonId:string;pageId:string;blockId:string;
 revisionId:string;activity:LessonActivity;
};
/** Accept only manifests obtained from the server's publishedRuntime repository.
 * A manifest-shaped browser payload must never be passed to this boundary.
 * This registry provides answer identity, not skill assignment or mastery.
 */
export async function publishedLessonPageActivities(manifest:unknown):Promise<Map<string,PublishedPageActivity>> {
 const entries=publishedRuntimeItems(manifest);
 const registry=new Map<string,PublishedPageActivity>();
 const lessons=new Set<string>();
 for(const raw of entries){
  const header=publishedRuntimeHeader(raw,'lesson');
  if(!header||header.content.lessonPages===undefined)continue;
  const lessonId=header.content.targetLessonId;
  if(typeof lessonId!=='string'||!lessonId||validateLessonPages(header.content.lessonPages).length)throw new Error('Invalid published page lesson');
  if(lessons.has(lessonId))throw new Error('Ambiguous published page lesson');
  lessons.add(lessonId);
  const document=header.content.lessonPages as LessonPageDocument;
  if(validateLessonActivitySources(lessonId,document).length)throw new Error('Published activity target source unavailable');
  // Include the complete lesson: changing a preceding model or hint can change
  // exposure even if a particular answer remains byte-identical.
  const digest=await studioSha256(canonicalStudioJson(header.content));
  for(const page of document.pages)for(const block of page.blocks){
   if(block.kind!=='activity'||!block.activity)continue;
   const activityId=`lesson-page:${JSON.stringify([lessonId,page.id,block.id])}`;
   const bindingDigest=await studioSha256(canonicalStudioJson([header.item.revisionId,digest,page.id,block.id]));
   registry.set(activityId,{activityId,activityVersion:`lesson-page-v1:${bindingDigest}`,lessonId,pageId:page.id,blockId:block.id,revisionId:String(header.item.revisionId),activity:structuredClone(block.activity)});
  }
 }
 return registry;
}

/** Internal answer check. No persisted evidence, score, method, or skill claim. */
export function checkPublishedPageActivity(registry:ReadonlyMap<string,PublishedPageActivity>,input:{activityId:string;activityVersion:string;text:string;answerIds?:string[]}) {
 const entry=registry.get(input.activityId);
 if(!entry||entry.activityVersion!==input.activityVersion)throw new Error('Published activity version unavailable');
 if(typeof input.text!=='string'||input.text.length>12000||input.answerIds!==undefined&&(!Array.isArray(input.answerIds)||input.answerIds.length>30||input.answerIds.some(id=>typeof id!=='string')))throw new Error('Invalid page response');
 // Open responses remain self-review, even if text matches the example.
 return {outcome:evaluateLessonActivity(entry.activity,input),explanation:entry.activity.explanation,masteryEligible:false as const};
}
