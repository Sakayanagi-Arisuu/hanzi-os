/** Exact editorial target links for the remaining HSK3 cohesion lesson. */
import {readFileSync,writeFileSync} from 'node:fs';
import {lessonActivitySources} from '../../src/learning/lessonActivitySources.ts';
import {applyMissingEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';
const item=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-timeline-v2.json','utf8'));
const lessonId='hsk3-cohesion-reconstruction-lesson-01';
if(item.lessonId!==lessonId)throw Error('Wrong HSK3 timeline manuscript');
const sources=lessonActivitySources(lessonId);
const grammar=sources.find(s=>s.kind==='grammar'&&s.id===`hsk3-pattern:${lessonId}`);
const task=sources.find(s=>s.kind==='task'&&s.id===`${lessonId}:prompt-01`);
if(!grammar||!task)throw Error('Missing HSK3 cohesion source');
const decisions=[
 ['order','reading','Sắp xếp thói quen cũ, nguyên nhân thay đổi, quá trình học có người giúp và kết quả; có thể trở lại văn bản nên đây là đọc nối ý có hỗ trợ.',grammar],
 ['claim','reading','Chọn nhận định ông có thêm một cách xem tin và vẫn đọc báo; không suy một người thành mọi người cao tuổi.',task],
 ['write','writing','Viết ba câu tóm tắt thói quen, lý do/cách thay đổi và kết quả theo văn bản; dùng từ hỗ trợ và rubric tự đối chiếu, chưa chấm viết độc lập.',task],
 ['new-order-activity','reading','Sắp xếp đăng ký, chuẩn bị, ngày trồng cây và gửi ảnh theo mốc 上周, 活动前一天, 第二天, 活动结束后.',grammar],
 ['new-explain','reading','Giải thích bằng bằng chứng thời gian vì sao 第二天 nằm giữa chuẩn bị và gửi ảnh; được dùng tiếng Việt, nên không coi là điểm viết tiếng Trung.',task],
];
const targets={};
for(const [suffix,skill,objective,source] of decisions){
 const id=`${lessonId}:v2:${suffix}`;
 const block=item.lessonPages.pages.flatMap(page=>page.blocks).find(b=>b.id===id);
 if(!block?.activity||block.activity.learningTarget)throw Error(`Unexpected target state: ${id}`);
 if(['write','new-explain'].includes(suffix)!==(block.activity.type==='rubric'))throw Error(`Wrong activity form: ${id}`);
 targets[id]={skill,objective,sources:[{kind:source.kind,id:source.id}]};
}
applyMissingEditorialActivityTargets(lessonId,item.lessonPages,targets);
const plan={version:1,humanReviewed:false,partial:true,lessonIds:[lessonId],targets:{[lessonId]:targets}};
const output='content/drafts/thien-lo-hsk3-cohesion-targets.json';
const serialized=JSON.stringify(plan,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(output,'utf8')!==serialized)throw Error('HSK3 cohesion plan drift');}
else writeFileSync(output,serialized);
console.log({mode:process.argv.includes('--check')?'check':'write',lessons:1,targets:decisions.length});
