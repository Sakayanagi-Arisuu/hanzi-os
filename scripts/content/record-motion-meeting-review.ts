import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent';
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk2-motion-meeting-v2.json','utf8'));
if(JSON.stringify(draft.items.map((i:{lessonId:string})=>i.lessonId))!==JSON.stringify(['hsk2-travel-leisure-lesson-02','hsk2-travel-leisure-lesson-05']))throw new Error('Review scope changed');
const items=[];
for(const item of draft.items)items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}});
writeFileSync('content/review/thien-lo-hsk2-motion-meeting-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-16',scope:'HSK2 explicit directional reference points and negotiated meeting details; supported practice and self-review.',evidenceDocument:'docs/thien-lo-redesign-review/25-REVIEW-HSK2-MOTION-MEETING.md',items},null,2)+'\n');
