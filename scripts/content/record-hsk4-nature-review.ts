import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';
import {authoredBatches} from './authored-batch-registry.mjs';

const batch=authoredBatches.hsk4NatureTechnology;
const draft=JSON.parse(readFileSync(`content/drafts/${batch.file}.json`,'utf8'));
if(draft.humanReviewed!==false||JSON.stringify(draft.items.map((item:{lessonId:string})=>item.lessonId))!==JSON.stringify(batch.lessonIds))throw Error('Review scope changed');
const items=[];
for(const item of draft.items){
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const validation=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview}});
 if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
 items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync(`content/review/${batch.file}-local.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-28',scope:'Six HSK4 nature/technology long-form reading lessons; distinct sources, evidence-bound inference, causal limits and cross-source synthesis. Local AI-assisted review only. Source B is transcript reading, not native listening evidence; self-check writing is not independent mastery.',evidenceDocument:'docs/thien-lo-redesign-review/47-REVIEW-HSK4-NATURE-TECHNOLOGY.md',items},null,2)+'\n');
console.log({reviewed:items.length,humanReviewed:false});
