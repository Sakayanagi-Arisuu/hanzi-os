import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent';
// Record the explicit, bounded editorial review in document 17.
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-character-batch-v2.json','utf8'));
const expected=Array.from({length:15},(_,i)=>`characters-${i+1}`);
if(JSON.stringify(draft.items.map((item:{lessonId:string})=>item.lessonId))!==JSON.stringify(expected))throw new Error('Review inventory changed');
const items=[];
for(const item of draft.items)items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}});
writeFileSync('content/review/thien-lo-character-batch-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-14',scope:'15 character lessons for local recognition and supported recall; not independent writing or mastery evidence.',evidenceDocument:'docs/thien-lo-redesign-review/17-REVIEW-CHARACTER-BATCH.md',items},null,2)+'\n');
