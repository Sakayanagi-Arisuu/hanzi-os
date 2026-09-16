/** Read the actual local release heads, not merely the manuscript files. */
import {writeFileSync} from 'node:fs';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {publishedLessonPageActivities} from '../../src/server/publishedLessonPageActivities.ts';
import {lessonActivitySources} from '../../src/learning/lessonActivitySources.ts';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const registry=await publishedLessonPageActivities(runtime);
 const lessons=runtime.items.filter(item=>item.content.lessonPages).map(item=>{
  const lessonId=item.content.targetLessonId;
  const activities=[...registry.values()].filter(a=>a.lessonId===lessonId);
  const document=item.content.lessonPages;
  return {lessonId,revisionId:item.revisionId,title:item.title,pages:document.pages.length,sources:lessonActivitySources(lessonId),activities:activities.map(a=>{
   const page=document.pages.find(p=>p.id===a.pageId);
   const block=page.blocks.find(b=>b.id===a.blockId);
   return {pageId:a.pageId,blockId:a.blockId,pageTitle:page.title,title:block.title,prompt:block.body,type:a.activity.type,learningTarget:a.activity.learningTarget??null,needsEditorialTarget:!a.activity.learningTarget};
  })};
 });
 const activities=lessons.flatMap(l=>l.activities);
 const summary={publishedPageLessons:lessons.length,activities:activities.length,withTarget:activities.filter(a=>a.learningTarget).length,missingTarget:activities.filter(a=>a.needsEditorialTarget).length};
 const report={version:1,generatedAt:new Date().toISOString(),scope:'Actual D1 local published lesson-page activities. Counts are editorial-link status, not mastery or curriculum coverage.',summary,lessons};
 writeFileSync('docs/thien-lo-redesign-review/page-activity-target-audit.json',JSON.stringify(report,null,2)+'\n');
 const rows=lessons.map(l=>`| ${l.lessonId} | ${l.activities.length} | ${l.activities.filter(a=>a.learningTarget).length} | ${l.activities.filter(a=>a.needsEditorialTarget).length} |`);
 writeFileSync('docs/thien-lo-redesign-review/19-AUDIT-MUC-TIEU-HOAT-DONG.md',`# Mục tiêu hoạt động trong các bài đã phát hành local\n\nNguồn: release heads đọc từ D1 local; chạy lại bằng \`npx tsx scripts/content/audit-page-activity-targets.mjs\`. Không sửa database.\n\n${summary.publishedPageLessons} bài có trang biên soạn, ${summary.activities} hoạt động; ${summary.withTarget} có mục tiêu và nguồn được validator xác minh, ${summary.missingTarget} còn thiếu. Đây không phải số bài hoàn tất hoặc độ phủ HSK.\n\n| Bài | Hoạt động | Có mục tiêu | Thiếu mục tiêu |\n|---|---:|---:|---:|\n${rows.join('\n')}\n\n## Cách xử lý\n\n- File JSON đi kèm giữ page/block IDs, câu yêu cầu, kiểu hoạt động, revision hiện hành và nguồn thực sự thuộc bài; không chứa đáp án người học.\n- Gán mục tiêu sau khi đọc câu hỏi, đáp án và hỗ trợ đi trước; không suy skill từ choice/cloze/rubric hoặc tiêu đề.\n- Ví dụ boot-1 nhận diện hướng thanh qua mô tả/Pinyin là kiến thức phát âm bằng thị giác, không phải bằng chứng nghe hoặc chất lượng phát âm.\n- Mục tiêu hợp lệ vẫn chưa đủ mastery: cần phiên, điều kiện hỗ trợ, item độc lập và kiểm lại theo thời gian. Rubric tự đối chiếu giữ self-review.\n- Chỉnh qua revision mới trong Xưởng, giữ ID, phiên bản đã pin và các kết quả cũ; không sửa ngầm đáp án của revision đã phát hành.\n- Trước nối Nghịch Cảnh Lục/ôn, phải giữ được đúng câu hỏi/đáp án/feedback của revision gốc và xác định nguồn bài phù hợp. Trường hợp chưa có target cần bổ sung biên tập; không gán bừa để tăng chỉ số.\n\nCác bài chưa có trang authored và các hoạt động reflection/reading ngoài activity vẫn thuộc phạm vi cải tiến; audit này không thay thế kiểm 217 bài nền.\n`);
 console.log(summary);
}finally{db.close();}
