import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent';
// Records the explicit review in document 13; does not inspect/review arbitrary input.
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-survival-batch-v2.json','utf8'));
const items=[];
for(const item of draft.items)items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}});
writeFileSync('content/review/thien-lo-survival-batch-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-13',scope:'Nine personal communication lessons for local study; page activities remain self-feedback, not mastery evidence.',evidenceDocument:'docs/thien-lo-redesign-review/13-REVIEW-SURVIVAL-BATCH.md',items},null,2)+'\n');
