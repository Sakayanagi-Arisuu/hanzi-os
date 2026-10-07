import {ContentStudioRepository} from '../../../../src/server/contentStudioRepository';
import {getD1Database} from '../../../../src/server/d1';
import {publishedLessonPageActivities} from '../../../../src/server/publishedLessonPageActivities';
import {noStoreJsonHeaders} from '../../../../src/sync/protocol';
import {LESSON_BY_ID} from '../../../../src/data/curriculum';
import {lessonPageDocumentHash} from '../../../../src/learning/lessonPageBinding';
import {isLessonPageDocument} from '../../../../src/learning/lessonPages';
import {requirePremiumLesson} from '../../../../src/server/premiumAccess';
export const dynamic='force-dynamic';
/** Public released-content identity only; no learner record or answer key. */
export async function GET(request:Request){
 const lessonId=new URL(request.url).searchParams.get('lessonId');
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:noStoreJsonHeaders});
 if(!lessonId||!LESSON_BY_ID.has(lessonId))return json({error:{code:'LESSON_REQUIRED',message:'Chọn một bài học hợp lệ.'}},422);
 const gate=await requirePremiumLesson(request,lessonId);
 if(gate)return gate;
 try{
  const manifest=await new ContentStudioRepository(await getD1Database()).publishedRuntime({itemType:'lesson',learnerSafe:true});
  // Scope the registry to the requested lesson, retaining duplicate targets so
  // they fail closed instead of silently selecting a revision.
  const scoped={...manifest,items:manifest.items.filter(item=>item.content.targetLessonId===lessonId)};
  const registry=await publishedLessonPageActivities(scoped);
  const document=scoped.items[0]?.content.lessonPages;
  const documentHash=isLessonPageDocument(document)?await lessonPageDocumentHash(document):null;
  return json({version:1,lessonId,documentHash,activities:[...registry.values()].map(item=>({activityId:item.activityId,activityVersion:item.activityVersion,pageId:item.pageId,blockId:item.blockId,revisionId:item.revisionId}))});
 }catch{
  return json({error:{code:'PAGE_ACTIVITIES_UNAVAILABLE',message:'Chưa tải được phiên bản hoạt động. Hãy thử lại.'}},503);
 }
}
