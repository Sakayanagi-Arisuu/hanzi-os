import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';
import {authoredBatches} from './authored-batch-registry.mjs';

const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk4-personal-community-v2.json','utf8'));
const expected=authoredBatches.hsk4Personal.lessonIds;
if(draft.humanReviewed!==false||JSON.stringify(draft.items.map((item:{lessonId:string})=>item.lessonId))!==JSON.stringify(expected))throw Error('Review scope changed');
const items=[];
for(const item of draft.items){
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const validation=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview}});
 if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
 items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync('content/review/thien-lo-hsk4-personal-community-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-28',scope:'Six HSK4 personal/community long-form reading lessons. Two source texts per lesson, source-bound maps, ten progressively focused comprehension questions and one bounded synthesis task. AI-assisted self-review for local study; transcript/TTS is not native listening evidence, model reveal does not grant writing mastery.',evidenceDocument:'docs/thien-lo-redesign-review/45-REVIEW-HSK4-PERSONAL.md',items},null,2)+'\n');
console.log({reviewed:items.length,humanReviewed:false});
