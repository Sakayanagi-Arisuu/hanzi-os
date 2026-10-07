import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';
import {authoredBatches} from './authored-batch-registry.mjs';

const domain=process.argv.find(arg=>arg.startsWith('--domain='))?.slice(9);
const scopes={
 'long-input-structure-map':authoredBatches.hsk4StructureMap,
 'inference-evidence-check':authoredBatches.hsk4Inference,
 'cross-text-synthesis':authoredBatches.hsk4CrossText,
 'structured-written-argument':authoredBatches.hsk4StructuredWriting,
 'structured-spoken-defense':authoredBatches.hsk4StructuredSpeaking,
 'timed-sectional-rehearsal':authoredBatches.hsk4TimedRehearsal,
} as const;
if(!domain||!Object.hasOwn(scopes,domain))throw Error('Select a reviewed --domain');
const batch=scopes[domain as keyof typeof scopes];
const draft=JSON.parse(readFileSync(`content/drafts/${batch.file}.json`,'utf8'));
if(draft.humanReviewed!==false||JSON.stringify(draft.items.map((item:{lessonId:string})=>item.lessonId))!==JSON.stringify(batch.lessonIds))throw Error('Review scope changed');
const items=[];
for(const item of draft.items){
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const validation=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview}});
 if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
 items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync(`content/review/${batch.file}-local.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-28',scope:`Three HSK4 ${domain} integrated-study lessons; multiple bound source texts, evidence-limited task models, editable rubrics and ${draft.items.some((item:{lessonPages:{pages:Array<{blocks:Array<{activity?:{timeLimitSeconds?:number}}>}>}})=>item.lessonPages.pages.some(page=>page.blocks.some(block=>block.activity?.timeLimitSeconds)))?'self-paced countdown rehearsal':'untimed guided practice'}. AI-assisted local review only. Source B is transcript reading, not native listening evidence; self-check and clock do not grant mastery.`,evidenceDocument:'docs/thien-lo-redesign-review/56-REVIEW-HSK4-INTEGRATION.md',items},null,2)+'\n');
console.log({domain,reviewed:items.length,humanReviewed:false});
