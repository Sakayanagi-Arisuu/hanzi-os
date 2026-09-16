import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent';
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk2-food-shopping-v2.json','utf8'));
if(JSON.stringify(draft.items.map((i:{lessonId:string})=>i.lessonId))!==JSON.stringify(['hsk2-daily-needs-family-lesson-02','hsk2-daily-needs-family-lesson-03']))throw new Error('Review scope changed');
const items=[];
for(const item of draft.items)items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}});
writeFileSync('content/review/thien-lo-hsk2-food-shopping-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-15',scope:'Two HSK2 linked exchanges: food decisions and shopping constraints; supported practice and self-review.',evidenceDocument:'docs/thien-lo-redesign-review/22-REVIEW-HSK2-FOOD-SHOPPING.md',items},null,2)+'\n');
