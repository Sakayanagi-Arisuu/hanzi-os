import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';
import {productionManuscripts} from './hsk3-production-manuscripts';

const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-production-v2.json','utf8')) as {items:Array<{lessonId:string;studioContent:Record<string,unknown>}>};
const expected=productionManuscripts.map(m=>`hsk3-${m.group}-lesson-0${m.n}`);
if(JSON.stringify(draft.items.map(item=>item.lessonId))!==JSON.stringify(expected))throw Error('Review inventory changed');
const items=[];
for(const item of draft.items){
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const validation=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview}});
 if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
 items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync('content/review/thien-lo-hsk3-production-v2-local.json',JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-28',scope:'Fourteen HSK3 production manuscripts. Source-linked notes, cohesion, retelling, guided writing and bounded explanation. AI-assisted self-review for local study; written self-assessment does not grant speaking or writing mastery.',evidenceDocument:'docs/thien-lo-redesign-review/44-REVIEW-HSK3-PRODUCTION.md',items},null,2)+'\n');
console.log({reviewed:items.length,humanReviewed:false});
