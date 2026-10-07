import {readFileSync} from 'node:fs';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages.ts';
const audit=JSON.parse(readFileSync(new URL('../../content/drafts/hsk4-source-map-audit-v1.json',import.meta.url),'utf8'));
export const precisionMapIds=Array.from({length:6},(_,i)=>`hsk4-precision-reference-quantity-lesson-0${i+1}`);
export const summaryMapIds=[['stance-comparison-rhetoric',5],['event-agency-voice',4],['information-order-cohesion',5],['argument-logic-concession',4]].flatMap(([group,count])=>Array.from({length:count},(_,i)=>`hsk4-${group}-lesson-0${i+1}`));
export const applyPrecisionSourceMaps=source=>applySourceMaps(source,precisionMapIds);
export const applySummarySourceMaps=source=>applySourceMaps(source,summaryMapIds);
export const integrationMapIds=['long-input-structure-map','inference-evidence-check','cross-text-synthesis','structured-written-argument','structured-spoken-defense','timed-sectional-rehearsal'].flatMap(group=>Array.from({length:3},(_,i)=>`hsk4-${group}-lesson-0${i+1}`));
export const applyIntegrationSourceMaps=source=>applySourceMaps(source,integrationMapIds,true);
function applySourceMaps(source,scope,integration=false){
 if(!scope.includes(source.targetLessonId))throw Error('Unreviewed map scope');
 const entry=audit.decisions.find(d=>d.lessonId===source.targetLessonId);
 const expectedCount=integration&&!source.targetLessonId.includes('structured-')?4:2;
 if(entry?.sources.length!==expectedCount)throw Error('Reviewed source pair changed');
 const content=structuredClone(source);
 if(content.lessonPages.pages.some(p=>p.id.includes(':source-map-review:')))throw Error('Preserve existing review maps');
 for(const [index,sourceMap] of entry.sources.entries()){
  const reading=content.lessonPages.pages.find(p=>p.id===sourceMap.pageId)?.blocks.find(b=>b.kind==='reading');
  if(!reading||reading.title!==sourceMap.title||!sourceMap.matchingMap?.diagram)throw Error('Missing reviewed source');
  if(reading.reading.paragraphs.map(p=>p.hanzi).join('\n')!==sourceMap.sourceHanzi)throw Error('Source text changed; re-audit map');
  const id=`${source.targetLessonId}:v2:source-map-review:${index}`;
  content.lessonPages.pages.push({id,title:`Đối chiếu sau ${integration?'tự luyện':'tự viết'} · Nguồn ${String.fromCharCode(65+index)}`,layout:'focus',stage:'transfer',blocks:[{
   ...emptyLessonBlock(`${id}:diagram`),kind:'diagram',title:sourceMap.title,
   body:integration?'Hoàn thành lượt đọc, viết hoặc trình bày của bạn trước khi xem sơ đồ. Với bài có giờ, giữ bản làm ban đầu rồi đối chiếu từng ý với đoạn nguồn; sơ đồ không chấm năng lực hay phát âm.':'Hoàn thành bản viết của bạn trước khi xem sơ đồ. So lại từng ý với đoạn nguồn; sơ đồ hỗ trợ tự sửa, không phải đáp án duy nhất hay kết quả chấm năng lực.',
   provenance:`HANZI.OS original source map; ${sourceMap.matchingMap.lessonId}; revision ${sourceMap.matchingMap.revisionId}; humanReviewed:false`,
   diagram:{...structuredClone(sourceMap.matchingMap.diagram),description:integration?'Đối chiếu quan hệ, mốc và giới hạn của từng nguồn sau lượt tự luyện.':'Đối chiếu các quan hệ trong nguồn sau khi tự viết; kiểm tra phạm vi và giới hạn của từng nhận định.'},
  }]});
 }
 const errors=validateLessonPages(content.lessonPages);if(errors.length)throw Error(errors.join('; '));
 return content;
}
