/** Reviewable links for spoken self-practice; these do not score speech. */
import {readFileSync,writeFileSync} from 'node:fs';
import {authoredBatches} from './authored-batch-registry.mjs';
import {lessonActivitySources} from '../../src/learning/lessonActivitySources.ts';
import {applyMissingEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';

const groups=[['hsk4Precision',6],['hsk4Stance',5],['hsk4EventAgency',4],['hsk4InformationOrder',5],['hsk4ArgumentLogic',4],['hsk4StructuredSpeaking',8],['hsk4TimedRehearsal',3]];
const items=groups.flatMap(([group])=>JSON.parse(readFileSync(`content/drafts/${authoredBatches[group].file}.json`,'utf8')).items);
const targets={};
let total=0;
for(const item of items){
 const task=lessonActivitySources(item.lessonId).find(source=>source.kind==='task'&&source.id===`hsk4-local-task:${item.lessonId}`);
 if(!task)throw Error(`Missing local task source: ${item.lessonId}`);
 const gaps=item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.kind==='activity'&&block.activity&&!block.activity.learningTarget));
 if(!gaps.length)throw Error(`No target gap: ${item.lessonId}`);
 const mapping={};
 for(const block of gaps){
  if(block.activity.type!=='rubric'||!block.activity.rubric.length||!block.body||!block.activity.explanation)throw Error(`Unexpected gap form: ${block.id}`);
  const request=block.body.split('\n')[0].trim();
  if(!/Bảo vệ|Trình bày|nói|Nói|Phản hồi|Trả lời|Giới thiệu|Chuẩn bị|Thực hiện|Trong ba phút/u.test(request))throw Error(`Not an explicit presentation: ${block.id}`);
  mapping[block.id]={skill:'speaking',objective:`Tự tập trình bày hoặc ghi dàn ý theo yêu cầu: ${request} Rubric chỉ giúp đối chiếu căn cứ và phạm vi; màn này không thu âm hay chấm phát âm, độ trôi chảy hoặc năng lực nói độc lập.`,sources:[{kind:'task',id:task.id}]};
 }
 applyMissingEditorialActivityTargets(item.lessonId,item.lessonPages,mapping);
 targets[item.lessonId]=mapping;
 total+=gaps.length;
}
for(const [group,count] of groups){
 const ids=authoredBatches[group].lessonIds;
 const actual=ids.reduce((sum,id)=>sum+Object.keys(targets[id]??{}).length,0);
 if(actual!==count)throw Error(`Gap count changed: ${group}:${actual}/${count}`);
}
if(total!==35||items.length!==30)throw Error('HSK4 self-speaking inventory changed');
const plan={version:1,humanReviewed:false,partial:true,lessonIds:items.map(item=>item.lessonId),targets};
const output='content/drafts/thien-lo-hsk4-self-speaking-targets.json';
const serialized=JSON.stringify(plan,null,2)+'\n';
if(process.argv.includes('--check')){
 if(readFileSync(output,'utf8')!==serialized)throw Error('HSK4 speaking plan drift');
}else writeFileSync(output,serialized);
console.log({mode:process.argv.includes('--check')?'check':'write',lessons:items.length,targets:total,scoredSpeech:0});
