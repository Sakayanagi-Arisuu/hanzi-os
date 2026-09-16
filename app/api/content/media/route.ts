import { authorizeStudio, studioError, studioMutationError } from '../../../../src/server/contentStudioHttp';
import { sameOriginMutation } from '../../../../src/server/authHttp';
import { readBoundedRequestText } from '../../../../src/server/boundedRequestBody';
import { LessonMediaRepository } from '../../../../src/server/lessonMediaRepository';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  try {
    const auth=await authorizeStudio('content:workspace:read');if(!auth.ok)return auth.response;
    const params=new URL(request.url).searchParams;
    return Response.json(await new LessonMediaRepository(auth.context.database).listPage({kind:params.get('kind')??undefined,query:params.get('q')??undefined,cursor:params.get('cursor')??undefined}),{headers:{'Cache-Control':'no-store'}});
  } catch(error) {return studioMutationError(error);}
}
export async function POST(request:Request) {
  if(!sameOriginMutation(request))return studioError(403,'CROSS_ORIGIN','Yêu cầu khác nguồn đã bị chặn.');
  try {
    const auth=await authorizeStudio('content:drafts:write');if(!auth.ok)return auth.response;
    const body=await readBoundedRequestText(request,11_300_000);
    if(!body.ok)return studioError(413,'MEDIA_TOO_LARGE','Tệp vượt giới hạn 8 MB.');
    const input=JSON.parse(body.text);
    if(!input||typeof input.mimeType!=='string')throw new TypeError('Thiếu định dạng học liệu.');
    const asset=await new LessonMediaRepository(auth.context.database).upload({...input,actorUserId:auth.context.account.userId});
    return Response.json({asset},{status:201,headers:{'Cache-Control':'no-store'}});
  } catch(error) {return studioMutationError(error);}
}
