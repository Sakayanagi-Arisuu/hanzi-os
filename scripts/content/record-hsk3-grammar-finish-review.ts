import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';
const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-grammar-finish-v2.json','utf8'));
if(draft.items.length!==9)throw Error('Review inventory changed');
const items=[];
for(const item of draft.items){
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const validation=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview}});
 if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
 items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync('content/review/thien-lo-hsk3-grammar-finish-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-28',scope:'Nine HSK3 event/complement, comparison and discourse manuscripts. Corrected narration, examples, exact grammar retrieval, evidence diagrams and transfer writing; AI-assisted self-review for local learning only.',evidenceDocument:'docs/thien-lo-redesign-review/43-REVIEW-HSK3-GRAMMAR-FINISH.md',items},null,2)+'\n');
console.log({reviewed:items.length,humanReviewed:false});
