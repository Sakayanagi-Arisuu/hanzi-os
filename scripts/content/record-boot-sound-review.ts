import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent';
// Explicit review of the two manuscripts in document 18, for local study only.
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-boot-sound-batch-v2.json','utf8'));
if(JSON.stringify(draft.items.map((i:{lessonId:string})=>i.lessonId))!==JSON.stringify(['boot-3','boot-4']))throw new Error('Review scope changed');
const items=[];
for(const item of draft.items)items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}});
writeFileSync('content/review/thien-lo-boot-sound-batch-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-14',scope:'Two foundation sound lessons: supported rule understanding and self-observation, not pronunciation evidence.',evidenceDocument:'docs/thien-lo-redesign-review/18-REVIEW-BOOT-SOUND.md',items},null,2)+'\n');
