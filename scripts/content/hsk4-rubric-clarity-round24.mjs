import {readFileSync} from 'node:fs';
const rows=JSON.parse(readFileSync(new URL('./hsk4-rubric-counterarguments-round24.json',import.meta.url),'utf8'));
export function correctRubric24(source){
 const row=rows.find(r=>r.lessonId===source.targetLessonId);
 const content=structuredClone(source),changes=[];
 if(!row)return {content,changes};
 const page=content.lessonPages.pages.find(p=>p.id===`${row.lessonId}:v2:argument`);
 const rubric=page?.blocks.find(b=>b.id===`${row.lessonId}:argument`)?.activity?.rubric;
 const criterion=rubric?.find(r=>r.label===row.counterargument&&r.guidance===row.counterargument);
 if(!criterion)throw Error(`Changed rubric; preserve editor work: ${row.lessonId}`);
 const before=structuredClone(criterion);
 const claim=row.counterargument.replaceAll('khẩu径','cách xác định phạm vi đo');
 criterion.label='Trình bày và phản hồi một ý kiến đối lập';
 criterion.guidance=`Ý kiến để cân nhắc: “${claim}” Nêu điểm hợp lý, rồi trả lời bằng dữ kiện và giới hạn của hai nguồn. Bạn có thể đồng ý một phần hoặc phản bác có căn cứ; không cần chép hoặc tán thành toàn bộ ý kiến này.`;
 changes.push({pageId:page.id,criterionId:criterion.id,before,after:structuredClone(criterion)});
 return {content,changes};
}
