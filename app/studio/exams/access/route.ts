import { authorizeStudio } from '../../../../src/server/contentStudioHttp';
import { sameOriginMutation } from '../../../../src/server/authHttp';
import { MockExamAccessRepository } from '../../../../src/server/mockExamAccessRepository';
import { resolveHskMockExamDefinition } from '../../../../src/server/hskMockExamEditorialRepository';
import { readBoundedRequestText } from '../../../../src/server/boundedRequestBody';
import { requestCorrelationId } from '../../../../src/server/auditRepository';
export async function POST(request: Request) {
  const redirect = (key:string,value:string) => {const url=new URL('/studio/exams',request.url);url.searchParams.set(key,value);return Response.redirect(url,303);};
  if (!sameOriginMutation(request)) return redirect('error','Yêu cầu khác nguồn đã bị chặn.');
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) return redirect('error','Biểu mẫu không hợp lệ.');
  const authorized = await authorizeStudio('content:publish',{stepUp:true});
  if (!authorized.ok) return authorized.response;
  try {
    const body = await readBoundedRequestText(request,2000);
    if (!body.ok) return redirect('error','Biểu mẫu vượt giới hạn.');
    const form = new URLSearchParams(body.text);
    const level = form.get('examLevel'); const key = form.get('formKey');
    if (!await resolveHskMockExamDefinition(authorized.context.database,level,key)) return redirect('error','Cửa này chưa có đề phát hành.');
    await new MockExamAccessRepository(authorized.context.database).setTier(level,key,form.get('tier'),authorized.context.account.userId,authorized.context.sessionId,requestCorrelationId(request));
    return redirect('notice',`Đã lưu quyền cửa ${String(key).toUpperCase()} · ${String(level).toUpperCase()}.`);
  } catch {return redirect('error','Chưa lưu được quyền đề. Hãy thử lại.');}
}
