import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';

const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-society-v2.json','utf8'));
if(draft.items.length!==5||draft.items.some((item:{editorialStatus:string})=>item.editorialStatus!=='draft-needs-language-and-source-review'))throw Error('Review inventory changed');
const items=[];
for(const item of draft.items){
  const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
  const proposed={...item.studioContent,review:{humanReviewed:false,aiSelfReview}};
  const validation=await validateStudioContent('lesson',proposed);
  if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
  items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync('content/review/thien-lo-hsk3-society-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-27',scope:'Five original HSK3 society, arts and sports narratives with source-linked reading practice, editable factual diagrams and guided writing. Self-review is local editorial review, not native/human sign-off or mastery evidence.',evidenceDocument:'docs/thien-lo-redesign-review/39-REVIEW-HSK3-SOCIETY.md',items},null,2)+'\n');
console.log({reviewed:items.length,humanReviewed:false});
