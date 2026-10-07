import { authorizeStudio, studioError, studioMutationError } from '../../../../../src/server/contentStudioHttp';
import { getD1Database } from '../../../../../src/server/d1';
import { sameOriginMutation } from '../../../../../src/server/authHttp';
import { LessonMediaRepository } from '../../../../../src/server/lessonMediaRepository';
import { lessonMediaUrl } from '../../../../../src/content/lessonMedia';
import { requirePremiumLevel, sandboxCommerceEnabled } from '../../../../../src/server/premiumAccess';
import { LessonAccessRepository } from '../../../../../src/server/lessonAccessRepository';
export const dynamic='force-dynamic';
const fileId=(file:string)=>/^([0-9a-f-]{36})\.(png|jpg|webp|mp3|wav|ogg)$/.exec(file)?.[1];
type Context={params:Promise<{file:string}>};
export async function GET(request:Request,context:Context) {
  try {
    const {file}=await context.params;const id=fileId(file);if(!id)return new Response(null,{status:404});
    const database=await getD1Database();const repo=new LessonMediaRepository(database);const asset=await repo.get(id);
    if(!asset||lessonMediaUrl(id,asset.mimeType)!==`/api/content/media/${file}`)return new Response(null,{status:404});
    const access=await repo.releaseAccess(lessonMediaUrl(id,asset.mimeType));
    if(access==='premium'){
      const lessonIds=await repo.releasedHsk4LessonIds(lessonMediaUrl(id,asset.mimeType));
      const freeIds=await new LessonAccessRepository(database).freeHsk4LessonIds();
      if(!sandboxCommerceEnabled(request.url)||!lessonIds.length||lessonIds.some(lessonId=>!freeIds.includes(lessonId))){
        const gate=await requirePremiumLevel(request,'hsk4');if(gate)return gate;
      }
    }
    if(access==='unreleased'||access==='unknown'){const auth=await authorizeStudio('content:workspace:read');if(!auth.ok)return auth.response;}
    const bytes=await repo.bytes(id);
    if(bytes.byteLength!==asset.byteLength)throw new Error('Học liệu chưa đọc được đầy đủ.');
    const headers:Record<string,string>={'Content-Type':asset.mimeType,'X-Content-Type-Options':'nosniff','Cache-Control':access==='free'?'public, max-age=31536000, immutable':'private, no-store','Accept-Ranges':'bytes'};
    const range=request.headers.get('range');
    if(range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(range);
      if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
      const start=match[1]?Number(match[1]):Math.max(0,bytes.length-Number(match[2]));
      const end=match[1]&&match[2]?Math.min(Number(match[2]),bytes.length-1):bytes.length-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=bytes.length)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${bytes.length}`}});
      return new Response(bytes.slice(start,end+1),{status:206,headers:{...headers,'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':String(end-start+1)}});
    }
    return new Response(bytes,{headers:{...headers,'Content-Length':String(bytes.length)}});
  }catch(error){return studioMutationError(error);}
}
export async function DELETE(request:Request,context:Context) {
  if(!sameOriginMutation(request))return studioError(403,'CROSS_ORIGIN','Yêu cầu khác nguồn đã bị chặn.');
  try {
    const auth=await authorizeStudio('content:drafts:write');if(!auth.ok)return auth.response;
    const id=fileId((await context.params).file);if(!id)return new Response(null,{status:404});
    await new LessonMediaRepository(auth.context.database).deleteUnused(id,auth.context.account.userId);
    return new Response(null,{status:204});
  }catch(error){return studioMutationError(error);}
}
