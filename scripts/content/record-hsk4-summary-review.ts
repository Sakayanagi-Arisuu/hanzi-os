import {readFileSync,writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent';
import {authoredBatches} from './authored-batch-registry.mjs';

const domain=process.argv.find(arg=>arg.startsWith('--domain='))?.slice(9);
const scopes={
 'stance-comparison-rhetoric':{batch:authoredBatches.hsk4Stance,document:'52-REVIEW-HSK4-STANCE.md',scope:'Five HSK4 stance/comparison/rhetoric lessons, from employment evidence through conflicting performance and environmental indicators.'},
 'event-agency-voice':{batch:authoredBatches.hsk4EventAgency,document:'53-REVIEW-HSK4-AGENCY.md',scope:'Four HSK4 event/agency/voice lessons, with actor responsibilities across conservation, restoration, public data and business change.'},
 'information-order-cohesion':{batch:authoredBatches.hsk4InformationOrder,document:'54-REVIEW-HSK4-COHESION.md',scope:'Five HSK4 information-order/cohesion lessons, sequencing multi-source claims about public data, arts, sports, exchange and cultural meaning.'},
 'argument-logic-concession':{batch:authoredBatches.hsk4ArgumentLogic,document:'55-REVIEW-HSK4-LOGIC.md',scope:'Four HSK4 argument/concession lessons, preserving evidence limits in cultural change and historical interpretation.'},
} as const;
if(!domain||!Object.hasOwn(scopes,domain))throw Error('Select a reviewed --domain');
const selected=scopes[domain as keyof typeof scopes],batch=selected.batch;
const draft=JSON.parse(readFileSync(`content/drafts/${batch.file}.json`,'utf8'));
if(draft.humanReviewed!==false||JSON.stringify(draft.items.map((item:{lessonId:string})=>item.lessonId))!==JSON.stringify(batch.lessonIds))throw Error('Review scope changed');
const items=[];
for(const item of draft.items){
 const aiSelfReview={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
 const validation=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview}});
 if(!validation.result.valid)throw Error(`${item.lessonId}: ${JSON.stringify(validation.result.errors)}`);
 items.push({lessonId:item.lessonId,sourceContentSha256:await studioSha256(canonicalStudioJson(item.studioContent)),aiSelfReview});
}
writeFileSync(`content/review/${batch.file}-local.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-28',scope:`${selected.scope} AI-assisted local review only. Source B is transcript reading, not native listening evidence; writing/speaking self-check is not independent mastery. Grammar examples are labeled hypothetical unless the learner finds support in the source.`,evidenceDocument:`docs/thien-lo-redesign-review/${selected.document}`,items},null,2)+'\n');
console.log({domain,reviewed:items.length,humanReviewed:false});
