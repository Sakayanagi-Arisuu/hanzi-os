import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent';
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk2-health-v2.json','utf8'));
if(draft.items.length!==1||draft.items[0].lessonId!=='hsk2-daily-needs-family-lesson-04')throw new Error('Review scope changed');
const item=draft.items[0];
writeFileSync('content/review/thien-lo-hsk2-health-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-15',scope:'HSK2 health exchange: symptoms, onset, uncertain cause and intended care; supported practice and self-review.',evidenceDocument:'docs/thien-lo-redesign-review/23-REVIEW-HSK2-HEALTH.md',items:[{lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}}]},null,2)+'\n');
