import {getChatGPTUser} from '../../../chatgpt-auth';
import {deriveAccountKey} from '../../../../src/lib/accountKey';
import {getD1Database} from '../../../../src/server/d1';
import {learningOwnerMismatch} from '../../../../src/server/learningOwnerHttp';
import {ReviewHistoryRepository} from '../../../../src/server/reviewHistoryRepository';
import {LearningResetEpochConflictError} from '../../../../src/server/learningResetEpoch';
import {SyncRepository} from '../../../../src/server/syncRepository';
import {noStoreJsonHeaders} from '../../../../src/sync/protocol';
import type {LessonHistoryPageV1} from '../../../../src/learning/lessonHistory';

export const dynamic='force-dynamic';
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:noStoreJsonHeaders});
export async function GET(request:Request){
  try{
    const identity=await getChatGPTUser(),mismatch=await learningOwnerMismatch(request,identity);
    if(mismatch)return mismatch;
    if(!identity)return json({error:{code:'AUTH_REQUIRED'}},401);
    const query=new URL(request.url).searchParams,epoch=query.get('resetEpoch'),limit=query.get('limit')??'50',cursorText=query.get('cursor');
    if(epoch===null||!/^\d+$/.test(epoch)||!/^\d+$/.test(limit))throw new TypeError('Invalid history query');
    let cursor:LessonHistoryPageV1['nextCursor']=null;
    if(cursorText){
      if(cursorText.length>400)throw new TypeError('Invalid history cursor');
      try{cursor=JSON.parse(cursorText);}catch{throw new TypeError('Invalid history cursor');}
      if(!cursor||typeof cursor!=='object'||Array.isArray(cursor))throw new TypeError('Invalid history cursor');
    }
    const database=await getD1Database(),userId=await new SyncRepository(database).resolveUser(identity);
    return json(await new ReviewHistoryRepository(database).readPage(userId,await deriveAccountKey(identity.userId||identity.email),Number(epoch),{limit:Number(limit),cursor}));
  }catch(error){
    if(error instanceof TypeError)return json({error:{code:'INVALID_HISTORY_QUERY'}},400);
    if(error instanceof LearningResetEpochConflictError)return json({error:{code:error.code,retryable:true}},409);
    return json({error:{code:'HISTORY_UNAVAILABLE',retryable:true}},503);
  }
}
