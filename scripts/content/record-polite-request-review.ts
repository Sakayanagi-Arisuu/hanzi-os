import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent';
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk2-polite-request-v2.json','utf8'));
if(draft.lessonId!=='hsk2-daily-needs-family-lesson-01'||draft.humanReviewed!==false||draft.lessonPages.pages.length!==11)throw new Error('Review scope changed');
writeFileSync('content/review/thien-lo-hsk2-polite-request-v2-local.json',JSON.stringify({schemaVersion:1,lessonId:draft.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(draft.studioContent)),humanReviewed:false,reviewedAt:'2026-09-15',scope:'HSK2 polite request, clarification and linked exchange; supported written practice and self-review.',evidenceDocument:'docs/thien-lo-redesign-review/21-REVIEW-HSK2-POLITE-REQUEST.md',aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}},null,2)+'\n');
